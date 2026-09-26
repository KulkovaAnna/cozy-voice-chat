export type UserProfile = {
  name: string;
  avatar: string;
  id?: string;
  isMe?: boolean;
};

export type CallMember = {
  member: UserProfile;
  isMuted: boolean;
  isSpeaking: boolean;
  online: boolean;
  isScreenSharing: boolean;
};

export type CallOffer = {
  id: string;
  initiator: UserProfile;
};

export type CallInfo = {
  id: string;
  initiator: UserProfile;
  receiver: UserProfile;
  members: CallMember[];
};

export type Attachment = {
  id: string;
  fileName: string;
  fileSize: number;
};

export type TextMessage = {
  id: string;
  senderId: string;
  message: string;
  timestamp: string;
  senderAvatar?: string;
  senderName?: string;
  attachment?: Attachment;
};
