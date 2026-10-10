import type { WebSocket } from 'ws';
import type { IncomingMessage as HttpIncomingMessage } from 'http';

/** Сообщение, приходящее от клиента по WebSocket */
export interface IncomingWsMessage {
  type: string;
  data?: Record<string, unknown> & {
    /** ID клиента (используется при входе в лобби для сохранения прежнего id) */
    clientId?: string;
    personalInfo?: PersonalInfoData;
    receiverId?: string;
    offerId?: string;
    callId?: string;
    status?: boolean;
    text?: string;
  };
}

/** Стиль рамки аватара */
export type BorderStyle = 'none' | 'solid' | 'dashed' | 'dotted' | 'double';

/** Рамка аватара пользователя */
export interface AvatarBorderData {
  style: BorderStyle;
  color: string;
  width: number;
}

/** Тип фона карточки пользователя */
export type BackgroundType = 'none' | 'color' | 'image';

/** Фон карточки пользователя */
export interface CardBackgroundData {
  type: BackgroundType;
  color: string | null;
  image: string | null;
  imageOpacity: number;
}

/** Внешний вид карточек пользователя (лобби и звонок) */
export interface CardAppearanceData {
  background: CardBackgroundData;
  avatarBorder: AvatarBorderData;
  textColor: string | null;
  textShadow: boolean;
}

/** Персональные данные клиента, присылаемые при входе в лобби */
export interface PersonalInfoData {
  name?: string | null;
  avatar?: string | null;
  cardAppearance?: CardAppearanceData | null;
}

/** Любое исходящее сообщение */
export interface OutgoingMessage<T = unknown> {
  type: string;
  data?: T;
}

/** Тип сокета клиента */
export type ClientSocket = WebSocket;

/** Запрос на установление соединения (handshake) */
export type HandshakeRequest = HttpIncomingMessage;

/** Ошибка HTTP с номером статуса */
export interface HttpError extends Error {
  status?: number;
}

/** Статистика сервера */
export interface ServerStats {
  totalClients: number;
}
