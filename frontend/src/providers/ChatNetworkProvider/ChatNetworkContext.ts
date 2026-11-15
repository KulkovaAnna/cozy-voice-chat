import { createContext } from "react";
import type { CallInfo, CallOffer, TextMessage, UserProfile } from "@cvc/types";
import type { CommandStatus } from "@cvc/types";
import type { ProfilePayload } from "./hooks/useChatLobby";

export type ChatNetworkContextType = {
  lobbyMembers?: Array<UserProfile>;
  callOffer: CallOffer | null;
  callInfo: CallInfo | null;
  isMyUserMuted: boolean;
  isMyUserScreenSharing: boolean;
  textMessages: TextMessage[];
  localScreenStream: MediaStream | null;
  remoteScreenStream: MediaStream | null;
  /** Аудиопотоки удалённых участников по их clientId (mesh) */
  remoteStreams: Map<string, MediaStream>;
  /** Текущая стадия выполнения слэш-команды (только для моих команд) */
  commandStatus: CommandStatus | null;
  roomJoinError: string | null;
  clearRoomJoinError: VoidFunction;
  joinToLobby: VoidFunction;
  callToUser: (uid: string) => void;
  acceptCallOffer: VoidFunction;
  declineCallOffer: VoidFunction;
  updateProfile: (personalInfo?: Partial<ProfilePayload>) => void;
  /** Создать групповую комнату */
  createRoom: VoidFunction;
  /** Войти в комнату по коду */
  joinRoomByCode: (code: string) => void;
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
  remoteScreenStream: null,
  remoteStreams: new Map(),
  localScreenStream: null,
  isMyUserScreenSharing: false,
  commandStatus: null,
  roomJoinError: null,
  clearRoomJoinError: () => {},
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
  endCall: () => {},
  leaveCall: () => {},
  changeMuteStatus: () => {},
  sendTextMessage: () => {},
});
