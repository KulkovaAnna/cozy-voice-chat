import { createContext } from "react";
import type { CallInfo, CallOffer, TextMessage, UserProfile } from "@cvc/types";
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
  beginScreenShare: () => {},
  endScreenShare: () => {},
  joinToLobby: () => {},
  callToUser: () => {},
  acceptCallOffer: () => {},
  declineCallOffer: () => {},
  updateProfile: () => {},
  endCall: () => {},
  changeMuteStatus: () => {},
  sendTextMessage: () => {},
});
