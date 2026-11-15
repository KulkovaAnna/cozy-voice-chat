import Call, { Member } from '../models/Call';
import type CallOffer from '../models/CallOffer';
import type Client from '../models/Client';
import type Message from '../models/Message';
import type { FileAttachment } from '../types';
import Helpers from '../utils/helpers';

/** Лимит участников групповой комнаты по умолчанию (mesh WebRTC) */
export const DEFAULT_MAX_CALL_MEMBERS = 6;
/** Лимит одновременных комнат по умолчанию */
export const DEFAULT_MAX_ROOMS = 20;
/** Сколько раз пробуем сгенерировать свободный код комнаты */
const MAX_CODE_ATTEMPTS = 50;

export default class CallManager {
  #calls: Map<string, Call> = new Map();
  /** Код комнаты → id звонка */
  #roomCodes: Map<string, string> = new Map();
  #maxMembers: number;
  #maxRooms: number;

  constructor(
    maxMembers: number = DEFAULT_MAX_CALL_MEMBERS,
    maxRooms: number = DEFAULT_MAX_ROOMS,
  ) {
    this.#maxMembers = maxMembers;
    this.#maxRooms = maxRooms;
  }

  /** Нормализует код комнаты: убирает пробелы и приводит к верхнему регистру */
  static normalizeRoomCode(code: string): string {
    return code.trim().toUpperCase();
  }

  /** Проверяет формат кода комнаты */
  static isValidRoomCode(code: string): boolean {
    return /^[A-Z0-9]{6}$/.test(code);
  }

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

    const newCall = new Call(
      callOffer.initiator,
      [callOffer.initiator, callOffer.receiver],
      { type: 'direct' },
    );
    this.#calls.set(newCall.id, newCall);

