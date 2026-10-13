import WebSocket from 'ws';
import type { WebSocket as WebSocketType } from 'ws';
import PersonalInfo, { normalizeCardAppearance } from '../models/PersonalInfo';
import Client from '../models/Client';
import CallOffer from '../models/CallOffer';
import type { PersonalInfoData } from '../types';

export default class LobbyManager {
  /** Максимальная длина имени пользователя */
  private static readonly MAX_NAME_LENGTH = 50;
  /** Максимальный размер аватара (1 МБ в base64) */
  private static readonly MAX_AVATAR_SIZE = 1024 * 1024;

  /** Список клиентов */
  #clients: Map<WebSocketType, Client> = new Map();

  callOffers: Map<string, CallOffer> = new Map();

  /**
   * Добавляет нового клиента в лобби
   * @param ws - Вебсокет клиента
   * @param ip - IP адрес клиента
   * @param personalInfo - персональные данные клиента (или сырые данные от клиента)
   * @param preferredId - желаемый ID клиента (например, прежний id при переподключении)
   */
  addClient(
    ws: WebSocketType,
    ip: string,
    personalInfo?: PersonalInfo | null,
    preferredId?: string | null,
  ): Client | undefined {
    const clients = Array.from(this.#clients.values());
    if (clients.some((c) => c.ip === ip)) {
      console.error(`Данный пользователь уже находится в лобби`);
      return;
    }
    // Если желаемый ID уже занят другим клиентом — игнорируем его
    const isIdTaken =
      typeof preferredId === 'string' &&
      preferredId.length > 0 &&
      clients.some((c) => c.id === preferredId);
    const client = new Client(
      ws,
      ip,
      personalInfo ?? undefined,
      isIdTaken ? null : preferredId,
    );
    this.#clients.set(ws, client);
    return client;
  }

  /**
   * Обновляет персональные данные клиента в лобби
   * @param clientId - ID клиента
   * @param raw - сырые данные профиля от клиента
   * @returns обновлённый клиент или undefined, если клиент не найден
   */
  updatePersonalInfo(
    clientId: string,
    raw?: PersonalInfoData | null,
  ): Client | undefined {
    const client = this.getMemberById(clientId);
    if (!client) {
      return;
    }

    const name =
      typeof raw?.name === 'string'
        ? raw.name.trim().slice(0, LobbyManager.MAX_NAME_LENGTH)
        : '';

    const avatar =
      typeof raw?.avatar === 'string' &&
      raw.avatar.length > 0 &&
      raw.avatar.length <= LobbyManager.MAX_AVATAR_SIZE
        ? raw.avatar
        : null;

    const cardAppearance = normalizeCardAppearance(raw?.cardAppearance);

    client.personalInfo = new PersonalInfo(
      name || null,
      avatar,
      cardAppearance,
    );
    return client;
  }

  createCallOffer(initiator: Client, receiver: Client): CallOffer {
    const offer = new CallOffer(initiator, receiver);
    this.callOffers.set(offer.id, offer);
    return offer;
  }

  getOfferById(id: string): CallOffer | undefined {
    return this.callOffers.get(id);
  }

  getOfferByMemberId(memberId: string): CallOffer | undefined {
    const offers = Array.from(this.callOffers.values());
    return offers.find(
      (offer) =>
        offer.initiator.id === memberId || offer.receiver.id === memberId,
    );
  }

  getLobbyMembers(): Client[] {
    return Array.from(this.#clients.values());
  }

  getMemberByWs(ws: WebSocketType): Client | undefined {
    return this.#clients.get(ws);
  }

  getMemberById(clientId: string): Client | undefined {
    return this.getLobbyMembers().find((m) => m.id === clientId);
  }

  getMemberByIp(clientIp: string): Client | undefined {
    return this.getLobbyMembers().find((m) => m.ip === clientIp);
  }

  removeMember(ws: WebSocketType): void {
    this.#clients.delete(ws);
  }

  getStats(): { totalClients: number } {
    return {
      totalClients: this.#clients.size,
    };
  }

  /** Удалить клиентов с зависшими WebSocket-соединениями */
  clearStaleClients(): void {
    const stale: WebSocketType[] = [];
    this.#clients.forEach((client, ws) => {
      if (ws.readyState !== WebSocket.OPEN) {
        stale.push(ws);
      }
    });
    stale.forEach((ws) => {
      console.info(`Удаление зависшего клиента: ${this.#clients.get(ws)?.id}`);
      this.#clients.delete(ws);
    });
    if (stale.length > 0) {
      console.info(`Очищено зависших клиентов: ${stale.length}`);
    }
  }
}
