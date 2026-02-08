import Peer, { type MediaConnection } from "peerjs";
import { useRef, useState } from "react";

export function usePeer() {
  const peer = useRef<Peer | undefined>(undefined);
  const [currentCall, setCurrentCall] = useState<MediaConnection | null>(null);
  const callRef = useRef<MediaConnection | null>(null);

  function initialize(clientId: string) {
    if (peer.current) return;
    peer.current = new Peer(clientId, {
      host: import.meta.env.VITE_HOST_IP,
      port: import.meta.env.VITE_PEER_PORT,
      path: "/peerjs",
      debug: 0,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" },
        ],
      },
    });

    peer.current?.on("call", (call) => {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(
        (stream) => {
          call.answer(stream);
          handleCall(call);
        },
        (err) => {
          console.error("Failed to get local stream", err);
        },
      );
    });
  }

  function callToUser(userId: string) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const call = peer.current?.call(userId, stream);
      if (call) {
        handleCall(call);
      }
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

  function switchMicState(state: boolean) {
    if (callRef.current) {
      callRef.current.localStream.getAudioTracks().forEach((track) => {
        track.enabled = state;
      });
    }
  }

  function endCall() {
    callRef.current?.localStream.getAudioTracks().forEach((track) => {
      track.stop();
    });
    callRef.current?.close();
    callRef.current = null;
    setCurrentCall(null);
  }

  return {
    call: currentCall,
    callToUser,
    initialize,
    endCall,
    switchMicState,
  };
}
