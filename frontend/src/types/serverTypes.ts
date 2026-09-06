export type UserDTO = {
  id: string;
  ip: string;
  connectionDate: string;
  personalInfo: {
    name: string;
    avatar: string;
  };
};

export type CallMemberDTO = {
  client: UserDTO;
  isMuted: boolean;
  isSpeaking: boolean;
  online: boolean;
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
