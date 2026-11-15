import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Server as HttpServer } from 'http';
import type { IncomingMessage } from 'http';

// ─── vi.hoisted — общее состояние, доступное внутри моков ───────
const h = vi.hoisted(() => {
  const wssHandlers: Record<string, Function[]> = {};

  const wssMock = {
    on(event: string, handler: Function) {
      if (!wssHandlers[event]) wssHandlers[event] = [];
      wssHandlers[event].push(handler);
    },
    _emit(event: string, ...args: unknown[]) {
      (wssHandlers[event] ?? []).forEach((fn) => fn(...args));
    },
    _reset() {
      Object.keys(wssHandlers).forEach((k) => delete wssHandlers[k]);
    },
  };

  return {
    wssMock,
    authOk: true,
    connOk: true,
    messageOk: true,
  };
});

// ─── Моки модулей ───────────────────────────────────────────────
vi.mock('../../src/security/AuthMiddleware', () => ({
  default: { validateWebSocket: () => h.authOk },
}));

vi.mock('../../src/security/RateLimiter', () => ({
  default: class {
    async checkConnection() {
      return h.connOk;
    }
    releaseConnection() {
      // stub
    }
    async checkMessage() {
      return h.messageOk;
    }
  },
}));

vi.mock('../../src/config', () => ({
  default: {
    server: { port: 8080, environment: 'test', host: '0.0.0.0' },
    security: {
      allowedOrigins: [],
      requireAuth: false,
      authToken: '',
      maxConnectionsPerIP: 5,
      rateLimitWindowMs: 60000,
      rateLimitMaxRequests: 100,
    },
    websocket: {
      maxMessageSize: 16384,
      heartbeatInterval: 30000,
      maxClients: 100,
    },
  },
}));

// WebSocket.Server должен вызываться через new → используем класс
vi.mock('ws', () => {
  class MockWSServer {
    constructor() {
      return h.wssMock as unknown as MockWSServer;
    }
  }
  class MockWebSocket {}
  (MockWebSocket as any).Server = MockWSServer;
  (MockWebSocket as any).OPEN = 1;
  return { default: MockWebSocket };
});

// ─── Фабрики хелперов ───────────────────────────────────────────
interface MockWS {
  readyState: number;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  on: (event: string, handler: Function) => void;
  _events: Record<string, Function[]>;
  _emit: (event: string, ...args: unknown[]) => void;
}

function createMockWs(): MockWS {
  const ws: MockWS = {
    readyState: 1,
    send: vi.fn(),
    close: vi.fn(),
    on(event: string, handler: Function) {
      if (!ws._events[event]) ws._events[event] = [];
      ws._events[event].push(handler);
    },
    _events: {},
    _emit(event: string, ...args: unknown[]) {
      (ws._events[event] ?? []).forEach((fn) => fn(...args));
    },
  };
  return ws;
}

async function simulateConnection(ip = '10.0.0.1'): Promise<MockWS> {
  const ws = createMockWs();
  const req = { socket: { remoteAddress: ip } } as unknown as IncomingMessage;
  h.wssMock._emit('connection', ws, req);
  await new Promise((r) => setTimeout(r, 0));
  return ws;
}

async function sendMessage(
  ws: MockWS,
  type: string,
  data?: Record<string, unknown>,
) {
  ws._emit('message', JSON.stringify({ type, data }));
  await new Promise((r) => setTimeout(r, 0));
}

function getSent(ws: MockWS): any[] {
  return ws.send.mock.calls.map((c: unknown[]) => JSON.parse(c[0] as string));
}

// ─── Модульные переменные (инициализируются в beforeEach) ───────
let SignalingServer: any;
let LobbyManager: any;
let CallManager: any;
let signalingServer: any;
let lobby: any;
let callMgr: any;

async function setupCall() {
  const ws1 = await simulateConnection('10.0.0.1');
  await sendMessage(ws1, 'lobby::join', { personalInfo: { name: 'Alice' } });
  const alice = lobby.getMemberByIp('10.0.0.1')!;

  const ws2 = await simulateConnection('10.0.0.2');
  await sendMessage(ws2, 'lobby::join', { personalInfo: { name: 'Bob' } });
  const bob = lobby.getMemberByIp('10.0.0.2')!;

  await sendMessage(ws1, 'lobby::initiate-call', { receiverId: bob.id });
  const offer = lobby.getOfferByMemberId(alice.id)!;
  await sendMessage(ws2, 'lobby::accept-offer', { offerId: offer.id });

  const call = callMgr.getClientCall(alice.id)!;
  return { ws1, ws2, call, alice, bob };
}

