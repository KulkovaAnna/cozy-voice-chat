import type {
  CallMember,
  UserProfile,
  CallMemberDTO,
  UserDTO,
  CallInfoDTO,
  CallInfo,
  MessageDto,
  TextMessage,
} from "../types";

export const userAdapter = (serverUser: UserDTO): UserProfile => {
  return {
    avatar: serverUser.personalInfo.avatar,
    name: serverUser.personalInfo.name,
    id: serverUser.id,
  };
};

export const memberAdapter = (serverMember: CallMemberDTO): CallMember => {
  return {
    member: userAdapter(serverMember.client),
    isMuted: serverMember.isMuted,
    isSpeaking: serverMember.isSpeaking,
    online: serverMember.online,
  };
};

export const callInfoAdapter = (serverCallInfo: CallInfoDTO): CallInfo => {
  return {
    id: serverCallInfo.id,
    initiator: userAdapter(serverCallInfo.initiator),
    receiver: userAdapter(serverCallInfo.receiver),
    members: serverCallInfo.members.map(memberAdapter),
  };
};

export const textMessageAdapter = (serverMsg: MessageDto): TextMessage => {
  return {
    id: serverMsg.id,
    message: serverMsg.text,
    senderId: serverMsg.senderId,
    senderName: serverMsg.senderName,
    timestamp: serverMsg.timestamp,
    senderAvatar: serverMsg.avatar,
  };
};
