import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocket } from 'ws';
import CallManager from '../../src/signaling-v2/CallManager';
import LobbyManager from '../../src/signaling-v2/LobbyManager';

function mockWs(): WebSocket {
  return { readyState: 1 } as unknown as WebSocket;
}

describe('CallManager', () => {
  let callManager: CallManager;
  let lobby: LobbyManager;

  beforeEach(() => {
    callManager = new CallManager();
    lobby = new LobbyManager();
  });

  // helper: create two clients and a call offer
  function createOffer() {
    const alice = lobby.addClient(mockWs(), '10.0.0.1')!;
    const bob = lobby.addClient(mockWs(), '10.0.0.2')!;
    return lobby.createCallOffer(alice, bob);
  }

  // ─── startCall ────────────────────────────────────────────────
  describe('startCall', () => {
    it('should create a call with two members', () => {
      const offer = createOffer();
      const call = callManager.startCall(offer);

      expect(call.id).toBeTruthy();
      expect(call.members).toHaveLength(2);
      expect(call.members[0].client.id).toBe(offer.initiator.id);
      expect(call.members[1].client.id).toBe(offer.receiver.id);
    });

    it('should store the call accessible by id', () => {
      const offer = createOffer();
      const call = callManager.startCall(offer);

      expect(callManager.getCallById(call.id)).toBe(call);
    });

    it('should throw if initiator already in another call', () => {
      const offer1 = createOffer();
      callManager.startCall(offer1);

      // Создаём нового клиента и пытаемся позвонить тому же initiator
      const alice = offer1.initiator;
      const charlie = lobby.addClient(mockWs(), '10.0.0.3')!;
      const offer2 = lobby.createCallOffer(alice, charlie);

      expect(() => callManager.startCall(offer2)).toThrow(
        'Один или несколько участников договора уже участвуют в звонке',
      );
    });

    it('should throw if receiver already in another call', () => {
      const offer1 = createOffer();
      callManager.startCall(offer1);

      const bob = offer1.receiver;
      const charlie = lobby.addClient(mockWs(), '10.0.0.3')!;
      const offer2 = lobby.createCallOffer(charlie, bob);

      expect(() => callManager.startCall(offer2)).toThrow(
        'Один или несколько участников договора уже участвуют в звонке',
      );
    });

    it('should allow separate calls with different participants', () => {
      const offer1 = createOffer();
      callManager.startCall(offer1);

      const dave = lobby.addClient(mockWs(), '10.0.0.3')!;
      const eve = lobby.addClient(mockWs(), '10.0.0.4')!;
      const offer2 = lobby.createCallOffer(dave, eve);

      const call2 = callManager.startCall(offer2);
      expect(call2.members).toHaveLength(2);
    });
  });

  // ─── endCall ──────────────────────────────────────────────────
  describe('endCall', () => {
    it('should remove the call', () => {
      const call = callManager.startCall(createOffer());
      callManager.endCall(call.id);

      expect(callManager.getCallById(call.id)).toBeUndefined();
    });

    it('should throw for unknown callId', () => {
      expect(() => callManager.endCall('nonexistent')).toThrow(
        'Нет такого звонка',
      );
    });
  });

  // ─── getCallMembers ───────────────────────────────────────────
  describe('getCallMembers', () => {
    it('should return members array', () => {
      const call = callManager.startCall(createOffer());
      const members = callManager.getCallMembers(call.id);

      expect(members).toHaveLength(2);
      expect(members[0].isMuted).toBe(false);
      expect(members[0].online).toBe(true);
    });

    it('should throw for unknown callId', () => {
      expect(() => callManager.getCallMembers('no-id')).toThrow(
        'Нет такого звонка',
      );
    });
  });

  // ─── changeMuteStatus ─────────────────────────────────────────
  describe('changeMuteStatus', () => {
    it('should toggle isMuted for the right member', () => {
      const call = callManager.startCall(createOffer());
      const clientId = call.members[0].client.id;

      callManager.changeMuteStatus(call.id, clientId, true);
      expect(callManager.getMemberById(call.id, clientId).isMuted).toBe(true);

      callManager.changeMuteStatus(call.id, clientId, false);
      expect(callManager.getMemberById(call.id, clientId).isMuted).toBe(false);
    });

    it('should reset isSpeaking when muting', () => {
      const call = callManager.startCall(createOffer());
      const clientId = call.members[0].client.id;

      callManager.changeSpeakingStatus(call.id, clientId, true);
      callManager.changeMuteStatus(call.id, clientId, true);

      expect(callManager.getMemberById(call.id, clientId).isSpeaking).toBe(
        false,
      );
    });

    it('should not touch isSpeaking when unmuting', () => {
      const call = callManager.startCall(createOffer());
      const clientId = call.members[0].client.id;

      callManager.changeSpeakingStatus(call.id, clientId, true);
      callManager.changeMuteStatus(call.id, clientId, false);

      expect(callManager.getMemberById(call.id, clientId).isSpeaking).toBe(
        true,
      );
    });

    it('should throw for unknown callId', () => {
      expect(() => callManager.changeMuteStatus('no-id', 'x', true)).toThrow(
        'Нет такого звонка',
      );
    });

    it('should throw for unknown clientId', () => {
      const call = callManager.startCall(createOffer());
      expect(() =>
        callManager.changeMuteStatus(call.id, 'unknown', true),
      ).toThrow('Участник не найден');
    });
  });

  // ─── changeOnlineStatus ───────────────────────────────────────
  describe('changeOnlineStatus', () => {
    it('should set online status', () => {
      const call = callManager.startCall(createOffer());
      const clientId = call.members[1].client.id;

      callManager.changeOnlineStatus(call.id, clientId, false);
      expect(callManager.getMemberById(call.id, clientId).online).toBe(false);
    });
  });

  // ─── changeSpeakingStatus ─────────────────────────────────────
  describe('changeSpeakingStatus', () => {
    it('should set isSpeaking', () => {
      const call = callManager.startCall(createOffer());
      const clientId = call.members[0].client.id;

      callManager.changeSpeakingStatus(call.id, clientId, true);
      expect(callManager.getMemberById(call.id, clientId).isSpeaking).toBe(
        true,
      );
    });
  });

  // ─── changeScreenSharingStatus ────────────────────────────────
  describe('changeScreenSharingStatus', () => {
    it('should set isScreenSharing', () => {
      const call = callManager.startCall(createOffer());
      const clientId = call.members[0].client.id;

      callManager.changeScreenSharingStatus(call.id, clientId, true);
      expect(callManager.getMemberById(call.id, clientId).isScreenSharing).toBe(
        true,
      );
    });
  });

  // ─── getClientCall ────────────────────────────────────────────
  describe('getClientCall', () => {
    it('should return the call for a member', () => {
      const call = callManager.startCall(createOffer());
      const clientId = call.members[0].client.id;

      expect(callManager.getClientCall(clientId)).toBe(call);
    });

    it('should return undefined for a client not in any call', () => {
      const client = lobby.addClient(mockWs(), '10.0.0.99')!;
      expect(callManager.getClientCall(client.id)).toBeUndefined();
    });
  });

  // ─── getCallById ──────────────────────────────────────────────
  describe('getCallById', () => {
    it('should return undefined for unknown id', () => {
      expect(callManager.getCallById('no-such')).toBeUndefined();
    });
  });

  // ─── getMemberById ────────────────────────────────────────────
  describe('getMemberById', () => {
    it('should throw "Нет такого звонка" for unknown callId', () => {
      expect(() => callManager.getMemberById('no-call', 'any')).toThrow(
        'Нет такого звонка',
      );
    });

    it('should throw "Участник не найден" for unknown clientId', () => {
      const call = callManager.startCall(createOffer());
      expect(() => callManager.getMemberById(call.id, 'stranger')).toThrow(
        'Участник не найден',
      );
    });
  });

  // ─── sendMessage ──────────────────────────────────────────────
  describe('sendMessage', () => {
    it('should create a message and add it to history', () => {
      const call = callManager.startCall(createOffer());
      const senderId = call.members[0].client.id;

      const msg = callManager.sendMessage(call.id, senderId, 'Hello!');

      expect(msg.id).toBeTruthy();
      expect(msg.text).toBe('Hello!');
      expect(msg.senderId).toBe(senderId);
      expect(call.messages).toHaveLength(1);
      expect(call.messages[0]).toBe(msg);
    });

    it('should include senderName from personalInfo', () => {
      const alice = lobby.addClient(mockWs(), '10.0.0.1')!;
      const bob = lobby.addClient(mockWs(), '10.0.0.2')!;
      const offer = lobby.createCallOffer(alice, bob);
      const call = callManager.startCall(offer);

      const msg = callManager.sendMessage(call.id, alice.id, 'Hi');
      expect(msg.senderName).toBe(alice.personalInfo.name);
    });

    it('should throw "Звонок не найден" for unknown callId', () => {
      expect(() => callManager.sendMessage('no-id', 'any', 'text')).toThrow(
        'Звонок не найден',
      );
    });

    it('should throw "Отправитель не является участником" for outsider', () => {
      const call = callManager.startCall(createOffer());
      expect(() =>
        callManager.sendMessage(call.id, 'outsider', 'text'),
      ).toThrow('Отправитель не является участником звонка');
    });

    it('should accumulate multiple messages in order', () => {
      const call = callManager.startCall(createOffer());
      const id = call.members[0].client.id;

      callManager.sendMessage(call.id, id, 'msg1');
      callManager.sendMessage(call.id, id, 'msg2');
      callManager.sendMessage(call.id, id, 'msg3');

      expect(call.messages.map((m) => m.text)).toEqual([
        'msg1',
        'msg2',
        'msg3',
      ]);
    });

    it('should set isSystem to false by default', () => {
      const call = callManager.startCall(createOffer());
      const senderId = call.members[0].client.id;

      const msg = callManager.sendMessage(call.id, senderId, 'Hello!');
      expect(msg.isSystem).toBe(false);
    });

    it('should set isSystem to true when specified', () => {
      const call = callManager.startCall(createOffer());
      const senderId = call.members[0].client.id;

      const msg = callManager.sendMessage(call.id, senderId, 'Bot reply', true);
      expect(msg.isSystem).toBe(true);
    });
  });

  // ─── getCallMessages ──────────────────────────────────────────
  describe('getCallMessages', () => {
    it('should return empty array for unknown callId', () => {
      expect(callManager.getCallMessages('no-id')).toEqual([]);
    });

    it('should return all messages for a call', () => {
      const call = callManager.startCall(createOffer());
      const id = call.members[0].client.id;

      callManager.sendMessage(call.id, id, 'a');
      callManager.sendMessage(call.id, id, 'b');

      expect(callManager.getCallMessages(call.id)).toHaveLength(2);
    });
  });

  // ─── Групповые комнаты ────────────────────────────────────────
  describe('rooms', () => {
    /** Создаёт клиентов с уникальными IP */
    function createClients(count: number) {
      return Array.from({ length: count }, (_, index) =>
        lobby.addClient(mockWs(), `10.1.0.${index + 1}`)!,
      );
    }

    it('should keep direct calls direct', () => {
      const call = callManager.startCall(createOffer());

      expect(call.type).toBe('direct');
      expect(call.roomCode).toBeNull();
      expect(call.receiver).not.toBeNull();
    });

    it('should create a group room with a six-character code', () => {
      const [alice] = createClients(1);
      const room = callManager.createRoom(alice);

      expect(room.type).toBe('group');
      expect(room.roomCode).toMatch(/^[A-Z0-9]{6}$/);
      expect(room.members).toHaveLength(1);
      expect(room.receiver).toBeNull();
      expect(callManager.getRoomByCode(room.roomCode!)).toBe(room);
    });

    it('should generate unique codes for different rooms', () => {
      const [alice, bob] = createClients(2);

      const room1 = callManager.createRoom(alice);
      const room2 = callManager.createRoom(bob);

      expect(room1.roomCode).not.toBe(room2.roomCode);
    });

    it('should not create a room for a client already in a call', () => {
      const [alice] = createClients(1);
      callManager.createRoom(alice);

      expect(() => callManager.createRoom(alice)).toThrow(
        'Вы уже в звонке. Сначала завершите текущий',
      );
    });

    it('should join a room and find it by code case-insensitively', () => {
      const [alice, bob] = createClients(2);
      const room = callManager.createRoom(alice);

      const member = callManager.joinRoom(room.id, bob);

      expect(member.client.id).toBe(bob.id);
      expect(room.members).toHaveLength(2);
      expect(callManager.getRoomByCode(room.roomCode!.toLowerCase())).toBe(
        room,
      );
    });

    it('should be idempotent when an existing member joins again', () => {
      const [alice] = createClients(1);
      const room = callManager.createRoom(alice);

      const member = callManager.joinRoom(room.id, alice);

      expect(member.client.id).toBe(alice.id);
      expect(room.members).toHaveLength(1);
    });

    it('should reject a client that is already in another call', () => {
      const [alice, bob, charlie] = createClients(3);
      callManager.startCall(lobby.createCallOffer(alice, bob));
      const room = callManager.createRoom(charlie);

      expect(() => callManager.joinRoom(room.id, alice)).toThrow(
        'Вы уже в звонке. Сначала завершите текущий',
      );
    });

    it('should enforce the member limit', () => {
      const limited = new CallManager(2);
      const [alice, bob, charlie] = createClients(3);
      const room = limited.createRoom(alice);

      limited.joinRoom(room.id, bob);

      expect(() => limited.joinRoom(room.id, charlie)).toThrow(
        'Комната заполнена',
      );
    });

    it('should enforce the room limit', () => {
      const limited = new CallManager(6, 1);
      const [alice, bob] = createClients(2);
      limited.createRoom(alice);

      expect(() => limited.createRoom(bob)).toThrow(
        'Достигнут лимит активных комнат',
      );
    });

    it('should keep the room when one of two members leaves', () => {
      const [alice, bob] = createClients(2);
      const room = callManager.createRoom(alice);
      callManager.joinRoom(room.id, bob);

      const isEmpty = callManager.leaveRoom(room.id, bob.id);

      expect(isEmpty).toBe(false);
      expect(room.members).toHaveLength(1);
      expect(room.members[0].client.id).toBe(alice.id);
      expect(callManager.getRoomByCode(room.roomCode!)).toBe(room);
    });

    it('should delete an empty room and free its code', () => {
      const [alice] = createClients(1);
      const room = callManager.createRoom(alice);
      const code = room.roomCode!;

      const isEmpty = callManager.leaveRoom(room.id, alice.id);

      expect(isEmpty).toBe(true);
      expect(callManager.getCallById(room.id)).toBeUndefined();
      expect(callManager.getRoomByCode(code)).toBeUndefined();
    });
  });
});
