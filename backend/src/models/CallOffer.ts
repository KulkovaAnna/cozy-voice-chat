import { v4 } from 'uuid';
import type Client from './Client';

/** Вид оффера: прямой звонок 1-на-1 или приглашение в групповую комнату */
export type CallOfferKind = 'direct' | 'room';

export interface CallOfferOptions {
  /** Тип оффера (по умолчанию — прямой звонок) */
  kind?: CallOfferKind;
  /** ID звонка, в который приглашают (только для room) */
  callId?: string | null;
  /** Код комнаты для приглашённого (только для room) */
  roomCode?: string | null;
}

export default class CallOffer {
  public id: string;
  public initiator: Client;
  public receiver: Client;
  public kind: CallOfferKind;
  public callId: string | null;
  public roomCode: string | null;

  constructor(
    initiator: Client,
    receiver: Client,
    options: CallOfferOptions = {},
  ) {
    this.id = v4();
    this.initiator = initiator;
    this.receiver = receiver;
    this.kind = options.kind ?? 'direct';
    this.callId = options.callId ?? null;
    this.roomCode = options.roomCode ?? null;
  }
}