    return newCall;
  }

  /**
   * Создаёт групповую комнату с уникальным кодом.
   * Создатель сразу становится её первым участником.
   */
  createRoom(initiator: Client): Call {
    if (this.getClientCall(initiator.id)) {
      throw new Error('Вы уже в звонке. Сначала завершите текущий');
    }

    if (this.#roomCodes.size >= this.#maxRooms) {
      throw new Error('Достигнут лимит активных комнат');
    }

    const roomCode = this.#generateRoomCode();
    const call = new Call(initiator, [initiator], {
      type: 'group',
      roomCode,
    });

    this.#calls.set(call.id, call);
    this.#roomCodes.set(roomCode, call.id);

    return call;
  }

  /** Ищет комнату по коду (регистр и пробелы не важны) */
  getRoomByCode(code: string): Call | undefined {
    const normalized = CallManager.normalizeRoomCode(code);
    const callId = this.#roomCodes.get(normalized);
    return callId ? this.#calls.get(callId) : undefined;
  }

  /** Добавляет клиента в комнату */
  joinRoom(callId: string, client: Client): Member {
    const call = this.#calls.get(callId);
    if (!call) {
      throw new Error('Комната не найдена');
    }
    if (call.type !== 'group') {
      throw new Error('Это не групповая комната');
    }
    if (call.hasMember(client.id)) {
      return this.getMemberById(callId, client.id);
    }
    if (this.getClientCall(client.id)) {
      throw new Error('Вы уже в звонке. Сначала завершите текущий');
    }
    if (call.members.length >= this.#maxMembers) {
      throw new Error('Комната заполнена');
    }

    return call.addMember(client);
  }

  /**
   * Удаляет участника из звонка.
   * @returns true, если звонок опустел и был удалён
   */
  leaveCall(callId: string, clientId: string): boolean {
    const call = this.#calls.get(callId);
    if (!call) {
      throw new Error('Нет такого звонка');
    }

    call.removeMember(clientId);

    if (call.members.length === 0) {
      this.endCall(callId);
      return true;
    }

    return false;
  }

  /**
   * Превращает существующий звонок в групповую комнату: выдаёт код и
   * регистрирует его. Операция необратима — повторная конвертация
   * запрещена, у комнаты уже есть код.
   */
  convertToRoom(callId: string): Call {
    const call = this.#calls.get(callId);
    if (!call) {
      throw new Error('Нет такого звонка');
    }
    if (call.roomCode) {
      throw new Error('Комната уже создана');
    }
    if (this.#roomCodes.size >= this.#maxRooms) {
      throw new Error('Достигнут лимит активных комнат');
    }

    const roomCode = this.#generateRoomCode();

    call.type = 'group';
    call.roomCode = roomCode;
    call.receiver = null;
    this.#roomCodes.set(roomCode, call.id);

    return call;
  }

  /**
   * Возвращает клиента в звонок по callId (после F5 или обрыва связи).
   * Вернуться может только тот, кто уже был участником этого звонка.
   */
  rejoinCall(callId: string, client: Client): Member {
    const call = this.#calls.get(callId);
    if (!call) {
      throw new Error('Звонок не найден');
    }
    if (!call.isKnownParticipant(client.id)) {
      throw new Error('Вы не участник этого звонка');
    }

    // Гонка: старый сокет ещё не обработан — обновляем клиента на месте.
    const existing = call.members.find(
      (member) => member.client.id === client.id,
    );
    if (existing) {
      existing.client = client;
      existing.online = true;
      // После перезагрузки страницы локальные mute/share не сохраняются
      existing.isMuted = false;
      existing.isSpeaking = false;
      existing.isScreenSharing = false;
      this.#replaceClientReferences(call, client);
      return existing;
    }

    if (this.getClientCall(client.id)) {
      throw new Error('Вы уже в звонке. Сначала завершите текущий');
    }
    if (call.members.length >= this.#maxMembers) {
      throw new Error('Комната заполнена');
    }

    const member = call.addMember(client);
    this.#replaceClientReferences(call, client);
    return member;
  }

  /** Обновляет ссылки initiator/receiver на новый объект Client */
  #replaceClientReferences(call: Call, client: Client): void {
    if (call.initiator.id === client.id) {
      call.initiator = client;
    }
    if (call.receiver?.id === client.id) {
      call.receiver = client;
    }
  }

  endCall(callId: string): void {
    const call = this.#calls.get(callId);
    if (!call) {
      throw new Error('Нет такого звонка');
    }

    if (call.roomCode) {
      this.#roomCodes.delete(call.roomCode);
    }
    this.#calls.delete(callId);
  }

  /** Генерирует свободный код комнаты */
  #generateRoomCode(): string {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      const code = Helpers.generateRoomCode();
      if (!this.#roomCodes.has(code)) {
        return code;
      }
    }

    throw new Error('Не удалось создать комнату. Попробуйте ещё раз');
  }

  getCallMembers(callId: string): Member[] {
    const memberCall = this.#calls.get(callId);
    if (!memberCall) {
      throw new Error('Нет такого звонка');
    }

    return memberCall.members;
  }

  changeMuteStatus(callId: string, clientId: string, isMuted: boolean): void {
    const member = this.getMemberById(callId, clientId);

    member.isMuted = isMuted;

    // Замьюченный не может говорить: сбрасываем индикатор речи, иначе зелёная
    // обводка у собеседника остаётся «горящей», если детектор речи не успел
    // прислать false (например, после переподключения микрофона).
    if (isMuted) {
      member.isSpeaking = false;
    }
  }

  changeOnlineStatus(
    callId: string,
    clientId: string,
    isOnline: boolean,
  ): void {
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
   * @param isSystem - системное сообщение (ответ бота)
   * @param attachments - прикреплённые файлы
   * @returns объект созданного сообщения
   */
  sendMessage(
    callId: string,
    senderId: string,
    text: string,
    isSystem: boolean = false,
    attachments: FileAttachment[] = [],
  ): Message {
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
      isSystem,
      attachments,
    );

    // Возвращаем сообщение, чтобы SignalingServer мог его разослать
    return message;
  }

  getCallMessages(callId: string): Message[] {
    const call = this.#calls.get(callId);
    if (!call) return [];
    return call.messages;
  }

  /** Вернуть все активные звонки */
  getAllCalls(): Call[] {
    return Array.from(this.#calls.values());
  }
}
