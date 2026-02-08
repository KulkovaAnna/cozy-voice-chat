import { createContext } from "react";
import type { CallInfo, CallOffer, UserProfile } from "../../types";

export type ChatNetworkContextType = {
  lobbyMembers?: Array<UserProfile>;
  callOffer: CallOffer | null;
  callInfo: CallInfo | null;
  isMyUserMuted: boolean;
  joinToLobby: VoidFunction;
  callToUser: (uid: string) => void;
  acceptCallOffer: VoidFunction;
  declineCallOffer: VoidFunction;
  endCall: VoidFunction;
  changeMuteStatus: (status: boolean) => void;
};

export const ChatNetworkContext = createContext<ChatNetworkContextType>({
  lobbyMembers: [],
  callOffer: null,
  callInfo: null,
  isMyUserMuted: false,
  joinToLobby: () => {},
  callToUser: () => {},
  acceptCallOffer: () => {},
  declineCallOffer: () => {},
  endCall: () => {},
  changeMuteStatus: () => {},
});
