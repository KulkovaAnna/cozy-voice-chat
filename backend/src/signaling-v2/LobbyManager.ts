import type { WebSocket } from 'ws';
import PersonalInfo from '../models/PersonalInfo';
import Client from '../models/Client';
import CallOffer from '../models/CallOffer';
import type { PersonalInfoData } from '../types';

export default class LobbyManager {
  /** Список клиентов */
  #clients: Map<WebSocket, Client> = new Map();

  callOffers: Map<string, CallOffer> = new Map();

  /**
   * Добавляет нового клиента в лобби
   * @param ws - Вебсокет клиента
   * @param ip - IP адрес клиента
   * @param personalInfo - персональные данные клиента (или сырые данные от клиента)
   */
  addClient(
    ws: WebSocket,
    ip: string,
    personalInfo?: PersonalInfo | null,
  ): Client | undefined {
    const clients = Array.from(this.#clients.values());
    if (clients.some((c) => c.ip === ip)) {
      console.error(`Данный пользователь уже находится в лобби`);
      return;
    }
    const client = new Client(ws, ip, personalInfo ?? undefined);
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

    const name = typeof raw?.name === 'string' ? raw.name.trim() : '';

    const avatar =
      typeof raw?.avatar === 'string' && raw.avatar.length > 0
        ? raw.avatar
        : null;

    client.personalInfo = new PersonalInfo(name || null, avatar);
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

  getMemberByWs(ws: WebSocket): Client | undefined {
    return this.#clients.get(ws);
  }

  getMemberById(clientId: string): Client | undefined {
    return this.getLobbyMembers().find((m) => m.id === clientId);
  }

  getMemberByIp(clientIp: string): Client | undefined {
    return this.getLobbyMembers().find((m) => m.ip === clientIp);
  }

  removeMember(ws: WebSocket): void {
    this.#clients.delete(ws);
  }

  getStats(): { totalClients: number } {
    return {
      totalClients: this.#clients.size,
    };
  }
}
