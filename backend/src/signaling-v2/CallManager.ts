import Call, { Member } from '../models/Call';
import type CallOffer from '../models/CallOffer';
import type Message from '../models/Message';

export default class CallManager {
  #calls: Map<string, Call> = new Map();

  /**
   * Запускает новый звонок на основании предложения
   */
  startCall(callOffer: CallOffer): Call {
    if (
      Array.from(this.#calls.values()).some((call) => {
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

  endCall(callId: string): void {
    if (!this.#calls.has(callId)) {
      throw new Error('Нет такого звонка');
    }
    this.#calls.delete(callId);
  }

  getCallMembers(callId: string): Member[] {
    const memberCall = this.#calls.get(callId);
    if (!memberCall) {
      throw new Error('Нет такого звонка');
    }

    return memberCall.members;
  }

  changeMuteStatus(callId: string, clientId: string, isMuted: boolean): void {
    this.getMemberById(callId, clientId).isMuted = isMuted;
  }

  changeOnlineStatus(callId: string, clientId: string, isOnline: boolean): void {
    this.getMemberById(callId, clientId).online = isOnline;
  }

  changeSpeakingStatus(
    callId: string,
    clientId: string,
    isSpeaking: boolean,
  ): void {
    this.getMemberById(callId, clientId).isSpeaking = isSpeaking;
  }

  changeScreenSharingStatus(
    callId: string,
    clientId: string,
    isSharing: boolean,
  ): void {
    this.getMemberById(callId, clientId).isScreenSharing = isSharing;
  }

  /**
   * Получить звонок, в котором участвует клиент
   */
  getClientCall(clientId: string): Call | undefined {
    let memberCall: Call | undefined;
    this.#calls.forEach((call) => {
      if (call.members.map((m) => m.client.id).includes(clientId)) {
        memberCall = call;
      }
    });
    return memberCall;
  }

  getCallById(callId: string): Call | undefined {
    return this.#calls.get(callId);
  }

  getMemberById(callId: string, clientId: string): Member {
    const call = this.#calls.get(callId);
    if (!call) {
      throw new Error('Нет такого звонка');
    }
    const member = call.members.find((m) => m.client.id === clientId);
    if (!member) {
      throw new Error('Участник не найден');
    }
    return member;
  }

  /**
   * Отправляет сообщение в звонок
   * @param callId - ID звонка
   * @param senderId - ID отправителя (должен быть участником)
   * @param text - текст сообщения
   * @returns объект созданного сообщения
   */
  sendMessage(callId: string, senderId: string, text: string): Message {
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
      member.client.personalInfo?.name ?? null,
      member.client.personalInfo?.avatar ?? null,
    );

    // Возвращаем сообщение, чтобы SignalingServer мог его разослать
    return message;
  }

  getCallMessages(callId: string): Message[] {
    const call = this.#calls.get(callId);
    if (!call) return [];
    return call.messages;
  }
}
