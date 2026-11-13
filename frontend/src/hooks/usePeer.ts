import Peer, { type MediaConnection } from "peerjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

import {
  buildAudioConstraints,
  DEFAULT_DEVICE_ID,
  isMicrophoneTrackUsable,
  microphoneRetryDelay,
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

export function usePeer() {
  const peer = useRef<Peer | undefined>(undefined);
  const callRef = useRef<MediaConnection | null>(null);
  const screenCallRef = useRef<MediaConnection | null>(null);

  const localTrackRef = useRef<MediaStreamTrack | null>(null);
  const mutedRef = useRef(false);
  const switchingRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const retryAttemptRef = useRef(0);

  const [currentCall, setCurrentCall] = useState<MediaConnection | null>(null);
  const [localAudioStream, setLocalAudioStream] = useState<MediaStream | null>(
    null,
  );
  const [localScreenStream, setLocalScreenStream] =
    useState<MediaStream | null>(null);
  const [remoteScreenStream, setRemoteScreenStream] =
    useState<MediaStream | null>(null);

  const getAudioSender = useCallback((): RTCRtpSender | null => {
    const senders = callRef.current?.peerConnection?.getSenders() ?? [];

    return senders.find((sender) => sender.track?.kind === "audio") ?? null;
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

  const applyLocalStream = useCallback((stream: MediaStream) => {
    localTrackRef.current = stream.getAudioTracks()[0] ?? null;
    mutedRef.current = false;
    setLocalAudioStream(stream);
  }, []);

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

  function initialize(clientId: string) {
    if (peer.current) return;

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

    peer.current.on("call", (call) => {
      const kind: CallKind = call.metadata?.kind ?? "audio";

      if (kind === "screen") {
        // Принимаем экран БЕЗ своего стрима — мы только получатель
        call.answer(null as unknown as MediaStream);
        handleScreenCall(call);
        return;
      }

      // Обычный аудио-звонок
      acquireAudioStream()
        .then((stream) => {
          call.answer(stream);
          applyLocalStream(stream);
          handleCall(call);
        })
        .catch((err) => console.error("Failed to get local stream", err));
    });
  }

  function callToUser(userId: string) {
    acquireAudioStream()
      .then((stream) => {
        applyLocalStream(stream);
        const call = peer.current?.call(userId, stream, {
          metadata: { kind: "audio" },
        });
        if (call) handleCall(call);
      })
      .catch((err) => console.error("Failed to get local stream", err));
  }

  function handleCall(call: MediaConnection) {
    call.on("stream", (remoteStream) => {
      const audio = document.getElementById("user-voice") as HTMLAudioElement;
      if (audio) {
        audio.srcObject = remoteStream;
        audio.play();
      }
    });
    callRef.current = call;
    setCurrentCall(callRef.current);
  }

  const stopScreenShare = () => {
    localScreenStream?.getTracks().forEach((t) => t.stop());
    screenCallRef.current?.close();
    screenCallRef.current = null;
    setLocalScreenStream(null);
  };

  // --- Screen share ---
  const startScreenShare = useCallback(async (targetUserId: string) => {
    if (!peer.current) return;

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

      const [videoTrack] = screenStream.getVideoTracks();
      // videoTrack.contentHint = "motion";
      if (!videoTrack) {
        screenStream.getTracks().forEach((t) => t.stop());
        return;
      }

      // Если пользователь нажмёт «Stop sharing» в UI браузера
      videoTrack.onended = () => {
        stopScreenShare();
        onLocalScreenStop.current?.();
      };

      const call = peer.current.call(targetUserId, screenStream, {
        metadata: { kind: "screen" },
      });

      const pc = call.peerConnection;
      if (pc) {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          const params = sender.getParameters();
          if (!params.encodings) params.encodings = [{}];

          params.encodings[0].maxBitrate = 10_000_000; // 5 Mbps
          // Для 60 FPS можно попробовать 8-10 Mbps

          // Приоритет: framerate
          params.encodings[0].priority = "high";
          params.encodings[0].networkPriority = "high";

          sender
            .setParameters(params)
            .catch((e) => console.warn("Failed to set encoding params", e));
        }
      }

      screenCallRef.current = call;
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
  }, []);

  function handleScreenCall(call: MediaConnection) {
    call.on("stream", (remoteStream) => {
      setRemoteScreenStream(remoteStream);
      onRemoteScreenStream.current?.(remoteStream);
    });
    call.on("close", () => {
      setRemoteScreenStream(null);
      onRemoteScreenStream.current?.(null);
    });
    screenCallRef.current = call;
  }

  const switchMicState = useCallback(
    (state: boolean) => {
      mutedRef.current = !state;

      const senderTrack = getAudioSender()?.track ?? null;
      if (senderTrack) senderTrack.enabled = state;

      const localTrack = localTrackRef.current;
      if (localTrack && localTrack !== senderTrack) localTrack.enabled = state;
    },
    [getAudioSender],
  );

  const replaceInputDevice = useCallback(async (): Promise<boolean> => {
    const call = callRef.current;
    const sender = getAudioSender();

    if (!call || !sender || switchingRef.current) return false;

    switchingRef.current = true;
    let nextTrack: MediaStreamTrack | null = null;

    try {
      const stream = await acquireAudioStream();
      nextTrack = stream.getAudioTracks()[0] ?? null;

      stream.getTracks().forEach((track) => {
        if (track !== nextTrack) track.stop();
      });

      if (!nextTrack) return false;

      if (callRef.current !== call) {
        nextTrack.stop();
        return false;
      }

      nextTrack.enabled = !mutedRef.current;

      const previousTrack = sender.track;
      await sender.replaceTrack(nextTrack);
      previousTrack?.stop();

      localTrackRef.current = nextTrack;
      setLocalAudioStream(new MediaStream([nextTrack]));
      resetMicRetry();

      return true;
    } catch (err) {
      nextTrack?.stop();
      console.warn("Failed to switch microphone", err);
      return false;
    } finally {
      switchingRef.current = false;
    }
  }, [getAudioSender, resetMicRetry]);

  const recoverRef = useRef<() => void>(() => {});

  const scheduleMicRetry = useCallback(() => {
    if (!callRef.current) return;

    clearRetryTimer();

    const delay = microphoneRetryDelay(retryAttemptRef.current);
    retryAttemptRef.current += 1;

    retryTimerRef.current = window.setTimeout(() => {
      retryTimerRef.current = null;
      recoverRef.current();
    }, delay);
  }, [clearRetryTimer]);

  const recoverInput = useCallback(async () => {
    if (!callRef.current) {
      resetMicRetry();
      return;
    }

    const currentTrack = getAudioSender()?.track ?? localTrackRef.current;
    if (isMicrophoneTrackUsable(currentTrack)) {
      resetMicRetry();
      return;
    }

    if (!(await replaceInputDevice())) scheduleMicRetry();
  }, [getAudioSender, replaceInputDevice, resetMicRetry, scheduleMicRetry]);

  useEffect(() => {
    recoverRef.current = () => {
      void recoverInput();
    };
  }, [recoverInput]);

  const switchInputDevice = useCallback(async () => {
    if (!callRef.current) return;

    if (!(await replaceInputDevice())) scheduleMicRetry();
  }, [replaceInputDevice, scheduleMicRetry]);

  const audio = useSettingsStore((s) => s.audio);
  useEffect(() => {
    void switchInputDevice();
  }, [audio, switchInputDevice]);

  useEffect(() => {
    if (!currentCall) return;

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
  }, [currentCall, recoverInput, resetMicRetry]);

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

  function endCall() {
    resetMicRetry();

    callRef.current?.localStream
      ?.getAudioTracks()
      .forEach((track) => track.stop());
    localTrackRef.current?.stop();
    localAudioStream?.getTracks().forEach((track) => track.stop());

    localTrackRef.current = null;
    mutedRef.current = false;
    callRef.current?.close();
    callRef.current = null;
    setLocalAudioStream(null);
    setCurrentCall(null);

    // При завершении звонка — заодно гасим шаринг, если был
    stopScreenShare();
  }

  return {
    call: currentCall,
    localAudioStream,
    callToUser,
    initialize,
    endCall,
    switchMicState,
    switchInputDevice,
    startScreenShare,
    stopScreenShare,
    localScreenStream,
    remoteScreenStream,
    setOnRemoteScreenStream,
    setOnLocalScreenStop,
  };
}
