const { v4 } = require('uuid');
const CallOffer = require('./CallOffer');
const Client = require('./Client');
const Message = require('./Message');

class Member {
  /**
   * @param {Client} client
   */
  constructor(client) {
    /**
     * @type {Client}
     */
    this.client = client;
    /**
     * @type {boolean}
     */
    this.online = !!client.ws;
    /**
     * @type {boolean}
     */
    this.isMuted = false;
    /**
     * @type {boolean}
     */
    this.isSpeaking = false;
  }
}

class Call {
  /** @param {CallOffer} callOffer */
  constructor(callOffer) {
    /** @type {string} */
    this.id = v4();

    /** @type {Member[]} */
    this.members = [
      new Member(callOffer.initiator),
      new Member(callOffer.receiver),
    ];

    /** @type {Client} */
    this.initiator = callOffer.initiator;

    /** @type {Client} */
    this.receiver = callOffer.receiver;

    /** @type {Message} */
    this.messages = [];
  }

  /**
   * Добавляет сообщение в историю звонка
   * @param {string} senderId - ID отправителя
   * @param {string} text - текст сообщения
   * @param {string} senderName - опционально имя отправителя
   * * @param {string} avatar - опционально аватар отправителя
   * @returns {Object} - объект сообщения
   */
  addMessage(senderId, text, senderName = null, avatar = null) {
    const message = new Message(senderId, text, senderName, avatar);
    this.messages.push(message);
    return message;
  }
}

module.exports = Call;
