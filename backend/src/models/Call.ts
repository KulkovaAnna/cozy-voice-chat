import { v4 } from 'uuid';
import type Client from './Client';
import type CallOffer from './CallOffer';
import Message from './Message';

export class Member {
  public client: Client;
  public online: boolean;
  public isMuted: boolean;
  public isSpeaking: boolean;
  public isScreenSharing: boolean;

  constructor(client: Client) {
    this.client = client;
    this.online = !!client.ws;
    this.isMuted = false;
    this.isSpeaking = false;
    this.isScreenSharing = false;
  }
}

export default class Call {
  public id: string;
  public members: Member[];
  public initiator: Client;
  public receiver: Client;
  public messages: Message[];

  constructor(callOffer: CallOffer) {
    this.id = v4();
    this.members = [
      new Member(callOffer.initiator),
      new Member(callOffer.receiver),
    ];
    this.initiator = callOffer.initiator;
    this.receiver = callOffer.receiver;
    this.messages = [];
  }

  /**
   * Добавляет сообщение в историю звонка
   * @param senderId - ID отправителя
   * @param text - текст сообщения
   * @param senderName - опционально имя отправителя
   * @param avatar - опционально аватар отправителя
   * @returns объект сообщения
   */
  addMessage(
    senderId: string,
    text: string,
    senderName: string | null = null,
    avatar: string | null = null,
  ): Message {
    const message = new Message(senderId, text, senderName, avatar);
    this.messages.push(message);
    return message;
  }
}
