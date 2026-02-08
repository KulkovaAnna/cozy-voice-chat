const { v4 } = require('uuid');
const Client = require('./Client');

class CallOffer {
  /**
   * @param {Client} initiator
   * @param {Client} receiver
   */
  constructor(initiator, receiver) {
    /**
     * @type {string}
     */
    this.id = v4();
    /**
     * @type {Client}
     */
    this.initiator = initiator;
    /**
     * @type {Client}
     */
    this.receiver = receiver;
  }
}

module.exports = CallOffer;
