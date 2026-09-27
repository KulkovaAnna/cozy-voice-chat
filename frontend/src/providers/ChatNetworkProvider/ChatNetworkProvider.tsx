import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { usePeer } from "../../hooks/usePeer";
import type { TextMessage } from "../../types";
import { useAuth } from "../AuthProvider";
import { ChatNetworkContext } from "./ChatNetworkContext";
import { useChatCall } from "./hooks/useChatCall";
import { useChatLobby } from "./hooks/useChatLobby";
import { useChatMessageRouter } from "./hooks/useChatMessageRouter";
import { useChatMessages } from "./hooks/useChatMessages";
import { useChatScreenShare } from "./hooks/useChatScreenShare";
import { useChatSignaling } from "./hooks/useChatSignaling";
import { useSpeechDetection } from "./hooks/useSpeechDetection";

export function ChatNetworkProvider(props: PropsWithChildren) {
  const socketRef = useRef<WebSocket | null>(null);
  const [textMessages, setTextMessages] = useState<Array<TextMessage>>([]);

  const { user, updateUser } = useAuth();

  const {
    call,
    localScreenStream,
    remoteScreenStream,
    initialize,
    callToUser: peerCallToUser,
    endCall: peerEndCall,
    switchMicState,
    startScreenShare,
    stopScreenShare,
    setOnRemoteScreenStream,
    setOnLocalScreenStop,
  } = usePeer();

  const send = useCallback((type: string, data: Record<string, unknown>) => {
    socketRef.current?.send(JSON.stringify({ type, data }));
  }, []);

  const peerRef = useRef({
    callToUser: peerCallToUser,
    endCall: peerEndCall,
    switchMicState,
  });

  useEffect(() => {
    peerRef.current = {
      callToUser: peerCallToUser,
      endCall: peerEndCall,
      switchMicState,
    };
  }, [peerCallToUser, peerEndCall, switchMicState]);

  const lobby = useChatLobby({ user, send });
  const callHook = useChatCall({ user, send, peerRef });
  const messages = useChatMessages({
    send,
    callInfoRef: callHook.callInfoRef,
    setTextMessages,
  });

  const { beginScreenShare, endScreenShare } = useChatScreenShare({
    send,
    callInfo: callHook.callInfo,
    user,
    startScreenShare,
    stopScreenShare,
    setOnRemoteScreenStream,
    setOnLocalScreenStop,
  });

  useSpeechDetection({
    call,
    onSpeakingChange: callHook.changeIsSpeakingState,
  });

  const onMeLobbyJoined = useCallback(
    (meId: string) => {
      updateUser({ id: meId });
      initialize(meId);
    },
    [initialize, updateUser],
  );

  const handleCallEnded = useCallback(() => {
    callHook.handleCallEnded();
    setTextMessages([]);
  }, [callHook]);

  const { route } = useChatMessageRouter({
    handleLobbyJoined: lobby.handleLobbyJoined,
    onMeLobbyJoined,
    handleCallOffer: lobby.handleCallOffer,
    handleCallOfferDeclined: lobby.handleCallOfferDeclined,
    setCallOfferNull: lobby.clearCallOffer,
    handleCallStarted: callHook.handleCallStarted,
    handleCallEnded,
    handleOnlineChanged: callHook.handleOnlineChanged,
    handleCallStateChanged: callHook.handleCallStateChanged,
    handleNewMessage: messages.handleNewMessage,
    handleFileReceived: messages.handleFileReceived,
  });

  useChatSignaling({
    user,
    socketRef,
    joinToLobby: lobby.joinToLobby,
    onMessage: route,
  });

  return (
    <ChatNetworkContext
      value={{
        lobbyMembers: lobby.lobbyMembers,
        callInfo: callHook.callInfo,
        callOffer: lobby.callOffer,
        isMyUserMuted: callHook.isMyUserMuted,
        textMessages,
        isMyUserScreenSharing: callHook.isMyUserScreenSharing,
        localScreenStream,
        remoteScreenStream,
        beginScreenShare,
        endScreenShare,
        joinToLobby: lobby.joinToLobby,
        callToUser: lobby.callToUser,
        acceptCallOffer: lobby.acceptCallOffer,
        declineCallOffer: lobby.declineCallOffer,
        endCall: callHook.endCall,
        changeMuteStatus: callHook.changeMuteStatus,
        sendTextMessage: messages.sendTextMessage,
      }}
    >
      {props.children}
    </ChatNetworkContext>
  );
}
