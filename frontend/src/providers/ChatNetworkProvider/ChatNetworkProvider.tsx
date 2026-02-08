import {
  useRef,
  useEffect,
  type PropsWithChildren,
  useState,
  useMemo,
} from "react";
import { ChatNetworkContext } from "./ChatNetworkContext";
import type { CallInfo, CallOffer, UserProfile, UserDTO } from "../../types";
import { useAuth } from "../AuthProvider";
import { callInfoAdapter, userAdapter } from "../../utils/adapters";
import { usePeer } from "../../hooks/usePeer";

export function ChatNetworkProvider(props: PropsWithChildren) {
  const [callOffer, setCallOffer] = useState<CallOffer | null>(null);
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const [lobbyMembers, setLobbyMembers] = useState<Array<UserProfile>>([]);

  const { user, updateUser } = useAuth();

  const {
    initialize,
    callToUser: peerCallToUser,
    endCall: peerEndCall,
    switchMicState,
  } = usePeer();

  const isMyUserMuted = useMemo(
    () =>
      callInfo?.members.find((mem) => mem.member.id === user.id)?.isMuted ||
      false,
    [user, callInfo],
  );

  useEffect(() => {
    if (!user.name) return;

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
      joinToLobby();
    };

    socket.current.onmessage = (e) => {
      const data = JSON.parse(e.data);

      console.info(e);

      switch (data.type) {
        case "all::lobby::joined": {
          const currentLobbyMembers = data.data.lobbyInfo.members.map(
            (member: UserDTO) => userAdapter(member),
          );
          setLobbyMembers(currentLobbyMembers);
          break;
        }
        case "me::lobby-joined": {
          const me = data.data.client;
          updateUser({ id: me.id });
          initialize(me.id!);
          break;
        }
        case "me::call-offer":
        case "me::call-initiated": {
          const callOffer = data.data.callOffer;
          setCallOffer({
            id: callOffer.id,
            initiator: userAdapter(callOffer.initiator),
          });
          break;
        }
        case "me::call-offer-declined": {
          setCallOffer(null);
          break;
        }
        case "all::lobby::client-disconnected": {
          break;
        }
        case "all::call::started": {
          setCallOffer(null);
          const callInfoData = data.data.callInfo;
          const currentCallInfo = callInfoAdapter(callInfoData);
          setCallInfo(currentCallInfo);
          const meString = localStorage.getItem("user");

          if (!meString) return;

          const me = JSON.parse(meString);

          if (me.id === currentCallInfo.initiator.id) {
            peerCallToUser(currentCallInfo.receiver.id!);
          }
          break;
        }
        case "all::call::ended":
        case "all::call::online-changed": {
          if (data.type === "all::call::ended" || !data.data.isOnline) {
            peerEndCall();
            setCallInfo(null);
          }
          break;
        }
        case "all::call::mute-changed": {
          setCallInfo(callInfoAdapter(data.data.callInfo));
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
  }, [user]);

  function acceptCallOffer() {
    if (!callOffer) return;
    socket.current?.send(
      JSON.stringify({
        type: "lobby::accept-offer",
        data: { offerId: callOffer.id },
      }),
    );
  }

  function declineCallOffer() {
    if (!callOffer) return;
    socket.current?.send(
      JSON.stringify({
        type: "lobby::decline-offer",
        data: { offerId: callOffer.id },
      }),
    );
    setCallOffer(null);
  }

  function joinToLobby() {
    socket.current?.send(
      JSON.stringify({
        type: "lobby::join",
        data: { personalInfo: { name: user.name, avatar: user.avatar } },
      }),
    );
  }

  function callToUser(uid: string) {
    socket.current?.send(
      JSON.stringify({
        type: "lobby::initiate-call",
        data: { receiverId: uid },
      }),
    );
  }

  function endCall() {
    if (!callInfo) return;

    socket.current?.send(
      JSON.stringify({
        type: "call::end",
        data: { callId: callInfo.id },
      }),
    );
  }

  function changeMuteStatus(status: boolean) {
    if (!callInfo) return;

    switchMicState(!status);
    socket.current?.send(
      JSON.stringify({
        type: "call::mute",
        data: { callId: callInfo.id, status },
      }),
    );
  }

  return (
    <ChatNetworkContext
      value={{
        lobbyMembers,
        callInfo,
        callOffer,
        isMyUserMuted,
        joinToLobby,
        callToUser,
        acceptCallOffer,
        declineCallOffer,
        endCall,
        changeMuteStatus,
      }}
    >
      {props.children}
    </ChatNetworkContext>
  );
}
