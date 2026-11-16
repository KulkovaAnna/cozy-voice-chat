import type { CardAppearance } from "./settings";

export type UserProfile = {
  name: string;
  avatar?: string;
  id?: string;
  isMe?: boolean;
  cardAppearance?: CardAppearance | null;
};

export type CallMember = {
  member: UserProfile;
  isMuted: boolean;
  isSpeaking: boolean;
  online: boolean;
  isScreenSharing: boolean;
};

export type CallOfferKind = "direct" | "room";

export type CallOffer = {
  id: string;
  /** Прямой звонок 1-на-1 или приглашение в групповую комнату */
  kind: CallOfferKind;
  /** ID звонка, в который приглашают (только для room) */
  callId: string | null;
  /** Код комнаты для приглашения (только для room) */
  roomCode: string | null;
  initiator: UserProfile;
  /** Второй участник: для прямого звонка и для приглашения */
  receiver: UserProfile | null;
};

/** Отправленное, но ещё не принятое приглашение в комнату */
export type PendingRoomInvite = {
  /** ID оффера (null — приглашение отправлено, ответ сервера ещё не пришёл) */
  offerId: string | null;
  clientId: string;
};

export type CallType = "direct" | "group";

export type CallInfo = {
  id: string;
  /** Личный звонок 1-на-1 или групповая комната */
  type: CallType;
  /** Код комнаты (только для group) */
  roomCode: string | null;
  initiator: UserProfile;
  /** Второй участник личного звонка; в комнате отсутствует */
  receiver: UserProfile | null;
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
  isSystem?: boolean;
  attachments?: Attachment[];
};
