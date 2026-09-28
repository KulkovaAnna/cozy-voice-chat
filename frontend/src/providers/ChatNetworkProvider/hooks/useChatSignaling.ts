import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { UserProfile } from "@cvc/types";

type UseChatSignalingParams = {
  user: UserProfile;
  socketRef: RefObject<WebSocket | null>;
  joinToLobby: VoidFunction;
  onMessage: (event: MessageEvent) => void;
};

export function useChatSignaling({
  user,
  socketRef,
  joinToLobby,
  onMessage,
}: UseChatSignalingParams) {
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (!user.name) return;

    if (
      socketRef.current?.readyState === WebSocket.OPEN ||
      socketRef.current?.readyState === WebSocket.CONNECTING
    )
      return;

    socketRef.current = new WebSocket(
      `${import.meta.env.VITE_SSL === "true" ? "wss" : "ws"}://${import.meta.env.VITE_HOST_IP}:${import.meta.env.VITE_PORT}`,
    );

    socketRef.current.onopen = () => {
      console.log("Successfully connected!");
      joinToLobby();
    };

    socketRef.current.onmessage = (e) => onMessageRef.current(e);

    socketRef.current.onclose = (e) => {
      if (e.wasClean) {
        console.log(
          `[close] Соединение закрыто чисто, код=${e.code} причина=${e.reason}`,
        );
      } else {
        console.log("[close] Соединение прервано");
      }
    };

    socketRef.current.onerror = (err) => {
      console.error(err);
    };
  }, [joinToLobby, socketRef, user.name]);

  useEffect(() => {
    connect();
  }, [connect, user]);
}
