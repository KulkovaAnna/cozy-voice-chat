import Peer, { type MediaConnection } from "peerjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";

import {
  buildAudioConstraints,
  DEFAULT_DEVICE_ID,
  diffPeerIds,
  isMicrophoneTrackUsable,
  microphoneRetryDelay,
  shouldInitiateConnection,
} from "@cvc/utils";
import { useSettingsStore } from "@cvc/utils/settingsStore";

export type CallKind = "audio" | "screen";

export interface PeerCall {
  kind: CallKind;
  connection: MediaConnection;
  remoteStream: MediaStream | null;
}

async function acquireAudioStream(): Promise<MediaStream> {
  const audio = useSettingsStore.getState().audio;

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: buildAudioConstraints(
        audio.inputDeviceId ?? DEFAULT_DEVICE_ID,
        audio,
      ),
    });
  } catch {
    return navigator.mediaDevices.getUserMedia({ audio: true });
  }
}

/** Ограничивает битрейт видео: в mesh каждый получатель — отдельный поток */
function configureScreenSender(
  call: MediaConnection,
  receiversCount: number,
): void {
  const pc = call.peerConnection;
  if (!pc) return;

  const sender = pc.getSenders().find((s) => s.track?.kind === "video");
  if (!sender) return;

  const params = sender.getParameters();
  if (!params.encodings) params.encodings = [{}];

  // Одному получателю отдаём максимум качества, в группе — экономим канал
  params.encodings[0].maxBitrate = receiversCount > 1 ? 2_500_000 : 10_000_000;
  params.encodings[0].priority = "high";
  params.encodings[0].networkPriority = "high";

  sender
    .setParameters(params)
    .catch((e) => console.warn("Failed to set encoding params", e));
}

