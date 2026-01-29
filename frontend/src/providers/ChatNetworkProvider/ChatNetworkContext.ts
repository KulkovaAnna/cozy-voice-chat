import { createContext, type Dispatch, type SetStateAction } from "react";
import type { UserProfile } from "../../types";

export type ChatNetworkContextType = {
  roomId?: string;
  setRoomId: Dispatch<SetStateAction<string | undefined>>;
  userList?: Array<UserProfile>;
  roomJoined: boolean;
  createRoom: VoidFunction;
  joinToRoom: (data: {
    roomId?: string;
    userName: string;
    [k: string]: any;
  }) => void;
  leaveRoom: VoidFunction;
};

export const ChatNetworkContext = createContext<ChatNetworkContextType>({
  setRoomId: () => {},
  roomJoined: false,
  userList: [],
  createRoom: () => {},
  joinToRoom: () => {},
  leaveRoom: () => {},
});
