import Peer, { type MediaConnection } from "peerjs";
import { useRef } from "react";

export function usePeer() {
  const peer = useRef<Peer | undefined>(undefined);
  const currentCall = useRef<MediaConnection | undefined>(undefined);
  function initialize(clientId: string) {
    if (peer.current) return;
    peer.current = new Peer(clientId, {
      host: import.meta.env.VITE_HOST_IP,
      port: import.meta.env.VITE_PEER_PORT,
      path: "/peerjs",
      debug: 3,
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
          call.answer(stream); // Answer the call with an A/V stream.
          call.on("stream", (remoteStream) => {
            const audio = document.getElementById(
              "user-voice",
            ) as HTMLAudioElement;
            if (audio) {
              audio.srcObject = remoteStream;
              audio.play();
            }
          });
          currentCall.current = call;
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
      call?.on("stream", (remoteStream) => {
        const audio = document.getElementById("user-voice") as HTMLAudioElement;
        if (audio) {
          audio.srcObject = remoteStream;
          audio.play();
        }
      });
      currentCall.current = call;
    });
  }

  function switchMicState(state: boolean) {
    if (currentCall.current) {
      currentCall.current.localStream.getAudioTracks().forEach((track) => {
        track.enabled = state;
      });
    }
  }

  function endCall() {
    currentCall.current?.close();
  }

  return {
    callToUser,
    initialize,
    endCall,
    switchMicState,
  };
}
