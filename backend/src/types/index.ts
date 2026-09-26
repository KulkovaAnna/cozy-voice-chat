import type { WebSocket } from 'ws';
import type { IncomingMessage as HttpIncomingMessage } from 'http';

/** Сообщение, приходящее от клиента по WebSocket */
export interface IncomingWsMessage {
  type: string;
  data?: Record<string, unknown> & {
    personalInfo?: PersonalInfoData;
    receiverId?: string;
    offerId?: string;
    callId?: string;
    status?: boolean;
    text?: string;
  };
}

/** Персональные данные клиента, присылаемые при входе в лобби */
export interface PersonalInfoData {
  name?: string | null;
  avatar?: string | null;
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
