const { v4 } = require('uuid');

class Message {
  /**
   * @param {string} senderId - ID отправителя
   * @param {string} text - текст сообщения
   * @param {string} senderName - опционально имя отправителя
   */
  constructor(senderId, text, senderName) {
    this.id = v4();
    this.senderId = senderId;
    this.text = text;
    this.senderName = senderName;
    this.timestamp = new Date().toISOString();
  }
}

module.exports = Message;
