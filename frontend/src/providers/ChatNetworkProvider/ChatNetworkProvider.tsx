import { useRef, useEffect, type PropsWithChildren, useState } from "react";
import {
  ChatNetworkContext,
  type ChatNetworkContextType,
} from "./ChatNetworkContext";
import type { ClientData, UserProfile } from "../../types";

export function ChatNetworkProvider(props: PropsWithChildren) {
  const socket = useRef<WebSocket | null>(null);

  const [roomId, setRoomId] = useState<string>();
  const [roomJoined, setRoomJoined] = useState(false);
  const [userList, setUserList] = useState<Array<UserProfile>>([]);

  useEffect(() => {
    if (
      socket.current?.readyState === WebSocket.OPEN ||
      socket.current?.readyState === WebSocket.CONNECTING
    )
      return;
    socket.current = new WebSocket(
      `ws://${import.meta.env.VITE_HOST_IP}:${import.meta.env.VITE_PORT}`,
    );
    socket.current.onopen = (e) => {
      console.log("Successfully connected!");
    };
    socket.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      const currentUsers =
        data.data?.clients?.map((client: ClientData) => {
          return { name: client.additionalInfo.userName, id: client.id };
        }) || [];

      switch (data.type) {
        case "room-created":
          setRoomId(data.data.roomId);
          break;
        case "joined-room": {
          setRoomJoined(true);

          setUserList([...currentUsers]);

          break;
        }
        case "user-joined":
          setUserList((userList) => [
            ...userList,
            {
              name: data.data.clientInfo.userName,
              id: data.data.clientId,
            },
          ]);
          break;
        case "left-room":
          setRoomId(undefined);
          setRoomJoined(false);
          break;
        case "user-left":
        case "user-disconnected":
          setUserList([...currentUsers]);
          break;
      }
    };
    socket.current.onclose = (e) => {
      if (e.wasClean) {
        console.log(
          `[close] Соединение закрыто чисто, код=${e.code} причина=${e.reason}`,
        );
      } else {
        // например, сервер убил процесс или сеть недоступна
        // обычно в этом случае event.code 1006
        console.log("[close] Соединение прервано");
      }
    };
    socket.current.onerror = (err) => {
      console.error(err);
    };
  }, []);

  function createRoom() {
    socket.current?.send(JSON.stringify({ type: "create-room" }));
  }

  const joinToRoom: ChatNetworkContextType["joinToRoom"] = (data) => {
    console.log("data.roomId: " + data.roomId);
    console.log("roomId: " + roomId);
    socket.current?.send(
      JSON.stringify({
        type: "join-room",
        data: {
          roomId: data.roomId || roomId,
          ...data,
        },
      }),
    );
  };
  const leaveRoom = () => {
    socket.current?.send(JSON.stringify({ type: "leave-room" }));
  };
  return (
    <ChatNetworkContext
      value={{
        createRoom,
        roomId,
        joinToRoom,
        roomJoined,
        userList,
        setRoomId,
        leaveRoom,
      }}
    >
      {props.children}
    </ChatNetworkContext>
  );
}
