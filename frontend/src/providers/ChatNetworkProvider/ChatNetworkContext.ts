import { createContext } from "react";
import type {
  CallInfo,
  CallOffer,
  TextMessage,
  UserProfile,
} from "../../types";

export type ChatNetworkContextType = {
  lobbyMembers?: Array<UserProfile>;
  callOffer: CallOffer | null;
  callInfo: CallInfo | null;
  isMyUserMuted: boolean;
  textMessages: TextMessage[];
  joinToLobby: VoidFunction;
  callToUser: (uid: string) => void;
  acceptCallOffer: VoidFunction;
  declineCallOffer: VoidFunction;
  endCall: VoidFunction;
  changeMuteStatus: (status: boolean) => void;
  sendTextMessage: (text: string) => void;
};

export const ChatNetworkContext = createContext<ChatNetworkContextType>({
  lobbyMembers: [],
  callOffer: null,
  callInfo: null,
  isMyUserMuted: false,
  textMessages: [],
  joinToLobby: () => {},
  callToUser: () => {},
  acceptCallOffer: () => {},
  declineCallOffer: () => {},
  endCall: () => {},
  changeMuteStatus: () => {},
  sendTextMessage: () => {},
});
