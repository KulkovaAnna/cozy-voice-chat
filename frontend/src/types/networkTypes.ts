export type UserProfile = {
  name: string;
  avatar: string;
  id: string;
  isMe: boolean;
  micMuted?: boolean;
};

export type JoinedRoomData = {
  data: {
    clients: Array<ClientData>;
  };
  roomId: "string";
  type: "string";
};

export type ClientData = {
  additionalInfo: {
    userName: string;
    avatar: string;
  };
  id: string;
  joinedAt: string;
  isMe: boolean;
};
