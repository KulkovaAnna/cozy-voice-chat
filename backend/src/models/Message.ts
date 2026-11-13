import { v4 } from 'uuid';
import type { FileAttachment } from '../types';

export default class Message {
  public id: string;
  public senderId: string;
  public text: string;
  public senderName: string | null;
  public timestamp: string;
  public avatar: string | null;
  public isSystem: boolean;
  public attachments: FileAttachment[];

  /**
   * @param senderId - ID отправителя
   * @param text - текст сообщения
   * @param senderName - опционально имя отправителя
   * @param avatar - опционально аватар отправителя
   * @param isSystem - системное сообщение (ответ бота)
   * @param attachments - прикреплённые файлы
   */
  constructor(
    senderId: string,
    text: string,
    senderName?: string | null,
    avatar?: string | null,
    isSystem?: boolean,
    attachments: FileAttachment[] = [],
  ) {
    this.id = v4();
    this.senderId = senderId;
    this.text = text;
    this.senderName = senderName ?? null;
    this.timestamp = new Date().toISOString();
    this.avatar = avatar ?? null;
    this.isSystem = isSystem ?? false;
    this.attachments = attachments;
  }
}