// ─── Тесты ──────────────────────────────────────────────────────
describe('SignalingServer', () => {
  let fileMgr: any;

  beforeEach(async () => {
    h.wssMock._reset();
    h.authOk = true;
    h.connOk = true;
    h.messageOk = true;

    SignalingServer = (
      await import('../../src/signaling-v2/SignalingServer.js')
    ).default;
    LobbyManager = (await import('../../src/signaling-v2/LobbyManager.js'))
      .default;
    CallManager = (await import('../../src/signaling-v2/CallManager.js'))
      .default;

    lobby = new LobbyManager();
    callMgr = new CallManager();
    fileMgr = {
      cleanDownloads: vi.fn().mockResolvedValue(undefined),
      cleanCallFiles: vi.fn().mockResolvedValue(undefined),
      claimAttachments: vi.fn().mockReturnValue([]),
    };

    signalingServer = new SignalingServer(
      {} as unknown as HttpServer,
      lobby,
      callMgr,
      fileMgr,
    );

    // Подключаем реестр слэш-команд
    const SlashCommandRegistry = (
      await import('../../src/signaling-v2/SlashCommands')
    ).SlashCommandRegistry;
    signalingServer.setSlashCommands(new SlashCommandRegistry());
  });

  // ─── connection ───────────────────────────────────────────────
  describe('connection', () => {
    it('should send "welcome" on new connection', async () => {
      const ws = await simulateConnection();
      expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'welcome' }));
    });

    it('should close connection if rate limiter rejects', async () => {
      h.connOk = false;
      const ws = createMockWs();
      const req = {
        socket: { remoteAddress: '1.2.3.4' },
      } as unknown as IncomingMessage;
      h.wssMock._emit('connection', ws, req);
      await new Promise((r) => setTimeout(r, 0));
      expect(ws.close).toHaveBeenCalledWith(1013, 'Too many connections');
    });

    it('should not proceed if auth validation fails', async () => {
      h.authOk = false;
      const ws = createMockWs();
      const req = {
        socket: { remoteAddress: '1.2.3.4' },
      } as unknown as IncomingMessage;
      h.wssMock._emit('connection', ws, req);
      await new Promise((r) => setTimeout(r, 0));
      expect(ws.send).not.toHaveBeenCalled();
    });
  });

  // ─── Rate limiting ────────────────────────────────────────────
  describe('rate limiting', () => {
    it('should return 429 error when message rate limit is exceeded', async () => {
      h.messageOk = false;
      const ws = await simulateConnection();
      await sendMessage(ws, 'lobby::join', { personalInfo: { name: 'Test' } });

      const err = getSent(ws).find((m: any) => m.type === 'error');
      expect(err).toBeDefined();
      expect(err.data.code).toBe(429);
    });
  });

  // ─── lobby::join ──────────────────────────────────────────────
  describe('lobby::join', () => {
    it('should add client to lobby', async () => {
      const ws = await simulateConnection();
      await sendMessage(ws, 'lobby::join', { personalInfo: { name: 'Alice' } });
      expect(lobby.getStats().totalClients).toBe(1);
    });

    it('should send me::lobby-joined to the joining client', async () => {
      const ws = await simulateConnection();
      await sendMessage(ws, 'lobby::join', { personalInfo: { name: 'Bob' } });
      const joined = getSent(ws).find(
        (m: any) => m.type === 'me::lobby-joined',
      );
      expect(joined).toBeDefined();
      expect(joined.data.client.ip).toBe('10.0.0.1');
    });

    it('should broadcast all::lobby::joined to existing members', async () => {
      const ws1 = await simulateConnection('10.0.0.1');
      await sendMessage(ws1, 'lobby::join', {
        personalInfo: { name: 'Alice' },
      });

      const ws2 = await simulateConnection('10.0.0.2');
      await sendMessage(ws2, 'lobby::join', { personalInfo: { name: 'Bob' } });

      // broadcastToLobby вызывается без excludeClientId, поэтому ws1 получает
      // два all::lobby::joined: про себя (Alice) и про Bob. Ищем сообщение про Bob.
      const joinedForBob = getSent(ws1).find(
        (m: any) =>
          m.type === 'all::lobby::joined' && m.data?.client?.ip === '10.0.0.2',
      );
      expect(joinedForBob).toBeDefined();
      expect(joinedForBob.data.client.ip).toBe('10.0.0.2');
    });
  });

  // ─── lobby::initiate-call ─────────────────────────────────────
  describe('lobby::initiate-call', () => {
    it('should send me::call-initiated to initiator and me::call-offer to receiver', async () => {
      const ws1 = await simulateConnection('10.0.0.1');
      await sendMessage(ws1, 'lobby::join', {
        personalInfo: { name: 'Alice' },
      });

      const ws2 = await simulateConnection('10.0.0.2');
      await sendMessage(ws2, 'lobby::join', { personalInfo: { name: 'Bob' } });
      const bob = lobby.getMemberByIp('10.0.0.2')!;

      await sendMessage(ws1, 'lobby::initiate-call', { receiverId: bob.id });

      expect(
        getSent(ws1).find((m: any) => m.type === 'me::call-initiated'),
      ).toBeDefined();
      expect(
        getSent(ws2).find((m: any) => m.type === 'me::call-offer'),
      ).toBeDefined();
    });

    it('should send error when calling unknown receiver', async () => {
      const ws = await simulateConnection('10.0.0.1');
      await sendMessage(ws, 'lobby::join', { personalInfo: { name: 'Alice' } });
      await sendMessage(ws, 'lobby::initiate-call', {
        receiverId: 'nonexistent',
      });

      const err = getSent(ws).find((m: any) => m.type === 'error');
      expect(err).toBeDefined();
      expect(err.data.message).toContain(
        'Пользователя с таким ID не существует',
      );
    });

    it('should send error when calling self', async () => {
      const ws = await simulateConnection('10.0.0.1');
      await sendMessage(ws, 'lobby::join', { personalInfo: { name: 'Alice' } });
      const alice = lobby.getMemberByIp('10.0.0.1')!;
      await sendMessage(ws, 'lobby::initiate-call', { receiverId: alice.id });

      const err = getSent(ws).find((m: any) => m.type === 'error');
      expect(err).toBeDefined();
      expect(err.data.message).toContain('Вы не можете позвонить сами себе');
    });

    it('should decline previous offer when initiator calls again', async () => {
      const ws1 = await simulateConnection('10.0.0.1');
      await sendMessage(ws1, 'lobby::join', {
        personalInfo: { name: 'Alice' },
      });

      const ws2 = await simulateConnection('10.0.0.2');
      await sendMessage(ws2, 'lobby::join', { personalInfo: { name: 'Bob' } });

      const alice = lobby.getMemberByIp('10.0.0.1')!;
      const bob = lobby.getMemberByIp('10.0.0.2')!;

      // Первый звонок Alice → Bob
      await sendMessage(ws1, 'lobby::initiate-call', { receiverId: bob.id });
      const offer1 = lobby.getOfferByMemberId(alice.id)!;

      // Alice звонит Charlie (новый пользователь)
      const ws3 = await simulateConnection('10.0.0.3');
      await sendMessage(ws3, 'lobby::join', {
        personalInfo: { name: 'Charlie' },
      });
      const charlie = lobby.getMemberByIp('10.0.0.3')!;

      await sendMessage(ws1, 'lobby::initiate-call', {
        receiverId: charlie.id,
      });
      const offer2 = lobby.getOfferByMemberId(alice.id)!;

      // Предыдущий оффер должен быть отклонён
      expect(lobby.getOfferById(offer1.id)).toBeUndefined();
      // Bob должен получить отклонение
      const declined = getSent(ws2).find(
        (m: any) => m.type === 'me::call-offer-declined',
      );
      expect(declined).toBeDefined();
      // Новый оффер существует
      expect(offer2).toBeDefined();
    });

    it('should decline previous offer of the receiver when someone else calls them', async () => {
      const ws1 = await simulateConnection('10.0.0.1');
      await sendMessage(ws1, 'lobby::join', {
        personalInfo: { name: 'Alice' },
      });

      const ws2 = await simulateConnection('10.0.0.2');
      await sendMessage(ws2, 'lobby::join', { personalInfo: { name: 'Bob' } });

      const ws3 = await simulateConnection('10.0.0.3');
      await sendMessage(ws3, 'lobby::join', {
        personalInfo: { name: 'Charlie' },
      });

      const bob = lobby.getMemberByIp('10.0.0.2')!;
      const charlie = lobby.getMemberByIp('10.0.0.3')!;

      // Charlie звонит Bob
      await sendMessage(ws3, 'lobby::initiate-call', { receiverId: bob.id });
      const offer1 = lobby.getOfferByMemberId(bob.id)!;

      // Alice тоже звонит Bob — оффер от Charlie должен быть отклонён
      await sendMessage(ws1, 'lobby::initiate-call', { receiverId: bob.id });

      expect(lobby.getOfferById(offer1.id)).toBeUndefined();
      const declined = getSent(ws3).find(
        (m: any) => m.type === 'me::call-offer-declined',
      );
      expect(declined).toBeDefined();
      // Новый оффер от Alice к Bob создан
      const offer2 = lobby.getOfferByMemberId(bob.id)!;
      expect(offer2).toBeDefined();
      expect(offer2.initiator.id).not.toBe(charlie.id);
    });

    it('should send error when calling a user who is already in a call', async () => {
      // Alice и Bob создают звонок
      await setupCall();

      // Charlie пытается позвонить Bob, который уже в звонке
      const ws3 = await simulateConnection('10.0.0.3');
      await sendMessage(ws3, 'lobby::join', {
        personalInfo: { name: 'Charlie' },
      });
      const bob = lobby.getMemberByIp('10.0.0.2')!;

      await sendMessage(ws3, 'lobby::initiate-call', { receiverId: bob.id });

      const err = getSent(ws3).find((m: any) => m.type === 'error');
      expect(err).toBeDefined();
      expect(err.data.message).toContain('сейчас в другом звонке');
      // Оффер не должен быть создан
      expect(lobby.getOfferByMemberId(bob.id)).toBeUndefined();
    });

    it('should send error when initiator is already in a call', async () => {
      const { ws1 } = await setupCall();

      // Charlie присоединяется к лобби
      const ws3 = await simulateConnection('10.0.0.3');
      await sendMessage(ws3, 'lobby::join', {
        personalInfo: { name: 'Charlie' },
      });
      const charlie = lobby.getMemberByIp('10.0.0.3')!;

      // Alice, которая уже в звонке, пытается позвонить Charlie
      await sendMessage(ws1, 'lobby::initiate-call', {
        receiverId: charlie.id,
      });

      const err = getSent(ws1).find((m: any) => m.type === 'error');
      expect(err).toBeDefined();
      expect(err.data.message).toContain('Вы уже в звонке');
      expect(lobby.getOfferByMemberId(charlie.id)).toBeUndefined();
    });
  });

  // ─── lobby::accept-offer ──────────────────────────────────────
  describe('lobby::accept-offer', () => {
    it('should start call and broadcast all::call::started to both members', async () => {
      const ws1 = await simulateConnection('10.0.0.1');
      await sendMessage(ws1, 'lobby::join', {
        personalInfo: { name: 'Alice' },
      });
      const alice = lobby.getMemberByIp('10.0.0.1')!;

      const ws2 = await simulateConnection('10.0.0.2');
      await sendMessage(ws2, 'lobby::join', { personalInfo: { name: 'Bob' } });
      const bob = lobby.getMemberByIp('10.0.0.2')!;

      await sendMessage(ws1, 'lobby::initiate-call', { receiverId: bob.id });
      const offer = lobby.getOfferByMemberId(alice.id)!;
      await sendMessage(ws2, 'lobby::accept-offer', { offerId: offer.id });

      expect(callMgr.getClientCall(alice.id)).toBeDefined();
      expect(callMgr.getClientCall(bob.id)).toBeDefined();
      expect(
        getSent(ws1).find((m: any) => m.type === 'all::call::started'),
      ).toBeDefined();
      expect(
        getSent(ws2).find((m: any) => m.type === 'all::call::started'),
      ).toBeDefined();
    });

    it('should send error if a third client tries to accept someone else offer', async () => {
      const ws1 = await simulateConnection('10.0.0.1');
      await sendMessage(ws1, 'lobby::join', {
        personalInfo: { name: 'Alice' },
      });

      const ws2 = await simulateConnection('10.0.0.2');
      await sendMessage(ws2, 'lobby::join', { personalInfo: { name: 'Bob' } });

      const ws3 = await simulateConnection('10.0.0.3');
      await sendMessage(ws3, 'lobby::join', {
        personalInfo: { name: 'Charlie' },
      });

      const alice = lobby.getMemberByIp('10.0.0.1')!;
      const bob = lobby.getMemberByIp('10.0.0.2')!;

      await sendMessage(ws1, 'lobby::initiate-call', { receiverId: bob.id });
      const offer = lobby.getOfferByMemberId(alice.id)!;

      await sendMessage(ws3, 'lobby::accept-offer', { offerId: offer.id });

      const err = getSent(ws3).find((m: any) => m.type === 'error');
      expect(err).toBeDefined();
    });
  });

  // ─── lobby::decline-offer ─────────────────────────────────────
  describe('lobby::decline-offer', () => {
    it('should notify initiator and remove offer', async () => {
      const ws1 = await simulateConnection('10.0.0.1');
      await sendMessage(ws1, 'lobby::join', {
        personalInfo: { name: 'Alice' },
      });

      const ws2 = await simulateConnection('10.0.0.2');
      await sendMessage(ws2, 'lobby::join', { personalInfo: { name: 'Bob' } });

      const alice = lobby.getMemberByIp('10.0.0.1')!;
      const bob = lobby.getMemberByIp('10.0.0.2')!;

      await sendMessage(ws1, 'lobby::initiate-call', { receiverId: bob.id });
      const offer = lobby.getOfferByMemberId(alice.id)!;

      await sendMessage(ws2, 'lobby::decline-offer', { offerId: offer.id });

      expect(
        getSent(ws1).find((m: any) => m.type === 'me::call-offer-declined'),
      ).toBeDefined();
      expect(lobby.getOfferById(offer.id)).toBeUndefined();
    });
  });

  // ─── lobby::update-profile ────────────────────────────────────
  describe('lobby::update-profile', () => {
    it('should update personalInfo and broadcast all::lobby::profile-updated', async () => {
      const ws1 = await simulateConnection('10.0.0.1');
      await sendMessage(ws1, 'lobby::join', {
        personalInfo: { name: 'Alice' },
      });

      const ws2 = await simulateConnection('10.0.0.2');
      await sendMessage(ws2, 'lobby::join', { personalInfo: { name: 'Bob' } });

      await sendMessage(ws2, 'lobby::update-profile', {
        personalInfo: { name: 'Bobby', avatar: 'new-avatar' },
      });

      const bob = lobby.getMemberByIp('10.0.0.2')!;
      expect(bob.personalInfo.name).toBe('Bobby');
      expect(bob.personalInfo.avatar).toBe('new-avatar');

      const updatedMsg = getSent(ws1).find(
        (m: any) => m.type === 'all::lobby::profile-updated',
      );
      expect(updatedMsg).toBeDefined();
      expect(updatedMsg.data.client.id).toBe(bob.id);
      expect(updatedMsg.data.client.personalInfo.name).toBe('Bobby');
      expect(updatedMsg.data.lobbyInfo.members).toHaveLength(2);
    });

    it('should broadcast all::call::profile-updated when client is in a call', async () => {
      const { ws1, ws2, alice } = await setupCall();

      await sendMessage(ws1, 'lobby::update-profile', {
        personalInfo: { name: 'Alice2' },
      });

      const callMsg = getSent(ws2).find(
        (m: any) => m.type === 'all::call::profile-updated',
      );
      expect(callMsg).toBeDefined();
      expect(callMsg.data.client.id).toBe(alice.id);
      expect(callMsg.data.callInfo).toBeDefined();

      // Данные участника в звонке тоже обновились
      const member = callMgr.getMemberById(callMsg.data.callInfo.id, alice.id);
      expect(member.client.personalInfo.name).toBe('Alice2');
    });

    it('should send error when client is not in the lobby', async () => {
      const ws = await simulateConnection('10.0.0.1');
      await sendMessage(ws, 'lobby::update-profile', {
        personalInfo: { name: 'Ghost' },
      });

      const err = getSent(ws).find((m: any) => m.type === 'error');
      expect(err).toBeDefined();
      expect(err.data.message).toContain('Вы не в лобби');
    });
  });

  // ─── call::end ────────────────────────────────────────────────
  describe('call::end', () => {
    it('should broadcast all::call::ended and remove call', async () => {
      const { ws1, ws2, call } = await setupCall();

      await sendMessage(ws1, 'call::end', { callId: call.id });

      expect(
        getSent(ws2).find((m: any) => m.type === 'all::call::ended'),
      ).toBeDefined();
      expect(callMgr.getCallById(call.id)).toBeUndefined();
    });

    it('should clean files only for the ended call', async () => {
      const { ws1, call } = await setupCall();
      const spy = fileMgr.cleanCallFiles;

      await sendMessage(ws1, 'call::end', { callId: call.id });

      expect(spy).toHaveBeenCalledWith(call.id);
    });
  });

  // ─── call::mute ───────────────────────────────────────────────
  describe('call::mute', () => {
    it('should broadcast mute-changed to the other member', async () => {
      const { ws1, ws2, call } = await setupCall();
      await sendMessage(ws1, 'call::mute', { callId: call.id, status: true });

      const mute = getSent(ws2).find(
        (m: any) => m.type === 'all::call::mute-changed',
      );
      expect(mute).toBeDefined();
      expect(mute.data.isMuted).toBe(true);
    });

    it('should reset speaking state when muting', async () => {
      const { ws1, ws2, call, alice } = await setupCall();
      await sendMessage(ws1, 'call::speaking', {
        callId: call.id,
        status: true,
      });
      await sendMessage(ws1, 'call::mute', { callId: call.id, status: true });

      const mute = getSent(ws2)
        .filter((m: any) => m.type === 'all::call::mute-changed')
        .pop();
      const member = mute.data.callInfo.members.find(
        (mem: any) => mem.client.id === alice.id,
      );

      expect(member.isMuted).toBe(true);
      expect(member.isSpeaking).toBe(false);
    });
  });

  // ─── call::speaking ───────────────────────────────────────────
  describe('call::speaking', () => {
    it('should broadcast speaking-changed to the other member', async () => {
      const { ws1, ws2, call } = await setupCall();
      await sendMessage(ws1, 'call::speaking', {
        callId: call.id,
        status: true,
      });

      const speak = getSent(ws2).find(
        (m: any) => m.type === 'all::call::speaking-changed',
      );
      expect(speak).toBeDefined();
      expect(speak.data.isSpeaking).toBe(true);
    });
  });

  // ─── call::send-message ───────────────────────────────────────
  describe('call::send-message', () => {
    it('should broadcast new-message to the other member', async () => {
      const { ws1, ws2, call } = await setupCall();
      await sendMessage(ws1, 'call::send-message', {
        callId: call.id,
        text: 'Hello Bob!',
      });

      const newMsg = getSent(ws2).find(
        (m: any) => m.type === 'all::call::new-message',
      );
      expect(newMsg).toBeDefined();
      expect(newMsg.data.text).toBe('Hello Bob!');
    });

    it('should send error if text is empty', async () => {
      const { ws1, call } = await setupCall();
      await sendMessage(ws1, 'call::send-message', {
        callId: call.id,
        text: '',
      });

      const err = getSent(ws1).find((m: any) => m.type === 'error');
      expect(err).toBeDefined();
    });

    it('should attach pre-uploaded files to the message', async () => {
      const { ws1, ws2, call, alice } = await setupCall();
      fileMgr.claimAttachments.mockReturnValue([
        { id: 'file-1', fileName: 'doc.pdf', fileSize: 1024 },
        { id: 'file-2', fileName: 'photo.png', fileSize: 2048 },
      ]);

      await sendMessage(ws1, 'call::send-message', {
        callId: call.id,
        text: 'Смотрите',
        attachmentIds: ['file-1', 'file-2'],
      });

      expect(fileMgr.claimAttachments).toHaveBeenCalledWith(
        ['file-1', 'file-2'],
        alice.id,
        call.id,
      );
      const newMsg = getSent(ws2).find(
        (m: any) => m.type === 'all::call::new-message',
      );
      expect(newMsg.data.text).toBe('Смотрите');
      expect(newMsg.data.attachments).toHaveLength(2);
      expect(newMsg.data.attachments[0].fileName).toBe('doc.pdf');
    });

    it('should allow a message with only attachments', async () => {
      const { ws1, ws2, call } = await setupCall();
      fileMgr.claimAttachments.mockReturnValue([
        { id: 'file-1', fileName: 'doc.pdf', fileSize: 1024 },
      ]);

      await sendMessage(ws1, 'call::send-message', {
        callId: call.id,
        text: '',
        attachmentIds: ['file-1'],
      });

      const newMsg = getSent(ws2).find(
        (m: any) => m.type === 'all::call::new-message',
      );
      expect(newMsg).toBeDefined();
      expect(newMsg.data.attachments).toHaveLength(1);
    });

    it('should treat a slash command with attachments as plain text', async () => {
      const { ws1, ws2, call } = await setupCall();
      fileMgr.claimAttachments.mockReturnValue([
        { id: 'file-1', fileName: 'doc.pdf', fileSize: 1024 },
      ]);

      await sendMessage(ws1, 'call::send-message', {
        callId: call.id,
        text: '/play https://example.com/watch?v=1',
        attachmentIds: ['file-1'],
      });

      const newMsg = getSent(ws2).find(
        (m: any) => m.type === 'all::call::new-message',
      );
      expect(newMsg.data.text).toBe('/play https://example.com/watch?v=1');
      expect(
        getSent(ws1).find((m: any) => m.type === 'me::command-status'),
      ).toBeUndefined();
    });

    it('should send error if attachment cannot be claimed', async () => {
      const { ws1, call } = await setupCall();
      const claimError: any = new Error('Файл уже прикреплён к сообщению');
      claimError.status = 409;
      fileMgr.claimAttachments.mockImplementation(() => {
        throw claimError;
      });

      await sendMessage(ws1, 'call::send-message', {
        callId: call.id,
        text: 'Текст',
        attachmentIds: ['file-1'],
      });

      const err = getSent(ws1).find((m: any) => m.type === 'error');
      expect(err).toBeDefined();
      expect(err.data.message).toBe('Файл уже прикреплён к сообщению');
    });
  });

  // ─── screen sharing ───────────────────────────────────────────
  describe('screen sharing', () => {
    it('should broadcast screen-share-started', async () => {
      const { ws1, ws2, call } = await setupCall();
      await sendMessage(ws1, 'call::start-screen-sharing', { callId: call.id });

      expect(
        getSent(ws2).find(
          (m: any) => m.type === 'all::call::screen-share-started',
        ),
      ).toBeDefined();
    });

    it('should broadcast screen-share-stopped', async () => {
      const { ws1, ws2, call } = await setupCall();
      await sendMessage(ws1, 'call::stop-screen-sharing', { callId: call.id });

      expect(
        getSent(ws2).find(
          (m: any) => m.type === 'all::call::screen-share-stopped',
        ),
      ).toBeDefined();
    });
  });

  // ─── call::online ─────────────────────────────────────────────
  describe('call::online', () => {
    it('should broadcast online-changed to the other member', async () => {
      const { ws1, ws2, call } = await setupCall();
      await sendMessage(ws1, 'call::online', {
        callId: call.id,
        status: false,
      });

      const online = getSent(ws2).find(
        (m: any) => m.type === 'all::call::online-changed',
      );
      expect(online).toBeDefined();
      expect(online.data.isOnline).toBe(false);
    });
  });

  // ─── Invalid JSON ─────────────────────────────────────────────
  describe('invalid message format', () => {
    it('should send error for malformed JSON', async () => {
      const ws = await simulateConnection();
      ws._emit('message', 'not json at all {{{');

      const err = getSent(ws).find((m: any) => m.type === 'error');
      expect(err).toBeDefined();
      expect(err.data.code).toBe(400);
    });
  });

  // ─── Unknown message type ─────────────────────────────────────
  describe('unknown message type', () => {
    it('should silently ignore unknown type', async () => {
      const ws = await simulateConnection();
      await sendMessage(ws, 'some::unknown-type', {});

      expect(getSent(ws).find((m: any) => m.type === 'error')).toBeUndefined();
    });
  });

  // ─── Message handler registry ─────────────────────────────────
  describe('message handler registry', () => {
    it('should have a handler for every MESSAGE_TYPES.RECEIVE type and no extras', async () => {
      const MESSAGE_TYPES = (await import('../../src/constants/message-types'))
        .default;

      // Собираем все ожидаемые типы из MESSAGE_TYPES.RECEIVE
      const expectedTypes: string[] = [];
      for (const group of Object.values(MESSAGE_TYPES.RECEIVE)) {
        for (const type of Object.values(group as Record<string, string>)) {
          expectedTypes.push(type);
        }
      }

      const registry: Record<string, unknown> =
        signalingServer['messageHandlers'];
      const registryKeys = Object.keys(registry);

      // Каждый ожидаемый тип имеет обработчик
      for (const type of expectedTypes) {
        expect(registry[type], `missing handler for "${type}"`).toBeTypeOf(
          'function',
        );
      }

      // В реестре нет лишних ключей
      for (const key of registryKeys) {
        expect(expectedTypes, `unexpected handler key "${key}"`).toContain(key);
      }

      // Количество совпадает
      expect(registryKeys.length).toBe(expectedTypes.length);
    });
  });

  // ─── Disconnect ───────────────────────────────────────────────
  describe('close event', () => {
    it('should remove member and broadcast client-disconnected', async () => {
      const ws1 = await simulateConnection('10.0.0.1');
      await sendMessage(ws1, 'lobby::join', {
        personalInfo: { name: 'Alice' },
      });

      const ws2 = await simulateConnection('10.0.0.2');
      await sendMessage(ws2, 'lobby::join', { personalInfo: { name: 'Bob' } });

      ws1._emit('close');

      expect(lobby.getMemberByIp('10.0.0.1')).toBeUndefined();
      const disc = getSent(ws2).find(
        (m: any) => m.type === 'all::lobby::client-disconnected',
      );
      expect(disc).toBeDefined();
    });

    it('should decline pending offer on disconnect', async () => {
      const ws1 = await simulateConnection('10.0.0.1');
      await sendMessage(ws1, 'lobby::join', {
        personalInfo: { name: 'Alice' },
      });

      const ws2 = await simulateConnection('10.0.0.2');
      await sendMessage(ws2, 'lobby::join', { personalInfo: { name: 'Bob' } });

      const alice = lobby.getMemberByIp('10.0.0.1')!;
      const bob = lobby.getMemberByIp('10.0.0.2')!;

      await sendMessage(ws1, 'lobby::initiate-call', { receiverId: bob.id });
      const offer = lobby.getOfferByMemberId(alice.id)!;

      ws1._emit('close');

      expect(lobby.getOfferById(offer.id)).toBeUndefined();
    });

    it('should release connection slot on disconnect', async () => {
      const ws1 = await simulateConnection('10.0.0.1');
      await sendMessage(ws1, 'lobby::join', {
        personalInfo: { name: 'Alice' },
      });

      const releaseSpy = vi.spyOn(
        signalingServer.rateLimiter,
        'releaseConnection',
      );
      ws1._emit('close');

      expect(releaseSpy).toHaveBeenCalledWith('10.0.0.1');
      releaseSpy.mockRestore();
    });
  });

  // ─── getStats ─────────────────────────────────────────────────
  describe('getStats', () => {
    it('should return totalClients from lobby', async () => {
      const ws = await simulateConnection('10.0.0.1');
      await sendMessage(ws, 'lobby::join', { personalInfo: { name: 'A' } });

      expect(signalingServer.getStats().totalClients).toBe(1);
    });
  });

  // ─── clearStaleClients ────────────────────────────────────────
  describe('clearStaleClients', () => {
    it('should remove clients with non-OPEN websocket', async () => {
      const ws1 = await simulateConnection('10.0.0.1');
      await sendMessage(ws1, 'lobby::join', {
        personalInfo: { name: 'Alice' },
      });

      const ws2 = await simulateConnection('10.0.0.2');
      await sendMessage(ws2, 'lobby::join', { personalInfo: { name: 'Bob' } });

      expect(lobby.getStats().totalClients).toBe(2);

      // Имитируем зависание ws1
      (ws1 as any).readyState = 2; // CLOSING

      lobby.clearStaleClients();

      expect(lobby.getStats().totalClients).toBe(1);
      expect(lobby.getMemberByIp('10.0.0.1')).toBeUndefined();
      expect(lobby.getMemberByIp('10.0.0.2')).toBeDefined();
    });
  });

  // ─── getAllCalls ──────────────────────────────────────────────
  describe('getAllCalls', () => {
    it('should return all active calls', async () => {
      expect(callMgr.getAllCalls()).toHaveLength(0);

      const { call } = await setupCall();

      expect(callMgr.getAllCalls()).toHaveLength(1);
      expect(callMgr.getAllCalls()[0].id).toBe(call.id);
    });
  });

  // ─── Slash commands ───────────────────────────────────────────
  describe('slash commands', () => {
    it('should execute /help and send system message to initiator only', async () => {
      const { ws1, ws2, call } = await setupCall();

      await sendMessage(ws1, 'call::send-message', {
        callId: call.id,
        text: '/help',
      });

      // Сообщение пришло инициатору (ws1)
      const helpMsg = getSent(ws1).find(
        (m: any) => m.type === 'all::call::new-message',
      );
      expect(helpMsg).toBeDefined();
      expect(helpMsg.data.isSystem).toBe(true);
      expect(helpMsg.data.text).toContain('Доступные команды');

      // Сообщение НЕ пришло собеседнику (ws2)
      const sentToOther = getSent(ws2).find(
        (m: any) => m.type === 'all::call::new-message',
      );
      expect(sentToOther).toBeUndefined();
    });

    it('should mark slash command response as isSystem', async () => {
      const { ws1, call } = await setupCall();

      await sendMessage(ws1, 'call::send-message', {
        callId: call.id,
        text: '/help',
      });

      const helpMsg = getSent(ws1).find(
        (m: any) => m.type === 'all::call::new-message',
      );
      expect(helpMsg).toBeDefined();
      expect(helpMsg.data.isSystem).toBe(true);
    });

    it('should send error message for unknown command to initiator only', async () => {
      const { ws1, ws2, call } = await setupCall();

      await sendMessage(ws1, 'call::send-message', {
        callId: call.id,
        text: '/unknown-cmd',
      });

      // Ошибка пришла инициатору
      const errMsg = getSent(ws1).find(
        (m: any) => m.type === 'all::call::new-message',
      );
      expect(errMsg).toBeDefined();
      expect(errMsg.data.isSystem).toBe(true);
      expect(errMsg.data.text).toContain('не найдена');

      // Собеседник не получил ничего
      const sentToOther = getSent(ws2).find(
        (m: any) => m.type === 'all::call::new-message',
      );
      expect(sentToOther).toBeUndefined();
    });

    it('should not intercept regular messages starting with /', async () => {
      const { ws1, ws2, call } = await setupCall();

      await sendMessage(ws1, 'call::send-message', {
        callId: call.id,
        text: 'https://example.com/path',
      });

      const msg = getSent(ws2).find(
        (m: any) => m.type === 'all::call::new-message',
      );
      expect(msg).toBeDefined();
      expect(msg.data.isSystem).toBe(false);
      expect(msg.data.text).toBe('https://example.com/path');
    });

    it('should include senderName in slash command response', async () => {
      const { ws1, call, alice } = await setupCall();

      await sendMessage(ws1, 'call::send-message', {
        callId: call.id,
        text: '/help',
      });

      // Системное сообщение содержит имя отправителя (пользователь, введший команду)
      const helpMsg = getSent(ws1).find(
        (m: any) => m.type === 'all::call::new-message' && m.data.isSystem,
      );
      expect(helpMsg).toBeDefined();
      expect(helpMsg.data.senderName).toBe(alice.personalInfo.name);
    });
  });

  // ─── Музыкальная очередь ──────────────────────────────────────
  describe('music queue', () => {
    let music: any;

    beforeEach(async () => {
      music = (
        await import('../../src/app/modules/music-player/music-player.service.js')
      ).default;
    });

    function lastMusicState(ws: MockWS) {
      const sent = getSent(ws).filter(
        (m: any) => m.type === 'all::call::music-state-changed',
      );
      return sent[sent.length - 1];
    }

    it('should move to the next track and broadcast the queue', async () => {
      const { ws1, ws2, call } = await setupCall();
      music.forCall(call.id).startQueue([
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
        { url: 'https://y/3', title: 'Three' },
      ]);

      await sendMessage(ws1, 'call::music-next', {
        callId: call.id,
        expectedIndex: 0,
      });

      expect(music.forCall(call.id).queueIndex).toBe(1);
      expect(lastMusicState(ws1).data.queueIndex).toBe(1);
      expect(lastMusicState(ws2).data.queueIndex).toBe(1);
      expect(lastMusicState(ws1).data.track.url).toBe('https://y/2');
    });

    it('should broadcast the whole queue to every participant', async () => {
      const { ws1, ws2, call } = await setupCall();
      music.forCall(call.id).startQueue([
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
      ]);

      await sendMessage(ws1, 'call::music-play', { callId: call.id });

      for (const ws of [ws1, ws2]) {
        const state = lastMusicState(ws).data;
        expect(state.status).toBe('playing');
        expect(state.queue).toHaveLength(2);
        expect(state.queue[0].title).toBe('One');
      }
    });

    it('should move back to the previous track', async () => {
      const { ws1, call } = await setupCall();
      music.forCall(call.id).startQueue([
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
      ]);
      music.forCall(call.id).next();

      await sendMessage(ws1, 'call::music-prev', {
        callId: call.id,
        expectedIndex: 1,
      });

      expect(music.forCall(call.id).queueIndex).toBe(0);
      expect(lastMusicState(ws1).data.queueIndex).toBe(0);
    });

    it('should ignore a skip when the client index is stale', async () => {
      const { ws1, call } = await setupCall();
      music.forCall(call.id).startQueue([
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
        { url: 'https://y/3', title: 'Three' },
      ]);

      // Оба участника нажали «дальше» одновременно: второй запрос устарел
      await sendMessage(ws1, 'call::music-next', {
        callId: call.id,
        expectedIndex: 0,
      });
      await sendMessage(ws1, 'call::music-next', {
        callId: call.id,
        expectedIndex: 0,
      });

      expect(music.forCall(call.id).queueIndex).toBe(1);
      // Устаревший запрос лишь вернул актуальное состояние
      expect(lastMusicState(ws1).data.queueIndex).toBe(1);
    });

    it('should keep the first track when going back from it', async () => {
      const { ws1, call } = await setupCall();
      music.forCall(call.id).startQueue([
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
      ]);

      await sendMessage(ws1, 'call::music-prev', {
        callId: call.id,
        expectedIndex: 0,
      });

      expect(music.forCall(call.id).queueIndex).toBe(0);
      expect(lastMusicState(ws1).data.queueIndex).toBe(0);
    });

    it('should stop the player after the last track', async () => {
      const { ws1, call } = await setupCall();
      music.forCall(call.id).startQueue([
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
      ]);

      await sendMessage(ws1, 'call::music-next', {
        callId: call.id,
        expectedIndex: 0,
      });
      await sendMessage(ws1, 'call::music-next', {
        callId: call.id,
        expectedIndex: 1,
      });

      expect(music.forCall(call.id).status).toBe('idle');
      expect(lastMusicState(ws1).data.status).toBe('idle');
      expect(lastMusicState(ws1).data.queue).toEqual([]);
    });

    it('should ignore skips when nothing is queued', async () => {
      const { ws1, call } = await setupCall();

      await sendMessage(ws1, 'call::music-next', {
        callId: call.id,
        expectedIndex: 0,
      });

      expect(
        getSent(ws1).some(
          (m: any) => m.type === 'all::call::music-state-changed',
        ),
      ).toBe(false);
    });

    it('should reset the player when the call ends', async () => {
      const { ws1, call } = await setupCall();
      music.forCall(call.id).startQueue([
        { url: 'https://y/1', title: 'One' },
        { url: 'https://y/2', title: 'Two' },
      ]);

      await sendMessage(ws1, 'call::end', { callId: call.id });

      // Плеер завершённого звонка удаляется из реестра целиком
      expect(music.get(call.id)).toBeUndefined();
    });
  });

  // ─── Статус выполнения слэш-команд ────────────────────────────
  describe('command status', () => {
    beforeEach(async () => {
      signalingServer.getSlashCommands()!.register({
        name: 'staged',
        description: 'Команда со стадиями',
        handler: async (
          args: string,
          _id: string,
          _callId: string,
          report: (t: string) => void,
        ) => {
          report('Читаю плейлист…');
          report('Ставлю треки в очередь…');
          return { text: `готово: ${args}` };
        },
      });
    });

    it('should report stages only to the command initiator', async () => {
      const { ws1, ws2, call } = await setupCall();

      await sendMessage(ws1, 'call::send-message', {
        callId: callIdOf(ws1),
        text: '/staged ok',
      });

      const statuses = getSent(ws1).filter(
        (m: any) => m.type === 'me::command-status',
      );

      expect(statuses.map((m: any) => m.data.status)).toEqual([
        'started',
        'running',
        'running',
        'done',
      ]);
      expect(statuses[0].data.command).toBe('staged');
      expect(statuses[1].data.text).toBe('Читаю плейлист…');
      expect(statuses[2].data.text).toBe('Ставлю треки в очередь…');
      expect(statuses[3].data.text).toBe('');

      // Второй участник не видит статусов чужой команды
      expect(
        getSent(ws2).some((m: any) => m.type === 'me::command-status'),
      ).toBe(false);

      // Ответ команды приходит только инициатору
      const answer = getSent(ws1).find(
        (m: any) => m.type === 'all::call::new-message' && m.data.isSystem,
      );
      expect(answer.data.text).toBe('готово: ok');
      expect(
        getSent(ws2).some(
          (m: any) => m.type === 'all::call::new-message' && m.data.isSystem,
        ),
      ).toBe(false);
    });

    it('should report done even when the command throws', async () => {
      signalingServer.getSlashCommands()!.register({
        name: 'boom',
        description: 'Падающая команда',
        handler: async () => {
          throw new Error('сбой yt-dlp');
        },
      });

      const ws1 = await simulateConnection('10.0.0.1');
      await sendMessage(ws1, 'lobby::join', {
        personalInfo: { name: 'Alice' },
      });
      const ws2 = await simulateConnection('10.0.0.2');
      await sendMessage(ws2, 'lobby::join', { personalInfo: { name: 'Bob' } });

      const alice = lobby.getMemberByIp('10.0.0.1')!;
      const bob = lobby.getMemberByIp('10.0.0.2')!;
      await sendMessage(ws1, 'lobby::initiate-call', { receiverId: bob.id });
      const offer = lobby.getOfferByMemberId(alice.id)!;
      await sendMessage(ws2, 'lobby::accept-offer', { offerId: offer.id });

      await sendMessage(ws1, 'call::send-message', {
        callId: callIdOf(ws1),
        text: '/boom',
      });

      const statuses = getSent(ws1).filter(
        (m: any) => m.type === 'me::command-status',
      );
      expect(statuses.map((m: any) => m.data.status)).toEqual([
        'started',
        'done',
      ]);

      // Ошибка команды доходит до инициаторав виде системного сообщения
      const error = getSent(ws1).find(
        (m: any) => m.type === 'all::call::new-message' && m.data.isSystem,
      );
      expect(error.data.text).toContain('сбой yt-dlp');
    });
  });
  // ─── Групповые комнаты ────────────────────────────────────────
  describe('rooms', () => {
    async function createRoom(
      ip = '10.2.0.1',
      name = 'Alice',
    ): Promise<{ ws: MockWS; call: any }> {
      const ws = await simulateConnection(ip);
      await sendMessage(ws, 'lobby::join', { personalInfo: { name } });
      await sendMessage(ws, 'lobby::create-room');

      const created = getSent(ws).find(
        (m: any) => m.type === 'me::room-created',
      );
      const call = callMgr.getCallById(created.data.callInfo.id);

      return { ws, call };
    }

    it('should create a room and send me::room-created', async () => {
      const { ws, call } = await createRoom();

      const created = getSent(ws).find(
        (m: any) => m.type === 'me::room-created',
      );

      expect(created).toBeDefined();
      expect(created.data.callInfo.type).toBe('group');
      expect(created.data.callInfo.roomCode).toBe(call.roomCode);
      expect(callMgr.getRoomByCode(call.roomCode)).toBe(call);
    });

    it('should let a second client join by code', async () => {
      const { ws: hostWs, call } = await createRoom();

      const guestWs = await simulateConnection('10.2.0.2');
      await sendMessage(guestWs, 'lobby::join', {
        personalInfo: { name: 'Bob' },
      });
      await sendMessage(guestWs, 'lobby::join-room', {
        code: call.roomCode.toLowerCase(),
      });

      const joined = getSent(guestWs).find(
        (m: any) => m.type === 'me::room-joined',
      );
      expect(joined).toBeDefined();
      expect(joined.data.callInfo.members).toHaveLength(2);
      expect(call.members).toHaveLength(2);

      const memberJoined = getSent(hostWs).find(
        (m: any) => m.type === 'all::call::member-joined',
      );
      expect(memberJoined).toBeDefined();
      expect(memberJoined.data.client.id).toBe(
        lobby.getMemberByIp('10.2.0.2')!.id,
      );
    });

    it('should decline a pending direct offer when creating a room', async () => {
      const ws1 = await simulateConnection('10.2.0.1');
      await sendMessage(ws1, 'lobby::join', {
        personalInfo: { name: 'Alice' },
      });

      const ws2 = await simulateConnection('10.2.0.2');
      await sendMessage(ws2, 'lobby::join', {
        personalInfo: { name: 'Bob' },
      });
      const bob = lobby.getMemberByIp('10.2.0.2')!;

      await sendMessage(ws1, 'lobby::initiate-call', {
        receiverId: bob.id,
      });
      const offer = lobby.getOfferByMemberId(bob.id)!;
      expect(offer).toBeDefined();

      await sendMessage(ws2, 'lobby::create-room');

      expect(lobby.getOfferById(offer.id)).toBeUndefined();
      expect(
        getSent(ws1).find(
          (m: any) => m.type === 'me::call-offer-declined',
        ),
      ).toBeDefined();
      expect(
        getSent(ws2).find(
          (m: any) => m.type === 'me::call-offer-declined',
        ),
      ).toBeDefined();
    });

    it('should send an error for an unknown room code', async () => {
      const ws = await simulateConnection('10.2.0.1');
      await sendMessage(ws, 'lobby::join', {
        personalInfo: { name: 'Alice' },
      });
      await sendMessage(ws, 'lobby::join-room', { code: 'ZZZZZZ' });

      const error = getSent(ws).find((m: any) => m.type === 'error');
      expect(error).toBeDefined();
      expect(error.data.message).toContain('Комната не найдена');
    });

    it('should include chat history when joining a room', async () => {
      const { ws: hostWs, call } = await createRoom();

      await sendMessage(hostWs, 'call::send-message', {
        callId: call.id,
        text: 'Привет, комната!',
      });

      const guestWs = await simulateConnection('10.2.0.2');
      await sendMessage(guestWs, 'lobby::join', {
        personalInfo: { name: 'Bob' },
      });
      await sendMessage(guestWs, 'lobby::join-room', {
        code: call.roomCode,
      });

      const joined = getSent(guestWs).find(
        (m: any) => m.type === 'me::room-joined',
      );
      expect(joined.data.messages).toHaveLength(1);
      expect(joined.data.messages[0].text).toBe('Привет, комната!');
    });

    it('should send the current music state to a late joiner', async () => {
      const { call } = await createRoom();

      const music = (
        await import('../../src/app/modules/music-player/music-player.service.js')
      ).default;
      music.forCall(call.id).startQueue([
        { url: 'https://y/1', title: 'Room track' },
      ]);

      const guestWs = await simulateConnection('10.2.0.2');
      await sendMessage(guestWs, 'lobby::join', {
        personalInfo: { name: 'Bob' },
      });
      await sendMessage(guestWs, 'lobby::join-room', {
        code: call.roomCode,
      });

      const state = getSent(guestWs).find(
        (m: any) => m.type === 'all::call::music-state-changed',
      );
      expect(state).toBeDefined();
      expect(state.data.track.title).toBe('Room track');

      music.destroy(call.id);
    });

    it('should let one member leave without ending the room', async () => {
      const { ws: hostWs, call } = await createRoom();

      const guestWs = await simulateConnection('10.2.0.2');
      await sendMessage(guestWs, 'lobby::join', {
        personalInfo: { name: 'Bob' },
      });
      await sendMessage(guestWs, 'lobby::join-room', {
        code: call.roomCode,
      });

      await sendMessage(guestWs, 'call::leave', { callId: call.id });

      const memberLeft = getSent(hostWs).find(
        (m: any) => m.type === 'all::call::member-left',
      );
      expect(memberLeft).toBeDefined();
      expect(call.members).toHaveLength(1);
      expect(call.members[0].client.id).toBe(
        lobby.getMemberByIp('10.2.0.1')!.id,
      );
    });

    it('should delete the room when the last member leaves', async () => {
      const { ws, call } = await createRoom();

      await sendMessage(ws, 'call::leave', { callId: call.id });

      expect(callMgr.getCallById(call.id)).toBeUndefined();
      expect(callMgr.getRoomByCode(call.roomCode)).toBeUndefined();
    });

    it('should remove a disconnected member from the room', async () => {
      const { ws: hostWs, call } = await createRoom();

      const guestWs = await simulateConnection('10.2.0.2');
      await sendMessage(guestWs, 'lobby::join', {
        personalInfo: { name: 'Bob' },
      });
      await sendMessage(guestWs, 'lobby::join-room', {
        code: call.roomCode,
      });

      guestWs._emit('close');

      const memberLeft = getSent(hostWs).find(
        (m: any) => m.type === 'all::call::member-left',
      );
      expect(memberLeft).toBeDefined();
      expect(call.members).toHaveLength(1);
    });

    it('should allow only one screen sharer in a room', async () => {
      const { ws: hostWs, call } = await createRoom();

      const guestWs = await simulateConnection('10.2.0.2');
      await sendMessage(guestWs, 'lobby::join', {
        personalInfo: { name: 'Bob' },
      });
      await sendMessage(guestWs, 'lobby::join-room', {
        code: call.roomCode,
      });

      await sendMessage(hostWs, 'call::start-screen-sharing', {
        callId: call.id,
      });
      await sendMessage(guestWs, 'call::start-screen-sharing', {
        callId: call.id,
      });

      const error = getSent(guestWs).find((m: any) => m.type === 'error');
      expect(error).toBeDefined();
      expect(error.data.message).toContain('Кто-то уже демонстрирует экран');
    });
  });

});

/** callId активного звонка участника, подключённого к mock-сокету */
function callIdOf(ws: MockWS): string {
  const sent = getSent(ws);
  for (let i = sent.length - 1; i >= 0; i -= 1) {
    const msg = sent[i];
    if (msg.type === 'all::call::started') return msg.data.callInfo.id;
  }
  throw new Error('Звонок не найден в отправленных сообщениях');
}