export function usePeer() {
  const peer = useRef<Peer | undefined>(undefined);
  const myIdRef = useRef<string>("");

  /** Аудио-соединения с каждым участником mesh */
  const callsRef = useRef<Map<string, MediaConnection>>(new Map());
  /** Исходящие screen-соединения (я делюсь экраном) */
  const outgoingScreenCallsRef = useRef<Map<string, MediaConnection>>(
    new Map(),
  );
  /** Входящие screen-соединения (мне показывают экран) */
  const incomingScreenCallsRef = useRef<Map<string, MediaConnection>>(
    new Map(),
  );
  /** Пиры, к которым нужно подключиться после открытия PeerJS */
  const pendingPeersRef = useRef<Set<string>>(new Set());

  const localStreamRef = useRef<MediaStream | null>(null);
  const localStreamPromiseRef = useRef<Promise<MediaStream> | null>(null);
  const localTrackRef = useRef<MediaStreamTrack | null>(null);
  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const mutedRef = useRef(false);
  const switchingRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const retryAttemptRef = useRef(0);
  const isCallActiveRef = useRef(false);
  /** Растёт при завершении звонка: отбрасывает поздние getUserMedia */
  const callSessionRef = useRef(0);

  const [isCallActive, setIsCallActive] = useState(false);
  const [localAudioStream, setLocalAudioStream] = useState<MediaStream | null>(
    null,
  );
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    new Map(),
  );
  const [localScreenStream, setLocalScreenStream] =
    useState<MediaStream | null>(null);
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<
    Map<string, MediaStream>
  >(new Map());

  const onRemoteScreenStream = useRef<((s: MediaStream | null) => void) | null>(
    null,
  );
  const onLocalScreenStop = useRef<(() => void) | null>(null);

  const setOnRemoteScreenStream = (cb: (s: MediaStream | null) => void) => {
    onRemoteScreenStream.current = cb;
  };
  const setOnLocalScreenStop = (cb: () => void) => {
    onLocalScreenStop.current = cb;
  };

  /** Один микрофон на все соединения mesh */
  async function ensureLocalStream(): Promise<MediaStream> {
    if (localStreamRef.current) return localStreamRef.current;

    if (!localStreamPromiseRef.current) {
      const session = callSessionRef.current;

      localStreamPromiseRef.current = acquireAudioStream()
        .then((stream) => {
          if (session !== callSessionRef.current) {
            stream.getTracks().forEach((track) => track.stop());
            throw new Error("Call session ended");
          }

          const track = stream.getAudioTracks()[0] ?? null;
          if (track) track.enabled = !mutedRef.current;

          localStreamRef.current = stream;
          localTrackRef.current = track;
          isCallActiveRef.current = true;
          setLocalAudioStream(stream);
          setIsCallActive(true);

          return stream;
        })
        .finally(() => {
          localStreamPromiseRef.current = null;
        });
    }

    return localStreamPromiseRef.current;
  }

  const getAudioSenders = useCallback((): RTCRtpSender[] => {
    const senders: RTCRtpSender[] = [];

    callsRef.current.forEach((call) => {
      call.peerConnection?.getSenders().forEach((sender) => {
        if (sender.track?.kind === "audio") senders.push(sender);
      });
    });

    return senders;
  }, []);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current === null) return;

    window.clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
  }, []);

  const resetMicRetry = useCallback(() => {
    clearRetryTimer();
    retryAttemptRef.current = 0;
  }, [clearRetryTimer]);

  function dropRemoteAudio(peerId: string) {
    setRemoteStreams((prev) => {
      if (!prev.has(peerId)) return prev;
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
  }

  function dropRemoteScreen(peerId: string) {
    setRemoteScreenStreams((prev) => {
      if (!prev.has(peerId)) return prev;
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
  }

  function dropRemoteStream(peerId: string) {
    dropRemoteAudio(peerId);
    dropRemoteScreen(peerId);
  }

  /** Регистрирует входящее/исходящее аудио-соединение */
  function registerAudioCall(call: MediaConnection) {
    const peerId = call.peer;
    const session = callSessionRef.current;
    const existing = callsRef.current.get(peerId);
    if (existing && existing !== call) {
      existing.close();
    }

    callsRef.current.set(peerId, call);

    call.on("stream", (remoteStream) => {
      if (session !== callSessionRef.current) return;

      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.set(peerId, remoteStream);
        return next;
      });
      setIsCallActive(true);
    });

    const cleanup = () => {
      // Поздний close старого соединения не должен удалять новое
      if (callsRef.current.get(peerId) !== call) return;

      callsRef.current.delete(peerId);
      dropRemoteAudio(peerId);
    };

    call.on("close", cleanup);
    call.on("error", cleanup);
  }

  /** Регистрирует входящий screen-поток */
  function registerIncomingScreenCall(call: MediaConnection) {
    const peerId = call.peer;
    const session = callSessionRef.current;
    const existing = incomingScreenCallsRef.current.get(peerId);
    if (existing && existing !== call) {
      existing.close();
    }

    incomingScreenCallsRef.current.set(peerId, call);

    call.on("stream", (remoteStream) => {
      if (session !== callSessionRef.current) return;

      setRemoteScreenStreams((prev) => {
        const next = new Map(prev);
        next.set(peerId, remoteStream);
        return next;
      });
      onRemoteScreenStream.current?.(remoteStream);
    });

    const cleanup = () => {
      if (incomingScreenCallsRef.current.get(peerId) !== call) return;

      incomingScreenCallsRef.current.delete(peerId);
      setRemoteScreenStreams((prev) => {
        if (!prev.has(peerId)) return prev;
        const next = new Map(prev);
        next.delete(peerId);
        return next;
      });
      onRemoteScreenStream.current?.(null);
    };

    call.on("close", cleanup);
    call.on("error", cleanup);
  }

  function handleIncomingCall(call: MediaConnection) {
    const kind: CallKind = call.metadata?.kind ?? "audio";
    const session = callSessionRef.current;

    if (kind === "screen") {
      if (session !== callSessionRef.current) return;

      // Принимаем экран без своего стрима — мы только получатель
      call.answer(null as unknown as MediaStream);
      registerIncomingScreenCall(call);
      return;
    }

    void ensureLocalStream()
      .then((stream) => {
        if (session !== callSessionRef.current) return;

        call.answer(stream);
        registerAudioCall(call);
      })
      .catch((err) => {
        if (err instanceof Error && err.message === "Call session ended") {
          return;
        }
        console.error("Failed to get local stream", err);
        toast("Не удалось получить доступ к микрофону", { type: "error" });
      });
  }

  /** Инициирует аудио-соединение с конкретным участником */
  async function initiateCall(peerId: string) {
    if (!peerId || peerId === myIdRef.current) return;
    if (callsRef.current.has(peerId)) return;

    const currentPeer = peer.current;
    if (!currentPeer || !currentPeer.open) {
      pendingPeersRef.current.add(peerId);
      return;
    }

    try {
      const session = callSessionRef.current;
      const stream = await ensureLocalStream();

      if (session !== callSessionRef.current) return;
      if (callsRef.current.has(peerId)) return;

      if (!peer.current?.open) {
        pendingPeersRef.current.add(peerId);
        return;
      }

      const call = peer.current.call(peerId, stream, {
        metadata: { kind: "audio" },
      });
      if (!call) {
        pendingPeersRef.current.add(peerId);
        return;
      }

      registerAudioCall(call);
    } catch (err) {
      if (err instanceof Error && err.message === "Call session ended") {
        return;
      }
      console.error("Failed to call peer", err);
      toast("Не удалось получить доступ к микрофону", { type: "error" });
    }
  }

  /**
   * Приводит mesh-соединения к нужному набору участников.
   * Инициатора выбирает shouldInitiateConnection, чтобы не было дублей.
   */
  function connectToMembers(memberIds: string[]) {
    const desired = new Set(
      memberIds.filter((id) => id && id !== myIdRef.current),
    );
    const { removed } = diffPeerIds(callsRef.current.keys(), desired);

    disconnectMembers(removed);

    desired.forEach((peerId) => {
      if (shouldInitiateConnection(myIdRef.current, peerId)) {
        void initiateCall(peerId);
      }
    });
  }

  function disconnectMembers(memberIds: string[]) {
    memberIds.forEach((peerId) => {
      pendingPeersRef.current.delete(peerId);

      callsRef.current.get(peerId)?.close();
      callsRef.current.delete(peerId);

      outgoingScreenCallsRef.current.get(peerId)?.close();
      outgoingScreenCallsRef.current.delete(peerId);

      incomingScreenCallsRef.current.get(peerId)?.close();
      incomingScreenCallsRef.current.delete(peerId);

      dropRemoteStream(peerId);
    });
  }

  function disconnectAll() {
    callsRef.current.forEach((call) => call.close());
    callsRef.current.clear();

    outgoingScreenCallsRef.current.forEach((call) => call.close());
    outgoingScreenCallsRef.current.clear();

    incomingScreenCallsRef.current.forEach((call) => call.close());
    incomingScreenCallsRef.current.clear();

    pendingPeersRef.current.clear();
    setRemoteStreams(new Map());
    setRemoteScreenStreams(new Map());
  }

  function initialize(clientId: string) {
    if (peer.current) return;

    myIdRef.current = clientId;
    peer.current = new Peer(clientId, {
      host: import.meta.env.VITE_HOST_IP,
      port: import.meta.env.VITE_PEER_PORT,
      path: "/peerjs",
      secure: true,
      debug: 0,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" },
        ],
      },
    });

    peer.current.on("open", () => {
      const pending = Array.from(pendingPeersRef.current);
      pendingPeersRef.current.clear();
      pending.forEach((id) => void initiateCall(id));
    });

    peer.current.on("call", handleIncomingCall);

    peer.current.on("error", (error) => {
      console.warn("PeerJS error", error);
    });
  }

  const switchMicState = useCallback(
    (state: boolean) => {
      mutedRef.current = !state;

      if (localTrackRef.current) {
        localTrackRef.current.enabled = state;
      }

      // Во время mesh-звонка sender'ы могут ссылаться на разные треки
      // после replaceTrack — переключаем каждый.
      getAudioSenders().forEach((sender) => {
        if (sender.track) sender.track.enabled = state;
      });
    },
    [getAudioSenders],
  );

  const replaceInputDevice = useCallback(async (): Promise<boolean> => {
    if (switchingRef.current) return false;

    switchingRef.current = true;
    let nextTrack: MediaStreamTrack | null = null;

    const session = callSessionRef.current;

    try {
      const stream = await acquireAudioStream();

      if (session !== callSessionRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }

      nextTrack = stream.getAudioTracks()[0] ?? null;

      stream.getTracks().forEach((track) => {
        if (track !== nextTrack) track.stop();
      });

      if (!nextTrack) return false;

      nextTrack.enabled = !mutedRef.current;

      const senders = getAudioSenders();

      if (senders.length > 0) {
        const previousTrack = localTrackRef.current;
        await Promise.all(
          senders.map((sender) => sender.replaceTrack(nextTrack)),
        );
        previousTrack?.stop();
      } else {
        localTrackRef.current?.stop();
      }

      if (session !== callSessionRef.current) {
        nextTrack.stop();
        return false;
      }

      localTrackRef.current = nextTrack;
      localStreamRef.current = new MediaStream([nextTrack]);
      setLocalAudioStream(localStreamRef.current);
      setIsCallActive(true);
      resetMicRetry();

      return true;
    } catch (err) {
      nextTrack?.stop();
      console.warn("Failed to switch microphone", err);
      return false;
    } finally {
      switchingRef.current = false;
    }
  }, [getAudioSenders, resetMicRetry]);

  const scheduleMicRetry = useCallback(() => {
    if (!isCallActiveRef.current) return;

    clearRetryTimer();

    const delay = microphoneRetryDelay(retryAttemptRef.current);
    retryAttemptRef.current += 1;

    retryTimerRef.current = window.setTimeout(() => {
      retryTimerRef.current = null;
      recoverRef.current();
    }, delay);
  }, [clearRetryTimer]);

  const recoverInput = useCallback(async () => {
    if (!isCallActiveRef.current) {
      resetMicRetry();
      return;
    }

    const senders = getAudioSenders();
    const currentTrack =
      senders.length > 0 ? senders[0].track : localTrackRef.current;

    if (isMicrophoneTrackUsable(currentTrack)) {
      resetMicRetry();
      return;
    }

    if (!(await replaceInputDevice())) scheduleMicRetry();
  }, [getAudioSenders, replaceInputDevice, resetMicRetry, scheduleMicRetry]);

  const recoverRef = useRef<() => void>(() => {});

  useEffect(() => {
    recoverRef.current = () => {
      void recoverInput();
    };
  }, [recoverInput]);

  const switchInputDevice = useCallback(async () => {
    if (!isCallActiveRef.current) return;

    if (!(await replaceInputDevice())) scheduleMicRetry();
  }, [replaceInputDevice, scheduleMicRetry]);

  useEffect(() => {
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);

  const audio = useSettingsStore((s) => s.audio);
  useEffect(() => {
    // На монтировании и вне звонка switchInputDevice ничего не делает
    void switchInputDevice();
  }, [audio, switchInputDevice]);

  useEffect(() => {
    if (!isCallActive) return;

    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.addEventListener) return;

    const onDeviceChange = () => {
      void recoverInput();
    };

    mediaDevices.addEventListener("devicechange", onDeviceChange);

    return () => {
      mediaDevices.removeEventListener("devicechange", onDeviceChange);
      resetMicRetry();
    };
  }, [isCallActive, recoverInput, resetMicRetry]);

  useEffect(() => {
    const [track] = localAudioStream?.getAudioTracks() ?? [];
    if (!track) return;

    const onLost = () => {
      void recoverInput();
    };
    const onRestored = () => resetMicRetry();

    track.addEventListener("ended", onLost);
    track.addEventListener("mute", onLost);
    track.addEventListener("unmute", onRestored);

    return () => {
      track.removeEventListener("ended", onLost);
      track.removeEventListener("mute", onLost);
      track.removeEventListener("unmute", onRestored);
    };
  }, [localAudioStream, recoverInput, resetMicRetry]);

  const stopScreenShare = useCallback(() => {
    localScreenStreamRef.current?.getTracks().forEach((track) => track.stop());
    localScreenStreamRef.current = null;

    const calls = Array.from(outgoingScreenCallsRef.current.values());
    outgoingScreenCallsRef.current.clear();
    calls.forEach((call) => call.close());

    setLocalScreenStream(null);
  }, []);

  /** Досылает текущий screen-поток участнику, вошедшему позже */
  const addScreenShareTarget = useCallback((peerId: string) => {
    const stream = localScreenStreamRef.current;
    if (!stream || !peer.current?.open) return;
    if (outgoingScreenCallsRef.current.has(peerId)) return;

    const call = peer.current.call(peerId, stream, {
      metadata: { kind: "screen" },
    });
    if (!call) return;

    outgoingScreenCallsRef.current.set(peerId, call);
    configureScreenSender(call, outgoingScreenCallsRef.current.size);

    call.on("close", () => {
      if (outgoingScreenCallsRef.current.get(peerId) === call) {
        outgoingScreenCallsRef.current.delete(peerId);
      }
    });
  }, []);

  /** Запускает шаринг экрана всем перечисленным участникам */
  const startScreenShare = useCallback(
    async (targetUserIds: string[]) => {
      if (!peer.current?.open || outgoingScreenCallsRef.current.size > 0) {
        return false;
      }

      const session = callSessionRef.current;

      try {
        if (!navigator.mediaDevices.getDisplayMedia) {
          throw new Error("Демонстрация экрана невозможна на этом устройстве");
        }

        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            frameRate: { ideal: 60, max: 180 },
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
          },
          audio: false,
        });

        if (session !== callSessionRef.current) {
          screenStream.getTracks().forEach((track) => track.stop());
          return false;
        }

        const [videoTrack] = screenStream.getVideoTracks();
        if (!videoTrack) {
          screenStream.getTracks().forEach((track) => track.stop());
          return false;
        }

        const targets = Array.from(
          new Set(targetUserIds.filter((id) => id !== myIdRef.current)),
        );

        if (targets.length === 0) {
          screenStream.getTracks().forEach((track) => track.stop());
          return false;
        }

        // Если пользователь нажмёт «Stop sharing» в UI браузера
        videoTrack.onended = () => {
          stopScreenShare();
          onLocalScreenStop.current?.();
        };

        let startedCalls = 0;

        targets.forEach((peerId) => {
          if (!peer.current?.open) return;

          const call = peer.current.call(peerId, screenStream, {
            metadata: { kind: "screen" },
          });
          if (!call) return;

          startedCalls += 1;
          outgoingScreenCallsRef.current.set(peerId, call);
          configureScreenSender(call, targets.length);

          call.on("close", () => {
            if (outgoingScreenCallsRef.current.get(peerId) === call) {
              outgoingScreenCallsRef.current.delete(peerId);
            }
          });
        });

        if (startedCalls === 0) {
          screenStream.getTracks().forEach((track) => track.stop());
          return false;
        }

        localScreenStreamRef.current = screenStream;
        setLocalScreenStream(screenStream);
        return true;
      } catch (e) {
        console.error(e);
        const msg =
          e instanceof Error ? e.message : "Не удалось начать шаринг экрана";
        if ((e as Error).name !== "NotAllowedError")
          toast(msg, { type: "error" });
        return false;
      }
    },
    [stopScreenShare],
  );

  function endCall() {
    callSessionRef.current += 1;
    resetMicRetry();
    disconnectAll();

    localScreenStreamRef.current?.getTracks().forEach((track) => track.stop());
    localScreenStreamRef.current = null;

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localTrackRef.current?.stop();

    localStreamRef.current = null;
    localTrackRef.current = null;
    mutedRef.current = false;
    isCallActiveRef.current = false;

    setLocalAudioStream(null);
    setLocalScreenStream(null);
    setIsCallActive(false);
  }

  /** Первый входящий screen-поток (сервер разрешает только одного шарящего) */
  const remoteScreenStream = useMemo(
    () => remoteScreenStreams.values().next().value ?? null,
    [remoteScreenStreams],
  );

  return {
    isCallActive,
    localAudioStream,
    remoteStreams,
    remoteScreenStream,
    localScreenStream,
    initialize,
    callToUser: (userId: string) => void initiateCall(userId),
    connectToMembers,
    disconnectMembers,
    disconnectAll,
    endCall,
    switchMicState,
    switchInputDevice,
    startScreenShare,
    stopScreenShare,
    addScreenShareTarget,
    setOnRemoteScreenStream,
    setOnLocalScreenStop,
  };
}
