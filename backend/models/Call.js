const { v4 } = require('uuid');
const CallOffer = require('./CallOffer');
const Client = require('./Client');

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
  /**
   * @param {CallOffer} callOffer
   */
  constructor(callOffer) {
    /**
     * @type {string}
     */
    this.id = v4();
    /**
     * Участники звонка
     * @type {Member[]}
     */
    this.members = [
      new Member(callOffer.initiator),
      new Member(callOffer.receiver),
    ];
    /**
     * @type {Client}
     */
    this.initiator = callOffer.initiator;
    /**
     * @type {Client}
     */
    this.receiver = callOffer.receiver;
  }
}

module.exports = Call;
