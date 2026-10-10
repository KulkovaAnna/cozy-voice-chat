import type { CardAppearance } from "./settings";

export type UserDTO = {
  id: string;
  ip: string;
  connectionDate: string;
  personalInfo: {
    name: string;
    avatar: string;
    cardAppearance?: CardAppearance | null;
  };
};

export type CallMemberDTO = {
  client: UserDTO;
  isMuted: boolean;
  isSpeaking: boolean;
  online: boolean;
  isScreenSharing: boolean;
};

export type CallInfoDTO = {
  id: string;
  initiator: UserDTO;
  members: CallMemberDTO[];
  receiver: UserDTO;
};

export type MessageDto = {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  senderName?: string;
  avatar?: string;
};

export type FileInfoDTO = {
  fileId: string;
  originalName: string;
  size: number;
  timestamp: string;
  senderInfo: {
    id: string;
    name: string;
    avatar: string;
  };
};

export type ServerMessage = {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
};
