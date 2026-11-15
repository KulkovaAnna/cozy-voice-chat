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
  clearActiveCall,
  isValidRoomCode,
  lobbyRetryDelay,
  normalizeRoomCode,
  saveActiveCall,
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
import {
  ChatNetworkContext,
  type CallRestoreState,
  type LobbyJoinError,
} from "./ChatNetworkContext";
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
  const pendingRejoinCallRef = useRef<string | null>(null);
  const [callRestoreState, setCallRestoreState] =
    useState<CallRestoreState>("idle");
  /** Ключ последнего сохранённого в sessionStorage звонка */
  const savedCallKeyRef = useRef<string | null>(null);
  const [textMessages, setTextMessages] = useState<Array<TextMessage>>([]);
  /** Растёт при подмене списка сообщений (история комнаты или очистка) */
  const [textMessagesEpoch, setTextMessagesEpoch] = useState(0);
  const [commandStatus, setCommandStatus] = useState<CommandStatus | null>(
    null,
  );
  const [roomJoinError, setRoomJoinError] = useState<string | null>(null);
  const clearRoomJoinError = useCallback(() => setRoomJoinError(null), []);
  const [lobbyJoinError, setLobbyJoinError] = useState<LobbyJoinError | null>(
    null,
  );
  const lobbyJoinErrorShownRef = useRef(false);
  const lobbyRetryAttemptRef = useRef(0);

  /**
   * Заменяет список сообщений целиком (история комнаты или очистка). Эпоха
   * помогает потребителям понять, что это не новые сообщения: реакции не
   * проигрываются, счётчик непрочитанных не растёт.
   */
  const replaceTextMessages = useCallback((next: Array<TextMessage>) => {
    setTextMessages(next);
    setTextMessagesEpoch((prev) => prev + 1);
  }, []);

  const { user, updateUser } = useAuth();

  const {
    isCallActive,
    localAudioStream,
    remoteStreams,
    localScreenStream,
    remoteScreenStream,
    initialize,
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

  /** Забывает активный звонок и сбрасывает сохранённый ключ */
  const clearActiveCallState = useCallback(() => {
    savedCallKeyRef.current = null;
    clearActiveCall();
  }, []);

  /** Создаёт комнату; если WS ещё не готов, запрос ждёт lobby::joined */
  const createRoom = useCallback(() => {
    pendingJoinCodeRef.current = null;
    pendingRejoinCallRef.current = null;
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
      pendingRejoinCallRef.current = null;
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
    connectToMembers,
    disconnectMembers,
    addScreenShareTarget,
    endCall: peerEndCall,
    switchMicState,
  });

  useEffect(() => {
    peerRef.current = {
      connectToMembers,
      disconnectMembers,
      addScreenShareTarget,
      endCall: peerEndCall,
      switchMicState,
    };
  }, [
    connectToMembers,
    disconnectMembers,
    addScreenShareTarget,
    peerEndCall,
    switchMicState,
  ]);

  const lobby = useChatLobby({ user, send });
  const callHook = useChatCall({ user, send, peerRef });

  /**
   * Возврат в звонок после F5. Запрос отправляется, когда WS-лобби готов,
   * иначе ждёт me::lobby-joined.
   */
  const restoreCall = useCallback(
    (callId: string) => {
      if (!callId) return;

      pendingJoinCodeRef.current = null;
      pendingCreateRoomRef.current = false;
      pendingRejoinCallRef.current = callId;
      setCallRestoreState("pending");

      if (lobbyReadyRef.current) {
        send("call::rejoin", { callId });
      }
    },
    [send],
  );

  /** Превращает текущий 1-на-1 в групповую комнату (необратимо) */
  const convertToRoom = useCallback(() => {
    const call = callHook.callInfoRef.current;
    if (!call || call.roomCode) return;
    send("call::convert-to-room", { callId: call.id });
  }, [callHook.callInfoRef, send]);

  /** Запоминаем звонок для восстановления после F5 */
  useEffect(() => {
    const call = callHook.callInfo;
    if (!call) return;

    const key = `${call.id}:${call.roomCode ?? ""}`;
    if (savedCallKeyRef.current === key) return;

    savedCallKeyRef.current = key;
    saveActiveCall(call.id, call.roomCode);
  }, [callHook.callInfo]);

  const handleLobbyJoinRejected = useCallback((data: ServerMessage) => {
    const message =
      typeof data.data?.message === "string"
        ? data.data.message
        : "С этого устройства уже есть участник в лобби";

    // Авто-повторы приносят тот же отказ — не спамим тостами
    if (!lobbyJoinErrorShownRef.current) {
      lobbyJoinErrorShownRef.current = true;
      toast(message, { type: "error" });
    }

    setLobbyJoinError((prev) =>
      prev?.message === message
        ? prev
        : {
            message,
            existingClientName:
              typeof data.data?.existingClientName === "string"
                ? data.data.existingClientName
                : null,
          },
    );
  }, []);

  const joinToLobby = lobby.joinToLobby;

  const retryJoinLobby = useCallback(() => {
    lobbyRetryAttemptRef.current = 0;
    joinToLobby();
  }, [joinToLobby]);

  const dismissLobbyJoinError = useCallback(() => {
    lobbyJoinErrorShownRef.current = false;
    lobbyRetryAttemptRef.current = 0;
    setLobbyJoinError(null);
  }, []);

  useEffect(() => {
    if (!lobbyJoinError) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleRetry = () => {
      timer = setTimeout(() => {
        if (socketRef.current?.readyState !== WebSocket.OPEN) return;
        joinToLobby();
        lobbyRetryAttemptRef.current += 1;
        scheduleRetry();
      }, lobbyRetryDelay(lobbyRetryAttemptRef.current));
    };

    scheduleRetry();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [joinToLobby, lobbyJoinError]);

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

      lobbyJoinErrorShownRef.current = false;
      lobbyRetryAttemptRef.current = 0;
      setLobbyJoinError(null);

      // Запросы, сделанные до открытия WS (например, по ссылке /join/CODE)
      if (pendingJoinCodeRef.current) {
        send("lobby::join-room", { code: pendingJoinCodeRef.current });
        pendingJoinCodeRef.current = null;
      } else if (pendingCreateRoomRef.current) {
        send("lobby::create-room", {});
        pendingCreateRoomRef.current = false;
      } else if (pendingRejoinCallRef.current) {
        // F5 в активном звонке: возвращаемся по callId
        send("call::rejoin", { callId: pendingRejoinCallRef.current });
      }
    },
    [initialize, send, updateUser],
  );

  // Счётчик сообщений, пришедших, пока вкладка была скрыта.
  const unreadCount = useRef(0);

  const handleCallEnded = useCallback(() => {
    callHook.handleCallEnded();
    pendingRejoinCallRef.current = null;
    setCallRestoreState("idle");
    clearActiveCallState();
    setRoomJoinError(null);
    replaceTextMessages([]);
    setCommandStatus(null);
    unreadCount.current = 0;
    clearAppBadge();
  }, [callHook, clearActiveCallState, replaceTextMessages]);

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

  /** Любой запуск звонка: callInfo обновляется, звонок сохранит эффект выше */
  const handleCallStarted = useCallback(
    (data: ServerMessage) => {
      callHook.handleCallStarted(data);
      setCallRestoreState("idle");
      pendingRejoinCallRef.current = null;
      setRoomJoinError(null);
    },
    [callHook],
  );

  /**
   * Звонок превращён в групповую комнату. Код приходит всем участникам;
   * инициатору показываем тост, чтобы он сразу мог поделиться ссылкой.
   */
  const handleCallRoomCreated = useCallback(
    (data: ServerMessage) => {
      callHook.handleCallStateChanged(data);

      const info = callInfoAdapter(data.data.callInfo);
      if (info.roomCode) {
        saveActiveCall(info.id, info.roomCode);
        savedCallKeyRef.current = `${info.id}:${info.roomCode}`;
      }

      if (data.data.createdBy === user.id) {
        toast(`Теперь это комната ${info.roomCode}`, {
          type: "success",
        });
      }
    },
    [callHook, user.id],
  );

  /** Вход в комнату: поднимаем callInfo и восстанавливаем историю чата */
  const handleRoomJoined = useCallback(
    (data: ServerMessage) => {
      handleCallStarted(data);

      const rawMessages = Array.isArray(data.data.messages)
        ? (data.data.messages as MessageDto[])
        : [];

      // История — не новые сообщения: эпоха списка растёт, реакции и счётчик
      // непрочитанных на ней не срабатывают.
      replaceTextMessages(
        rawMessages.map((message) => textMessageAdapter(message)),
      );
    },
    [handleCallStarted, replaceTextMessages],
  );

  /** Выход из комнаты по кнопке: сразу чистим локальное состояние */
  const leaveCall = useCallback(() => {
    callHook.leaveCall();
    pendingRejoinCallRef.current = null;
    setCallRestoreState("idle");
    clearActiveCallState();
    setRoomJoinError(null);
    replaceTextMessages([]);
    setCommandStatus(null);
  }, [callHook, clearActiveCallState, replaceTextMessages]);

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
  const handleError = useCallback(
    (data: ServerMessage) => {
      const message =
        typeof data.data?.message === "string"
          ? data.data.message
          : "Что-то пошло не так";
      toast(message, { type: "error" });

      // Возврат в звонок не удался: показываем ошибку на странице звонка
      const isRejoinError = [
        "Звонок не найден",
        "Вы не участник этого звонка",
        "Комната заполнена",
        "Вы не в лобби",
        "Вы уже в звонке",
      ].some((fragment) => message.includes(fragment));

      if (pendingRejoinCallRef.current && isRejoinError) {
        pendingRejoinCallRef.current = null;
        setCallRestoreState("failed");
        clearActiveCallState();
        return;
      }

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
        clearActiveCallState();
      }
    },
    [clearActiveCallState],
  );

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
    handleLobbyJoinRejected,
    handleCallOffer,
    handleCallOfferDeclined: lobby.handleCallOfferDeclined,
    setCallOfferNull: lobby.clearCallOffer,
    handleCallStarted,
    handleCallRoomCreated,
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
        textMessagesEpoch,
        isMyUserScreenSharing: callHook.isMyUserScreenSharing,
        localScreenStream,
        remoteScreenStream,
        remoteStreams,
        commandStatus,
        roomJoinError,
        clearRoomJoinError,
        lobbyJoinError,
        retryJoinLobby,
        dismissLobbyJoinError,
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
        convertToRoom,
        restoreCall,
        callRestoreState,
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
