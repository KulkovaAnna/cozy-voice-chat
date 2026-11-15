import { v4 } from 'uuid';
import type Client from './Client';
import Message from './Message';
import type { FileAttachment } from '../types';

export type CallType = 'direct' | 'group';

export interface CallOptions {
  /** Тип звонка: личный (1-на-1) или групповая комната */
  type?: CallType;
  /** Код комнаты — есть только у групповых звонков */
  roomCode?: string | null;
}

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
  public type: CallType;
  public roomCode: string | null;
  public members: Member[];
  public initiator: Client;
  public receiver: Client | null;
  public messages: Message[];

  constructor(initiator: Client, members: Client[], options: CallOptions = {}) {
    this.id = v4();
    this.type = options.type ?? (options.roomCode ? 'group' : 'direct');
    this.roomCode = options.roomCode ?? null;
    this.members = members.map((client) => new Member(client));
    this.initiator = initiator;
    // Для личного звонка сохраняем второго участника отдельным полем:
    // фронтенд и часть протокола по-прежнему ожидают receiver.
    this.receiver =
      this.type === 'direct'
        ? (members.find((client) => client.id !== initiator.id) ?? null)
        : null;
    this.messages = [];
  }

  /** Проверяет, состоит ли клиент в звонке */
  hasMember(clientId: string): boolean {
    return this.members.some((member) => member.client.id === clientId);
  }

  /** Добавляет участника, если его ещё нет в звонке */
  addMember(client: Client): Member {
    const existing = this.members.find(
      (member) => member.client.id === client.id,
    );
    if (existing) return existing;

    const member = new Member(client);
    this.members.push(member);
    return member;
  }

  /** Удаляет участника из звонка */
  removeMember(clientId: string): Member | null {
    const index = this.members.findIndex(
      (member) => member.client.id === clientId,
    );
    if (index === -1) return null;

    return this.members.splice(index, 1)[0];
  }

  /**
   * Добавляет сообщение в историю звонка
   * @param senderId - ID отправителя
   * @param text - текст сообщения
   * @param senderName - опционально имя отправителя
   * @param avatar - опционально аватар отправителя
   * @param isSystem - системное сообщение (ответ бота)
   * @param attachments - прикреплённые файлы
   * @returns объект сообщения
   */
  addMessage(
    senderId: string,
    text: string,
    senderName: string | null = null,
    avatar: string | null = null,
    isSystem: boolean = false,
    attachments: FileAttachment[] = [],
  ): Message {
    const message = new Message(
      senderId,
      text,
      senderName,
      avatar,
      isSystem,
      attachments,
    );
    this.messages.push(message);
    return message;
  }
}
