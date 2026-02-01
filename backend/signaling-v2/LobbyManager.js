const Call = require('../models/Call');
const PersonalInfo = require('../models/PersonalInfo');
const Client = require('../models/Client');
const CallOffer = require('../models/CallOffer');

class LobbyManager {
  /**
   *  Список клиентов
   *  @type {Map<WebSocket, Client>}
   */
  #clients = new Map();

  /**
   * @type {Map<string,CallOffer>}
   */
  callOffers = new Map();

  /**
   * Добавляет нового клиента в лобби
   * @param {WebSocket} ws - Вебсокет клиента
   * @param {string} ip - IP адрес клиента
   * @param {PersonalInfo} personalInfo
   * @returns {Client}
   */
  addClient(ws, ip, personalInfo) {
    const client = new Client(ws, ip, personalInfo);
    this.#clients.set(ws, client);
    return client;
  }

  /**
   * @param {Client} initiator
   * @param {Client} receiver
   */
  createCallOffer(initiator, receiver) {
    const offer = new CallOffer(initiator, receiver);
    this.callOffers.set(offer.id, offer);
    return offer;
  }

  /**
   * @param {string} id
   * @returns {CallOffer|undefined}
   */
  getOfferById(id) {
    return this.callOffers.get(id);
  }

  getLobbyMembers() {
    return Array.from(this.#clients.values() || []);
  }

  /**
   * @param {WebSocket} ws
   * @returns {Client}
   */
  getMemberByWs(ws) {
    return this.#clients.get(ws);
  }

  /**
   * @param {string} clientId
   * @returns {Client | undefined}
   */
  getMemberById(clientId) {
    return this.getLobbyMembers().find((m) => m.id === clientId);
  }

  getStats() {
    return {
      totalClients: this.#clients.size,
    };
  }
}

module.exports = LobbyManager;
