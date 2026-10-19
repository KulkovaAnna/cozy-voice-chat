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
  /** Текущая стадия выполнения слэш-команды (только для моих команд) */
  commandStatus: CommandStatus | null;
  joinToLobby: VoidFunction;
  callToUser: (uid: string) => void;
  acceptCallOffer: VoidFunction;
  declineCallOffer: VoidFunction;
  updateProfile: (personalInfo?: Partial<ProfilePayload>) => void;
  endCall: VoidFunction;
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
  localScreenStream: null,
  isMyUserScreenSharing: false,
  commandStatus: null,
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
  endCall: () => {},
  changeMuteStatus: () => {},
  sendTextMessage: () => {},
});
