const Call = require('../models/Call');
const CallOffer = require('../models/CallOffer');

class CallManager {
  /**
   * @type {Map<string,Call>}
   */
  #calls = new Map();

  /**
   * @param {CallOffer} callOffer
   * @returns
   */
  startCall(callOffer) {
    if (
      Array.from(this.#calls.values).some((call) => {
        const membersIds = call.members.map((mem) => mem.client.id);
        return (
          membersIds.includes(callOffer.initiator.id) ||
          membersIds.includes(callOffer.receiver.id)
        );
      })
    ) {
      throw new Error(
        'Один или несколько участников договора уже участвуют в звонке',
      );
    }

    const newCall = new Call(callOffer);
    this.#calls.set(newCall.id, newCall);

    return newCall;
  }

  endCall(callId) {
    if (!this.#calls.has(callId)) {
      throw new Error('Нет такого звонка');
    }
    this.#calls.delete(callId);
  }

  /**
   * @param {string} callId
   * @returns
   */
  getCallMembers(callId) {
    const memberCall = this.#calls.get(callId);
    if (!memberCall) {
      throw new Error('Нет такого звонка');
    }

    return memberCall.members;
  }

  /**
   * @param {string} callId
   * @param {string} clientId
   * @param {boolean} isMuted
   */
  changeMuteStatus(callId, clientId, isMuted) {
    this.getMemberById(callId, clientId).isMuted = isMuted;
  }

  /**
   * @param {string} callId
   * @param {string} clientId
   * @param {boolean} isOnline
   */
  changeOnlineStatus(callId, clientId, isOnline) {
    this.getMemberById(callId, clientId).online = isOnline;
  }

  /**
   * @param {string} callId
   * @param {string} clientId
   * @param {boolean} isSpeaking
   */
  changeSpeakingStatus(callId, clientId, isSpeaking) {
    this.getMemberById(callId, clientId).isSpeaking = isSpeaking;
  }

  /**
   * Получить звонок, в котором участвует клиент
   * @param {string} clientId
   */
  getClientCall(clientId) {
    /**
     * @type {Call|undefined}
     */
    let memberCall;
    this.#calls.forEach((call) => {
      if (call.members.map((m) => m.client.id).includes(clientId)) {
        memberCall = call;
      }
    });
    return memberCall;
  }

  /**
   * @param {string} callId
   * @returns {Call|undefined}
   */
  getCallById(callId) {
    return this.#calls.get(callId);
  }

  /**
   * @param {string} callId
   * @param {string} clientId
   * @returns {Member}
   */
  getMemberById(callId, clientId) {
    return this.#calls
      .get(callId)
      .members.find((m) => m.client.id === clientId);
  }
}

module.exports = CallManager;
