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
