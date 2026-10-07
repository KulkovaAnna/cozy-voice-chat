import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { usePeer } from "@cvc/hooks";
import type { TextMessage } from "@cvc/types";
import { useAuth } from "../AuthProvider";
import { ChatNetworkContext } from "./ChatNetworkContext";
import {
  useChatCall,
  useChatLobby,
  useChatMessageRouter,
  useChatMessages,
  useChatScreenShare,
  useChatSignaling,
  useSpeechDetection,
} from "./hooks";

export function ChatNetworkProvider(props: PropsWithChildren) {
  const socketRef = useRef<WebSocket | null>(null);
  const [textMessages, setTextMessages] = useState<Array<TextMessage>>([]);

  const { user, updateUser } = useAuth();

  const {
    call,
    localAudioStream,
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
    localAudioStream,
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

  // Автосинхронизация профиля: при изменении имени/аватара после входа
  // в лобби отправляем обновление на сервер (при join профиль уже отправлен,
  // поэтому первое срабатывание с полученным id только фиксируем)
  const lastSentProfileRef = useRef<{ name: string; avatar: string } | null>(
    null,
  );

  const { updateProfile } = lobby;

  useEffect(() => {
    if (!user.id) return;
    if (socketRef.current?.readyState !== WebSocket.OPEN) return;

    const profile = { name: user.name, avatar: user.avatar };
    const lastSent = lastSentProfileRef.current;

    if (!lastSent) {
      lastSentProfileRef.current = profile;
      return;
    }

    if (lastSent.name === profile.name && lastSent.avatar === profile.avatar) {
      return;
    }

    lastSentProfileRef.current = profile;
    updateProfile(profile);
  }, [updateProfile, user.avatar, user.id, user.name]);

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
    handleCallProfileUpdated: callHook.handleCallProfileUpdated,
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
        updateProfile: lobby.updateProfile,
        endCall: callHook.endCall,
        changeMuteStatus: callHook.changeMuteStatus,
        sendTextMessage: messages.sendTextMessage,
      }}
    >
      {props.children}
    </ChatNetworkContext>
  );
}
