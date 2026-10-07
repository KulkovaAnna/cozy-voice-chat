import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocket } from 'ws';
import LobbyManager from '../../src/signaling-v2/LobbyManager';
import PersonalInfo from '../../src/models/PersonalInfo';

function mockWs(): WebSocket {
  return { readyState: 1 } as unknown as WebSocket;
}

describe('LobbyManager', () => {
  let lobby: LobbyManager;

  beforeEach(() => {
    lobby = new LobbyManager();
  });

  // ─── addClient ────────────────────────────────────────────────
  describe('addClient', () => {
    it('should add a new client and return it', () => {
      const ws = mockWs();
      const pi = new PersonalInfo('Alice');
      const client = lobby.addClient(ws, '192.168.1.1', pi);

      expect(client).toBeDefined();
      expect(client!.ip).toBe('192.168.1.1');
      expect(client!.personalInfo.name).toBe('Alice');
      expect(client!.id).toBeTruthy();
    });

    it('should use default PersonalInfo when none provided', () => {
      const ws = mockWs();
      const client = lobby.addClient(ws, '10.0.0.1');

      expect(client).toBeDefined();
      expect(client!.personalInfo.name).toMatch(/^Аноним_/);
    });

    it('should return undefined for duplicate IP', () => {
      const ws1 = mockWs();
      const ws2 = mockWs();
      lobby.addClient(ws1, '192.168.1.1');

      const dup = lobby.addClient(ws2, '192.168.1.1');

      expect(dup).toBeUndefined();
      expect(lobby.getStats().totalClients).toBe(1);
    });

    it('should allow clients with different IPs', () => {
      lobby.addClient(mockWs(), '192.168.1.1');
      lobby.addClient(mockWs(), '192.168.1.2');

      expect(lobby.getStats().totalClients).toBe(2);
    });
  });

  // ─── updatePersonalInfo ───────────────────────────────────────
  describe('updatePersonalInfo', () => {
    it('should update name and avatar of existing client', () => {
      const client = lobby.addClient(mockWs(), '10.0.0.1')!;

      const updated = lobby.updatePersonalInfo(client.id, {
        name: 'NewName',
        avatar: 'data:image/png;base64,AAA',
      });

      expect(updated).toBeDefined();
      expect(updated!.personalInfo.name).toBe('NewName');
      expect(updated!.personalInfo.avatar).toBe('data:image/png;base64,AAA');
      // Обновление затрагивает того же клиента в лобби
      expect(lobby.getMemberById(client.id)!.personalInfo.name).toBe('NewName');
    });

    it('should return undefined for unknown client id', () => {
      expect(
        lobby.updatePersonalInfo('no-such-id', { name: 'X' }),
      ).toBeUndefined();
    });

    it('should trim name and limit its length', () => {
      const client = lobby.addClient(mockWs(), '10.0.0.1')!;
      const longName = 'A'.repeat(120);

      const updated = lobby.updatePersonalInfo(client.id, {
        name: `  ${longName}  `,
      });

      expect(updated!.personalInfo.name).toBe('A'.repeat(50));
    });

    it('should fall back to default name when name is empty', () => {
      const client = lobby.addClient(mockWs(), '10.0.0.1')!;

      const updated = lobby.updatePersonalInfo(client.id, { name: '   ' });

      expect(updated!.personalInfo.name).toMatch(/^Аноним_/);
    });

    it('should ignore avatar when it is not a string or is empty', () => {
      const client = lobby.addClient(
        mockWs(),
        '10.0.0.1',
        new PersonalInfo('Alice', 'old-avatar'),
      )!;

      const updated = lobby.updatePersonalInfo(client.id, {
        name: 'Alice',
        avatar: '',
      });

      expect(updated!.personalInfo.avatar).toBeNull();
    });

    it('should ignore avatar exceeding max length', () => {
      const client = lobby.addClient(mockWs(), '10.0.0.1')!;
      const hugeAvatar = 'x'.repeat(1024 * 1024 + 1);

      const updated = lobby.updatePersonalInfo(client.id, {
        name: 'Alice',
        avatar: hugeAvatar,
      });

      expect(updated!.personalInfo.avatar).toBeNull();
    });
  });

  // ─── createCallOffer ──────────────────────────────────────────
  describe('createCallOffer', () => {
    it('should create and store a call offer', () => {
      const ws1 = mockWs();
      const ws2 = mockWs();
      const alice = lobby.addClient(ws1, '10.0.0.1')!;
      const bob = lobby.addClient(ws2, '10.0.0.2')!;

      const offer = lobby.createCallOffer(alice, bob);

      expect(offer).toBeDefined();
      expect(offer.id).toBeTruthy();
      expect(offer.initiator.id).toBe(alice.id);
      expect(offer.receiver.id).toBe(bob.id);
      expect(lobby.getOfferById(offer.id)).toBe(offer);
    });
  });

  // ─── getOfferById ─────────────────────────────────────────────
  describe('getOfferById', () => {
    it('should return undefined for unknown id', () => {
      expect(lobby.getOfferById('nonexistent')).toBeUndefined();
    });
  });

  // ─── getOfferByMemberId ───────────────────────────────────────
  describe('getOfferByMemberId', () => {
    it('should find offer by initiator id', () => {
      const alice = lobby.addClient(mockWs(), '10.0.0.1')!;
      const bob = lobby.addClient(mockWs(), '10.0.0.2')!;
      const offer = lobby.createCallOffer(alice, bob);

      const found = lobby.getOfferByMemberId(alice.id);
      expect(found).toBe(offer);
    });

    it('should find offer by receiver id', () => {
      const alice = lobby.addClient(mockWs(), '10.0.0.1')!;
      const bob = lobby.addClient(mockWs(), '10.0.0.2')!;
      const offer = lobby.createCallOffer(alice, bob);

      const found = lobby.getOfferByMemberId(bob.id);
      expect(found).toBe(offer);
    });

    it('should return undefined for member with no offer', () => {
      const client = lobby.addClient(mockWs(), '10.0.0.99')!;
      expect(lobby.getOfferByMemberId(client.id)).toBeUndefined();
    });
  });

  // ─── getLobbyMembers ──────────────────────────────────────────
  describe('getLobbyMembers', () => {
    it('should return empty array initially', () => {
      expect(lobby.getLobbyMembers()).toEqual([]);
    });

    it('should return all added clients', () => {
      lobby.addClient(mockWs(), '10.0.0.1');
      lobby.addClient(mockWs(), '10.0.0.2');

      expect(lobby.getLobbyMembers()).toHaveLength(2);
    });
  });

  // ─── getMemberByWs ────────────────────────────────────────────
  describe('getMemberByWs', () => {
    it('should return client by websocket', () => {
      const ws = mockWs();
      const client = lobby.addClient(ws, '10.0.0.1')!;

      expect(lobby.getMemberByWs(ws)).toBe(client);
    });

    it('should return undefined for unknown ws', () => {
      expect(lobby.getMemberByWs(mockWs())).toBeUndefined();
    });
  });

  // ─── getMemberById ────────────────────────────────────────────
  describe('getMemberById', () => {
    it('should find client by id', () => {
      const client = lobby.addClient(mockWs(), '10.0.0.1')!;
      expect(lobby.getMemberById(client.id)).toBe(client);
    });

    it('should return undefined for unknown id', () => {
      expect(lobby.getMemberById('no-such-id')).toBeUndefined();
    });
  });

  // ─── getMemberByIp ────────────────────────────────────────────
  describe('getMemberByIp', () => {
    it('should find client by ip', () => {
      lobby.addClient(mockWs(), '10.0.0.1');
      const found = lobby.getMemberByIp('10.0.0.1');

      expect(found).toBeDefined();
      expect(found!.ip).toBe('10.0.0.1');
    });

    it('should return undefined for unknown ip', () => {
      expect(lobby.getMemberByIp('1.1.1.1')).toBeUndefined();
    });
  });

  // ─── removeMember ─────────────────────────────────────────────
  describe('removeMember', () => {
    it('should remove client by ws', () => {
      const ws = mockWs();
      lobby.addClient(ws, '10.0.0.1');

      lobby.removeMember(ws);

      expect(lobby.getMemberByWs(ws)).toBeUndefined();
      expect(lobby.getStats().totalClients).toBe(0);
    });

    it('should be safe to remove unknown ws', () => {
      expect(() => lobby.removeMember(mockWs())).not.toThrow();
    });
  });

  // ─── getStats ─────────────────────────────────────────────────
  describe('getStats', () => {
    it('should return correct totalClients count', () => {
      expect(lobby.getStats().totalClients).toBe(0);

      lobby.addClient(mockWs(), '10.0.0.1');
      lobby.addClient(mockWs(), '10.0.0.2');

      expect(lobby.getStats().totalClients).toBe(2);
    });

    it('should reflect removal', () => {
      const ws = mockWs();
      lobby.addClient(ws, '10.0.0.1');
      lobby.addClient(mockWs(), '10.0.0.2');
      lobby.removeMember(ws);

      expect(lobby.getStats().totalClients).toBe(1);
    });
  });

  // ─── callOffers map ───────────────────────────────────────────
  describe('callOffers direct access', () => {
    it('should allow external deletion of offers', () => {
      const alice = lobby.addClient(mockWs(), '10.0.0.1')!;
      const bob = lobby.addClient(mockWs(), '10.0.0.2')!;
      const offer = lobby.createCallOffer(alice, bob);

      // Имитация удаления из SignalingServer
      lobby.callOffers.delete(offer.id);

      expect(lobby.getOfferById(offer.id)).toBeUndefined();
    });
  });
});
