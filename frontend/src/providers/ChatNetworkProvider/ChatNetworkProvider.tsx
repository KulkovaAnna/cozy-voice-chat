import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { toast } from "react-toastify";

import { usePeer, useProfileSettings } from "@cvc/hooks";
import {
  callInfoAdapter,
  clearActiveRoom,
  isValidRoomCode,
  normalizeRoomCode,
  saveActiveRoom,
  textMessageAdapter,
} from "@cvc/utils";

import {
  clearAppBadge,
  notifyIncomingCall,
  requestNotificationPermission,
  setAppBadge,
} from "@cvc/utils/notifications";

import type {
  CardAppearance,
  CommandStatus,
  MessageDto,
  ServerMessage,
  TextMessage,
} from "@cvc/types";
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
  /** Готовность WS-лобби: до неё create-room/join-room нужно придержать */
  const lobbyReadyRef = useRef(false);
  const pendingJoinCodeRef = useRef<string | null>(null);
  const pendingCreateRoomRef = useRef(false);
  const [textMessages, setTextMessages] = useState<Array<TextMessage>>([]);
  const [commandStatus, setCommandStatus] = useState<CommandStatus | null>(
    null,
  );
  const [roomJoinError, setRoomJoinError] = useState<string | null>(null);
  const clearRoomJoinError = useCallback(() => setRoomJoinError(null), []);

  const { user, updateUser } = useAuth();

  const {
    isCallActive,
    localAudioStream,
    remoteStreams,
    localScreenStream,
    remoteScreenStream,
    initialize,
    callToUser: peerCallToUser,
    connectToMembers,
    disconnectMembers,
    addScreenShareTarget,
    endCall: peerEndCall,
    switchMicState,
    startScreenShare,
    stopScreenShare,
    setOnRemoteScreenStream,
    setOnLocalScreenStop,
  } = usePeer();

  const send = useCallback((type: string, data: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify({ type, data }));
  }, []);

  /** Создаёт комнату; если WS ещё не готов, запрос ждёт lobby::joined */
  const createRoom = useCallback(() => {
    pendingJoinCodeRef.current = null;
    setRoomJoinError(null);

    if (lobbyReadyRef.current) {
      send("lobby::create-room", {});
      return;
    }
    pendingCreateRoomRef.current = true;
  }, [send]);

  /** Вход в комнату по коду/ссылке с ожиданием готовности WS */
  const joinRoomByCode = useCallback(
    (code: string) => {
      const normalized = normalizeRoomCode(code);

      if (!isValidRoomCode(normalized)) {
        toast("Код комнаты должен состоять из 6 символов: A-Z и 0-9", {
          type: "error",
        });
        return;
      }

      pendingCreateRoomRef.current = false;
      setRoomJoinError(null);

      if (lobbyReadyRef.current) {
        send("lobby::join-room", { code: normalized });
        return;
      }

      pendingJoinCodeRef.current = normalized;
    },
    [send],
  );

  const peerRef = useRef({
    callToUser: peerCallToUser,
    connectToMembers,
    disconnectMembers,
    addScreenShareTarget,
    endCall: peerEndCall,
    switchMicState,
  });

  useEffect(() => {
    peerRef.current = {
      callToUser: peerCallToUser,
      connectToMembers,
      disconnectMembers,
      addScreenShareTarget,
      endCall: peerEndCall,
      switchMicState,
    };
  }, [
    peerCallToUser,
    connectToMembers,
    disconnectMembers,
    addScreenShareTarget,
    peerEndCall,
    switchMicState,
  ]);

  const lobby = useChatLobby({ user, send });
  const callHook = useChatCall({ user, send, peerRef });

  const playMusic = useCallback(() => {
    const call = callHook.callInfoRef.current;
    if (!call) return;
    send("call::music-play", { callId: call.id });
  }, [send, callHook.callInfoRef]);

  const pauseMusic = useCallback(() => {
    const call = callHook.callInfoRef.current;
    if (!call) return;
    send("call::music-pause", { callId: call.id });
  }, [send, callHook.callInfoRef]);

  const stopMusic = useCallback(() => {
    const call = callHook.callInfoRef.current;
    if (!call) return;
    send("call::music-stop", { callId: call.id });
  }, [send, callHook.callInfoRef]);

  /**
   * Переключение трека в очереди. expectedIndex — трек, который видит
   * клиент: сервер пропустит переключение, если очередь уже сдвинулась.
   */
  const nextMusic = useCallback(
    (expectedIndex: number) => {
      const call = callHook.callInfoRef.current;
      if (!call) return;
      send("call::music-next", { callId: call.id, expectedIndex });
    },
    [send, callHook.callInfoRef],
  );

  const prevMusic = useCallback(
    (expectedIndex: number) => {
      const call = callHook.callInfoRef.current;
      if (!call) return;
      send("call::music-prev", { callId: call.id, expectedIndex });
    },
    [send, callHook.callInfoRef],
  );

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
    isCallActive,
    localAudioStream,
    onSpeakingChange: callHook.changeIsSpeakingState,
  });

  const onMeLobbyJoined = useCallback(
    (meId: string) => {
      updateUser({ id: meId });
      initialize(meId);
      lobbyReadyRef.current = true;

      // Запросы, сделанные до открытия WS (например, по ссылке /join/CODE)
      if (pendingJoinCodeRef.current) {
        send("lobby::join-room", { code: pendingJoinCodeRef.current });
        pendingJoinCodeRef.current = null;
      } else if (pendingCreateRoomRef.current) {
        send("lobby::create-room", {});
        pendingCreateRoomRef.current = false;
      }
    },
    [initialize, send, updateUser],
  );

  // Счётчик сообщений, пришедших, пока вкладка была скрыта.
  const unreadCount = useRef(0);

  const handleCallEnded = useCallback(() => {
    callHook.handleCallEnded();
    clearActiveRoom();
    setRoomJoinError(null);
    setTextMessages([]);
    setCommandStatus(null);
    unreadCount.current = 0;
    clearAppBadge();
  }, [callHook]);

  /**
   * Стадия выполнения моей слэш-команды. Приходит только инициатору,
   * поэтому состояние держим локально и не кладём в историю сообщений.
   */
  const handleCommandStatus = useCallback((data: ServerMessage) => {
    const status = (data.data as { status?: string })?.status;
    if (status === "done") {
      setCommandStatus(null);
      return;
    }
    setCommandStatus(data.data as unknown as CommandStatus);
  }, []);

  const handleMusicStateChanged = useCallback((data: ServerMessage) => {
    window.dispatchEvent(
      new CustomEvent("music::state-changed", { detail: data }),
    );
  }, []);

  /** Любой запуск звонка: запоминаем комнату для восстановления после F5 */
  const handleCallStarted = useCallback(
    (data: ServerMessage) => {
      callHook.handleCallStarted(data);

      const info = callInfoAdapter(data.data.callInfo);

      if (info.type === "group" && info.roomCode) {
        saveActiveRoom(info.id, info.roomCode);
        setRoomJoinError(null);
        return;
      }

      if (info.type === "direct") {
        clearActiveRoom();
      }
    },
    [callHook],
  );

  /** Вход в комнату: поднимаем callInfo и восстанавливаем историю чата */
  const handleRoomJoined = useCallback(
    (data: ServerMessage) => {
      handleCallStarted(data);

      const rawMessages = Array.isArray(data.data.messages)
        ? (data.data.messages as MessageDto[])
        : [];

      setTextMessages(rawMessages.map((message) => textMessageAdapter(message)));
    },
    [handleCallStarted],
  );

  /** Выход из комнаты по кнопке: сразу чистим локальное состояние */
  const leaveCall = useCallback(() => {
    callHook.leaveCall();
    clearActiveRoom();
    setRoomJoinError(null);
    setTextMessages([]);
    setCommandStatus(null);
  }, [callHook]);

  const profileSettings = useProfileSettings();

  const lastSentProfileRef = useRef<{
    name: string;
    avatar: string | null;
    cardAppearance: CardAppearance;
  } | null>(null);

  const { updateProfile } = lobby;

  useEffect(() => {
    if (!user.id) return;
    if (socketRef.current?.readyState !== WebSocket.OPEN) return;

    const profile = {
      name: user.name,
      avatar: profileSettings.avatar,
      cardAppearance: profileSettings.cardAppearance,
    };
    const lastSent = lastSentProfileRef.current;

    if (!lastSent) {
      lastSentProfileRef.current = profile;
      return;
    }

    if (
      lastSent.name === profile.name &&
      lastSent.avatar === profile.avatar &&
      lastSent.cardAppearance === profile.cardAppearance
    ) {
      return;
    }

    lastSentProfileRef.current = profile;
    updateProfile(profile);
  }, [profileSettings, updateProfile, user.id, user.name]);

  // ── Нативные уведомления и значок непрочитанных ────────────────────────
  // Push-сервис не используем: о звонке и сообщениях нам говорит наш же WS,
  // поэтому достаточно Notification API прямо со страницы.

  /**
   * Входящий звонок — системное уведомление. Разрешение запрашиваем лениво,
   * в момент реального вызова, а не при заходе на страницу.
   */
  const handleCallOffer = useCallback(
    (data: ServerMessage) => {
      lobby.handleCallOffer(data);

      // me::call-initiated — это наш собственный исходящий звонок,
      // уведомлять нас о нём не за чем.
      if (data.type !== "me::call-offer") return;

      void requestNotificationPermission().then((permission) => {
        if (permission !== "granted") return;
        const initiator = data.data.callOffer?.initiator;
        notifyIncomingCall(initiator?.name ?? "Собеседник");
      });
    },
    [lobby],
  );

  /** Сообщения, пришедшие в фоновую вкладку, считаем непрочитанными. */
  const handleNewMessage = useCallback(
    (data: ServerMessage) => {
      messages.handleNewMessage(data);
      if (!document.hidden) return;
      unreadCount.current += 1;
      setAppBadge(unreadCount.current);
    },
    [messages],
  );

  /**
   * Ошибки от сервера (занят, не найден, rate limit) — показываем как toast.
   * Сервер шлёт type="error" с data.message — текст уже на русском.
   */
  const handleError = useCallback((data: ServerMessage) => {
    const message =
      typeof data.data?.message === "string"
        ? data.data.message
        : "Что-то пошло не так";
    toast(message, { type: "error" });

    const isRoomError = [
      "Комната не найдена",
      "Некорректный код комнаты",
      "Комната заполнена",
      "Вы уже в звонке",
    ].some((fragment) => message.includes(fragment));

    if (isRoomError) {
      setRoomJoinError(message);
    }

    if (
      message.includes("Комната не найдена") ||
      message.includes("Некорректный код комнаты") ||
      message.includes("Комната заполнена")
    ) {
      clearActiveRoom();
    }
  }, []);

  // Вернулись во вкладку — значок больше не нужен.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) return;
      unreadCount.current = 0;
      clearAppBadge();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const { route } = useChatMessageRouter({
    handleLobbyJoined: lobby.handleLobbyJoined,
    onMeLobbyJoined,
    handleCallOffer,
    handleCallOfferDeclined: lobby.handleCallOfferDeclined,
    setCallOfferNull: lobby.clearCallOffer,
    handleCallStarted,
    handleRoomJoined,
    handleMemberJoined: callHook.handleMemberJoined,
    handleMemberLeft: callHook.handleMemberLeft,
    handleCallEnded,
    handleOnlineChanged: callHook.handleOnlineChanged,
    handleCallStateChanged: callHook.handleCallStateChanged,
    handleCallProfileUpdated: callHook.handleCallProfileUpdated,
    handleNewMessage,
    handleMusicStateChanged,
    handleCommandStatus,
    handleError,
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
        remoteStreams,
        commandStatus,
        roomJoinError,
        clearRoomJoinError,
        beginScreenShare,
        endScreenShare,
        playMusic,
        pauseMusic,
        stopMusic,
        nextMusic,
        prevMusic,
        joinToLobby: lobby.joinToLobby,
        callToUser: lobby.callToUser,
        acceptCallOffer: lobby.acceptCallOffer,
        declineCallOffer: lobby.declineCallOffer,
        updateProfile: lobby.updateProfile,
        createRoom,
        joinRoomByCode,
        endCall: callHook.endCall,
        leaveCall,
        changeMuteStatus: callHook.changeMuteStatus,
        sendTextMessage: messages.sendTextMessage,
      }}
    >
      {props.children}
    </ChatNetworkContext>
  );
}
