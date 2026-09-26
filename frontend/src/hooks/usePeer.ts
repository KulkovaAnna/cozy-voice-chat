import Peer, { type MediaConnection } from "peerjs";
import { useCallback, useRef, useState } from "react";
import { toast } from "react-toastify";

export type CallKind = "audio" | "screen";

export interface PeerCall {
  kind: CallKind;
  connection: MediaConnection;
  remoteStream: MediaStream | null;
}

export function usePeer() {
  const peer = useRef<Peer | undefined>(undefined);
  const callRef = useRef<MediaConnection | null>(null);
  const screenCallRef = useRef<MediaConnection | null>(null);

  const [currentCall, setCurrentCall] = useState<MediaConnection | null>(null);
  const [localScreenStream, setLocalScreenStream] =
    useState<MediaStream | null>(null);
  const [remoteScreenStream, setRemoteScreenStream] =
    useState<MediaStream | null>(null);

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
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          call.answer(stream);
          handleCall(call);
        })
        .catch((err) => console.error("Failed to get local stream", err));
    });
  }

  function callToUser(userId: string) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const call = peer.current?.call(userId, stream, {
        metadata: { kind: "audio" },
      });
      if (call) handleCall(call);
    });
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

  function switchMicState(state: boolean) {
    callRef.current?.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = state;
    });
  }

  function endCall() {
    callRef.current?.localStream
      ?.getAudioTracks()
      .forEach((track) => track.stop());
    callRef.current?.close();
    callRef.current = null;
    setCurrentCall(null);

    // При завершении звонка — заодно гасим шаринг, если был
    stopScreenShare();
  }

  return {
    call: currentCall,
    callToUser,
    initialize,
    endCall,
    switchMicState,
    startScreenShare,
    stopScreenShare,
    localScreenStream,
    remoteScreenStream,
    setOnRemoteScreenStream,
    setOnLocalScreenStop,
  };
}
