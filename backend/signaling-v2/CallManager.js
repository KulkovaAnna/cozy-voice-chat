const Call = require('../models/Call');
const CallOffer = require('../models/CallOffer');
const { Message } = require('../models/Message');

class CallManager {
  /** @type {Map<string,Call>}*/
  #calls = new Map();

  /**
   * @param {CallOffer} callOffer
   * @returns {boolean}
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

  /** @param {string} callId  */
  endCall(callId) {
    if (!this.#calls.has(callId)) {
      throw new Error('Нет такого звонка');
    }
    this.#calls.delete(callId);
  }

  /**
   * @param {string} callId
   * @returns {Member[]}
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
    /** @type {Call|undefined}*/
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

  /**
   * Отправляет сообщение в звонок
   * @param {string} callId - ID звонка
   * @param {string} senderId - ID отправителя (должен быть участником)
   * @param {string} text - текст сообщения
   * @returns {Message} - объект созданного сообщения
   */
  sendMessage(callId, senderId, text) {
    const call = this.#calls.get(callId);
    if (!call) {
      throw new Error('Звонок не найден');
    }

    // Проверяем, что отправитель является участником звонка
    const member = call.members.find((m) => m.client.id === senderId);
    if (!member) {
      throw new Error('Отправитель не является участником звонка');
    }

    // Добавляем сообщение в историю
    const message = call.addMessage(
      senderId,
      text,
      member.client.personalInfo?.name,
      member.client.personalInfo?.avatar,
    );

    // Возвращаем сообщение, чтобы SignalingServer мог его разослать
    return message;
  }

  /**
   * @param {string} callId
   * @returns {Message[]}
   */
  getCallMessages(callId) {
    const call = this.#calls.get(callId);
    if (!call) return [];
    return call.messages;
  }
}

module.exports = CallManager;
