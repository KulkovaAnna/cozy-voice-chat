const { v4 } = require('uuid');
const { WebSocket } = require('ws');
const Call = require('./Call');
const PersonalInfo = require('./PersonalInfo');

class Client {
  /**
   * @constructor
   * @param {WebSocket} ws
   * @param {string} ip
   * @param {PersonalInfo} personalInfo
   */
  constructor(ws, ip, personalInfo = new PersonalInfo()) {
    /**
     * @type {string}
     */
    this.id = v4();
    /**
     * @type {WebSocket}
     */
    this.ws = ws;
    /**
     * @type {string}
     */
    this.ip = ip;
    /**
     * @type {Date}
     */
    this.connectionDate = new Date().toISOString();
    /**
     * @type {PersonalInfo}
     */
    this.personalInfo = personalInfo;
  }
}

module.exports = Client;
