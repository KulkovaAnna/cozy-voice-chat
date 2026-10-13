import type WebSocket from 'ws';
import type { IncomingWsMessage } from '../types';

/** Типизированные данные входящего сообщения */
export type MessageData = NonNullable<IncomingWsMessage['data']>;

/** Обработчик входящего сообщения */
export type MessageHandler = (
  ws: WebSocket,
  ip: string,
  data: MessageData,
) => void | Promise<void>;
