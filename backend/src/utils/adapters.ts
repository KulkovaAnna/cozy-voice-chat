import type Client from '../models/Client';

export interface ClientUserDto {
  id: string;
  additionalInfo: unknown;
  isMe: boolean;
  joinedAt: string;
}

export default class Adapters {
  static getClientUser(
    recieverId: string,
  ): (user: Client & { additionalInfo?: unknown; joinedAt?: string }) => ClientUserDto {
    return function (user) {
      return {
        id: user.id,
        additionalInfo: user.additionalInfo,
        isMe: user.id === recieverId,
        joinedAt: user.joinedAt as string,
      };
    };
  }
}
