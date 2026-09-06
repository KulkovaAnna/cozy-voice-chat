const { v4 } = require('uuid');

class Message {
  /**
   * @param {string} senderId - ID отправителя
   * @param {string} text - текст сообщения
   * @param {string} senderName - опционально имя отправителя
   * @param {string} avatar - опционально аватар отправителя
   */
  constructor(senderId, text, senderName, avatar) {
    this.id = v4();
    this.senderId = senderId;
    this.text = text;
    this.senderName = senderName;
    this.timestamp = new Date().toISOString();
    this.avatar = avatar;
  }
}

module.exports = Message;
