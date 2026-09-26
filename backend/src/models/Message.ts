import { v4 } from 'uuid';

export default class Message {
  public id: string;
  public senderId: string;
  public text: string;
  public senderName: string | null;
  public timestamp: string;
  public avatar: string | null;

  /**
   * @param senderId - ID отправителя
   * @param text - текст сообщения
   * @param senderName - опционально имя отправителя
   * @param avatar - опционально аватар отправителя
   */
  constructor(
    senderId: string,
    text: string,
    senderName?: string | null,
    avatar?: string | null,
  ) {
    this.id = v4();
    this.senderId = senderId;
    this.text = text;
    this.senderName = senderName ?? null;
    this.timestamp = new Date().toISOString();
    this.avatar = avatar ?? null;
  }
}
