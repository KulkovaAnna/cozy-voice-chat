import { createContext } from "react";
import type {
  CallInfo,
  CallOffer,
  PendingRoomInvite,
  TextMessage,
  UserProfile,
} from "@cvc/types";
import type { CommandStatus } from "@cvc/types";
import type { ProfilePayload } from "./hooks/useChatLobby";

export type LobbyJoinError = {
  message: string;
  existingClientName: string | null;
};

/** Состояние возврата в звонок после F5 / обрыва */
export type CallRestoreState = "idle" | "pending" | "failed";

export type ChatNetworkContextType = {
  lobbyMembers?: Array<UserProfile>;
  callOffer: CallOffer | null;
  callInfo: CallInfo | null;
  isMyUserMuted: boolean;
  isMyUserScreenSharing: boolean;
  textMessages: TextMessage[];
  /**
   * Счётчик подмены списка сообщений: растёт, когда история комнаты загружена
   * или чат очищен. Позволяет отличить историю от новых сообщений.
   */
  textMessagesEpoch: number;
  localScreenStream: MediaStream | null;
  remoteScreenStream: MediaStream | null;
  /** Аудиопотоки удалённых участников по их clientId (mesh) */
  remoteStreams: Map<string, MediaStream>;
  /** Текущая стадия выполнения слэш-команды (только для моих команд) */
  commandStatus: CommandStatus | null;
  roomJoinError: string | null;
  clearRoomJoinError: VoidFunction;
  lobbyJoinError: LobbyJoinError | null;
  retryJoinLobby: VoidFunction;
  dismissLobbyJoinError: VoidFunction;
  joinToLobby: VoidFunction;
  callToUser: (uid: string) => void;
  acceptCallOffer: VoidFunction;
  declineCallOffer: VoidFunction;
  updateProfile: (personalInfo?: Partial<ProfilePayload>) => void;
  /** Создать групповую комнату */
  createRoom: VoidFunction;
  /** Войти в комнату по коду */
  joinRoomByCode: (code: string) => void;
  /** Пригласить участника лобби в текущую комнату */
  inviteToRoom: (receiverId: string) => void;
  /** Приглашения в комнату, ожидающие ответа получателей */
  pendingInvites: PendingRoomInvite[];
  /** Превратить текущий 1-на-1 в групповую комнату */
  convertToRoom: VoidFunction;
  /** Вернуться в активный звонок по callId после F5 */
  restoreCall: (callId: string) => void;
  /** Стадия восстановления звонка */
  callRestoreState: CallRestoreState;
  endCall: VoidFunction;
  /** Покинуть звонок: в комнате — только для себя */
  leaveCall: VoidFunction;
  changeMuteStatus: (status: boolean) => void;
  sendTextMessage: (text: string) => void;
  beginScreenShare: VoidFunction;
  endScreenShare: VoidFunction;
  playMusic: VoidFunction;
  pauseMusic: VoidFunction;
  stopMusic: VoidFunction;
  /** Переключить на следующий трек в очереди */
  nextMusic: (expectedIndex: number) => void;
  /** Переключить на предыдущий трек в очереди */
  prevMusic: (expectedIndex: number) => void;
};

export const ChatNetworkContext = createContext<ChatNetworkContextType>({
  lobbyMembers: [],
  callOffer: null,
  callInfo: null,
  isMyUserMuted: false,
  textMessages: [],
  textMessagesEpoch: 0,
  remoteScreenStream: null,
  remoteStreams: new Map(),
  localScreenStream: null,
  isMyUserScreenSharing: false,
  commandStatus: null,
  roomJoinError: null,
  clearRoomJoinError: () => {},
  lobbyJoinError: null,
  retryJoinLobby: () => {},
  dismissLobbyJoinError: () => {},
  beginScreenShare: () => {},
  endScreenShare: () => {},
  playMusic: () => {},
  pauseMusic: () => {},
  stopMusic: () => {},
  nextMusic: () => {},
  prevMusic: () => {},
  joinToLobby: () => {},
  callToUser: () => {},
  acceptCallOffer: () => {},
  declineCallOffer: () => {},
  updateProfile: () => {},
  createRoom: () => {},
  joinRoomByCode: () => {},
  inviteToRoom: () => {},
  pendingInvites: [],
  convertToRoom: () => {},
  restoreCall: () => {},
  callRestoreState: "idle",
  endCall: () => {},
  leaveCall: () => {},
  changeMuteStatus: () => {},
  sendTextMessage: () => {},
});
