import { useRef, useEffect, type PropsWithChildren, useState } from "react";
import {
  ChatNetworkContext,
  type ChatNetworkContextType,
} from "./ChatNetworkContext";
import type { ClientData, UserProfile } from "../../types";
import { usePeer } from "../../hooks/usePeer";

export function ChatNetworkProvider(props: PropsWithChildren) {
  const socket = useRef<WebSocket | null>(null);

  const [roomId, setRoomId] = useState<string>();
  const [roomJoined, setRoomJoined] = useState(false);
  const [userList, setUserList] = useState<Array<UserProfile>>([]);

  const { initialize, callToUser, endCall, muteMicrophone } = usePeer();

  useEffect(() => {
    if (
      socket.current?.readyState === WebSocket.OPEN ||
      socket.current?.readyState === WebSocket.CONNECTING
    )
      return;
    socket.current = new WebSocket(
      `ws://${import.meta.env.VITE_HOST_IP}:${import.meta.env.VITE_PORT}`,
    );
    socket.current.onopen = () => {
      console.log("Successfully connected!");
    };

    socket.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      const currentUsers =
        data.data?.clients?.map((client: ClientData) => {
          return {
            name: client.additionalInfo.userName,
            id: client.id,
            avatar: client.additionalInfo.avatar,
            isMe: client.isMe,
          };
        }) || [];

      console.info(e);

      switch (data.type) {
        case "room-created":
          setRoomId(data.data.roomId);
          break;
        case "joined-room": {
          setRoomJoined(true);

          setUserList([...currentUsers]);

          break;
        }
        case "user-joined": {
          setUserList((userList) => [
            ...userList,
            {
              name: data.data.clientInfo.userName,
              avatar: data.data.clientInfo.avatar,
              id: data.data.clientId,
              isMe: false,
            },
          ]);
          const anotherUserId = data.data.clientId;

          if (anotherUserId) {
            callToUser(anotherUserId);
          }
          break;
        }
        case "left-room":
          setRoomId(undefined);
          setRoomJoined(false);
          break;
        case "user-left":
        case "user-disconnected":
          setUserList([...currentUsers]);
          endCall();
          break;
        case "welcome": {
          initialize(data.data.clientId);
          break;
        }
        case "user-broadcasted": {
          setUserList((userList) => {
            const index = userList.findIndex(
              (user) => user.id === data.data.clientId,
            );
            userList[index] = {
              ...userList[index],
              ...data.data.broadcastedData,
            };
            const newList = [...userList];

            return newList;
          });
          break;
        }
      }
    };
    socket.current.onclose = (e) => {
      if (e.wasClean) {
        console.log(
          `[close] Соединение закрыто чисто, код=${e.code} причина=${e.reason}`,
        );
      } else {
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

  const muteMic = (micMuted: boolean) => {
    const me = userList.find((u) => u.isMe);

    if (me) {
      muteMicrophone(!micMuted);
      me.micMuted = micMuted;
      setUserList([...userList]);
    }

    socket.current?.send(
      JSON.stringify({
        type: "broadcast",
        data: { roomId, broadcastedData: { micMuted } },
      }),
    );
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
        muteMic,
      }}
    >
      {props.children}
    </ChatNetworkContext>
  );
}
