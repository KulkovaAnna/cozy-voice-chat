import WebSocket from 'ws';
import type { Server as HttpServer } from 'http';
import type { IncomingMessage } from 'http';
import AuthMiddleware from '../security/AuthMiddleware';
import RateLimiter from '../security/RateLimiter';
import config from '../config';
import PersonalInfo from '../models/PersonalInfo';
import MESSAGE_TYPES from '../constants/message-types';
import ERROR_CODES from '../constants/error-codes';
import Helpers from '../utils/helpers';
import musicPlayerService from '../app/modules/music-player/music-player.service';
import type LobbyManager from './LobbyManager';
import CallManager from './CallManager';
import type Call from '../models/Call';
import type CallOffer from '../models/CallOffer';
import type FileManagerService from '../app/modules/file-manager/file-manager.service';
import type {
  FileAttachment,
  IncomingWsMessage,
  OutgoingMessage,
  PersonalInfoData,
} from '../types';
import type { MessageHandler } from './message-handlers';
import { SlashCommandRegistry } from './SlashCommands';
import type { SlashCommandResult } from './SlashCommands/types';

export default class SignalingServer {
  /** Сколько последних сообщений отдавать при входе/возврате в звонок */
  private static readonly MAX_CALL_HISTORY = 50;

  private wss: WebSocket.Server;
  private lobbyManager: LobbyManager;
  private callManager: CallManager;
  private fileManager: FileManagerService;
  private messageHandlers: Record<string, MessageHandler>;
  private slashCommands: SlashCommandRegistry | null = null;
  public rateLimiter = new RateLimiter();

  constructor(
    server: HttpServer,
    lobbyManager: LobbyManager,
    callManager: CallManager,
    fileManager: FileManagerService,
  ) {
    this.wss = new WebSocket.Server({
      server,
      maxPayload: config.websocket.maxMessageSize,
    });
    this.lobbyManager = lobbyManager;
    this.callManager = callManager;
    this.fileManager = fileManager;
    this.messageHandlers = this.createMessageHandlers();
    this.setupWebSocket();
  }

  private setupWebSocket(): void {
    this.wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
      if (!AuthMiddleware.validateWebSocket(ws, req)) {
        return;
      }

      const ip = req.socket.remoteAddress ?? '';
      if (!(await this.rateLimiter.checkConnection(ip))) {
        ws.close(1013, 'Too many connections');
        return;
      }

      console.info(`Участник сети ${ip} подключился`);

      this.sendToClient(ws, {
        type: 'welcome',
      });

      // Setup message handler
      ws.on('message', async (message: WebSocket.RawData) => {
        try {
          const parsed = JSON.parse(message.toString()) as IncomingWsMessage;
          await this.handleMessage(ws, ip, parsed);
        } catch (error) {
          console.error('Invalid message format:', error);
          this.sendToClient(ws, {
            type: 'error',
            data: {
              message: 'Invalid message format',
              code: 400,
            },
          });
        }
      });

      // Setup close handler
      ws.on('close', () => {
        // Освободить слот подключения (откатить потраченное очко)
        const ip = req.socket.remoteAddress ?? '';
        this.rateLimiter.releaseConnection(ip);

        const clientData = this.lobbyManager.getMemberByWs(ws);
        if (!clientData) return;
        const memberCall = this.callManager.getClientCall(clientData.id);
        if (!memberCall) {
          // Ушедший мог быть инициатором или получателем висящих офферов:
          // вторые стороны должны закрыть модалки ожидания/входящего.
          this.declineOffersFor(clientData.id);
        }
        this.lobbyManager.removeMember(ws);

        if (memberCall) {
          // Отключение (закрытие вкладки, F5, обрыв) — это выход участника:
          // остальные продолжают звонок, а опустевший звонок удаляется.
          // Вернуться после F5 можно через call::rejoin по callId.
          this.removeMemberFromCall(memberCall.id, clientData.id);
        }
        this.broadcastToLobby(
          {
            type: MESSAGE_TYPES.SEND.ALL.LOBBY.CLIENT_DISCONNECTED,
            data: {
              client: clientData,
              timestamp: new Date().toISOString(),
              lobbyInfo: {
                members: this.lobbyManager.getLobbyMembers(),
              },
            },
          },
          clientData.id,
        );
      });

      // Setup error handler
      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${ip}:`, error);
        this.lobbyManager.clearStaleClients();
      });
    });
  }

  private async handleMessage(
    ws: WebSocket,
    ip: string,
    message: IncomingWsMessage,
  ): Promise<void> {
    // Rate limiting сообщений: по id клиента, до lobby::join — по IP
    const client = this.lobbyManager.getMemberByWs(ws);
    const rateLimitKey = client?.id ?? ip;
    if (!(await this.rateLimiter.checkMessage(rateLimitKey))) {
      this.sendToClient(ws, {
        type: 'error',
        data: {
          message: 'Слишком много сообщений',
          code: 429,
          errorCode: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        },
      });
      return;
    }

    const data = message.data ?? {};
    try {
      const handler = this.messageHandlers[message.type];
      if (handler) {
        await handler(ws, ip, data);
      } else {
        console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.sendToClient(ws, {
        type: 'error',
        data: {
          message:
            error instanceof Error ? error.message : 'Invalid message format',
          code: 400,
        },
      });
    }
  }

  /**
   * Реестр обработчиков входящих сообщений.
   * Добавление нового типа сообщения = одна запись в этом объекте.
   */
  private createMessageHandlers(): Record<string, MessageHandler> {
    return {
      [MESSAGE_TYPES.RECEIVE.LOBBY.JOIN]: (ws, ip, data) => {
        const raw = data.personalInfo;
        const personalInfo = new PersonalInfo(
          raw?.name,
          raw?.avatar,
          raw?.cardAppearance,
        );
        const clientId =
          typeof data.clientId === 'string' && data.clientId.length > 0
            ? data.clientId
            : null;
        this.handleJoinLobby(ws, ip, personalInfo, clientId);
      },

      [MESSAGE_TYPES.RECEIVE.LOBBY.INITIATE_CALL]: (ws, _ip, data) => {
        this.handleInitiateCall(ws, String(data.receiverId));
      },

      [MESSAGE_TYPES.RECEIVE.LOBBY.ACCEPT_OFFER]: (ws, _ip, data) => {
        this.handleAcceptCallOffer(ws, String(data.offerId));
      },

      [MESSAGE_TYPES.RECEIVE.LOBBY.DECLINE_OFFER]: (ws, _ip, data) => {
        this.handleDeclineCallOffer(ws, String(data.offerId));
      },

      [MESSAGE_TYPES.RECEIVE.LOBBY.UPDATE_PROFILE]: (ws, _ip, data) => {
        this.handleUpdateProfile(ws, data.personalInfo);
      },

      [MESSAGE_TYPES.RECEIVE.LOBBY.CREATE_ROOM]: (ws) => {
        this.handleCreateRoom(ws);
      },

      [MESSAGE_TYPES.RECEIVE.LOBBY.JOIN_ROOM]: (ws, _ip, data) => {
        this.handleJoinRoom(ws, String(data.code ?? ''));
      },

      [MESSAGE_TYPES.RECEIVE.LOBBY.INVITE_TO_ROOM]: (ws, _ip, data) => {
        this.handleInviteToRoom(
          ws,
          String(data.callId),
          String(data.receiverId),
        );
      },

      [MESSAGE_TYPES.RECEIVE.CALL.END_CALL]: (ws, _ip, data) => {
        this.handleEndCall(ws, String(data.callId));
      },

      [MESSAGE_TYPES.RECEIVE.CALL.LEAVE_CALL]: (ws, _ip, data) => {
        this.handleLeaveCall(ws, String(data.callId));
      },

      [MESSAGE_TYPES.RECEIVE.CALL.CONVERT_TO_ROOM]: (ws, _ip, data) => {
        this.handleConvertToRoom(ws, String(data.callId));
      },

      [MESSAGE_TYPES.RECEIVE.CALL.REJOIN_CALL]: (ws, _ip, data) => {
        this.handleRejoinCall(ws, String(data.callId));
      },

      [MESSAGE_TYPES.RECEIVE.CALL.CHANGE_MUTE_STATUS]: (ws, _ip, data) => {
        this.handleChangeMutedStatus(ws, String(data.callId), !!data.status);
      },

      [MESSAGE_TYPES.RECEIVE.CALL.CHANGE_ONLINE_STATUS]: (ws, _ip, data) => {
        const client = this.lobbyManager.getMemberByWs(ws);
        if (client) {
          this.handleChangeOnlineStatus(
            client.id,
            String(data.callId),
            !!data.status,
          );
        }
      },

      [MESSAGE_TYPES.RECEIVE.CALL.CHANGE_SPEAKING_STATUS]: (ws, _ip, data) => {
        this.handleChangeSpeakingStatus(ws, String(data.callId), !!data.status);
      },

      [MESSAGE_TYPES.RECEIVE.CALL.SEND_MESSAGE]: (ws, _ip, data) => {
        const attachmentIds = Array.isArray(data.attachmentIds)
          ? data.attachmentIds.filter(
              (id): id is string => typeof id === 'string' && id.length > 0,
            )
          : [];
        return this.handleSendCallMessage(
          ws,
          String(data.callId),
          String(data.text ?? ''),
          attachmentIds,
        );
      },

      [MESSAGE_TYPES.RECEIVE.CALL.START_SCREEN_SHARING]: (ws, _ip, data) => {
        this.handleStartScreenSharing(ws, String(data.callId));
      },

      [MESSAGE_TYPES.RECEIVE.CALL.STOP_SCREEN_SHARING]: (ws, _ip, data) => {
        this.handleStopScreenSharing(ws, String(data.callId));
      },

      [MESSAGE_TYPES.RECEIVE.CALL.MUSIC_PLAY]: (ws, _ip, data) => {
        this.handleMusicPlay(ws, String(data.callId));
      },

      [MESSAGE_TYPES.RECEIVE.CALL.MUSIC_PAUSE]: (ws, _ip, data) => {
        this.handleMusicPause(ws, String(data.callId));
      },

      [MESSAGE_TYPES.RECEIVE.CALL.MUSIC_STOP]: (ws, _ip, data) => {
        this.handleMusicStop(ws, String(data.callId));
      },

      [MESSAGE_TYPES.RECEIVE.CALL.MUSIC_START]: (ws, _ip, data) => {
        this.handleMusicStart(ws, String(data.callId));
      },

      [MESSAGE_TYPES.RECEIVE.CALL.MUSIC_NEXT]: (ws, _ip, data) => {
        this.handleMusicSkip(
          ws,
          String(data.callId),
          1,
          Number(data.expectedIndex),
        );
      },

      [MESSAGE_TYPES.RECEIVE.CALL.MUSIC_PREV]: (ws, _ip, data) => {
        this.handleMusicSkip(
          ws,
          String(data.callId),
          -1,
          Number(data.expectedIndex),
        );
      },
    };
  }

  private handleJoinLobby(
    ws: WebSocket,
    ip: string,
    personalInfo: PersonalInfo,
    preferredId?: string | null,
  ): void {
    const existing = this.lobbyManager.getMemberByIp(ip);
    if (existing) {
      console.error(`Данный пользователь уже находится в лобби (IP: ${ip})`);
      this.sendToClient(ws, {
        type: MESSAGE_TYPES.SEND.ME.JOIN_REJECTED,
        data: {
          message:
            'В лобби уже есть участник с этого устройства. ' +
            'Закройте другую вкладку — вход произойдёт автоматически.',
          code: 409,
          errorCode: ERROR_CODES.ALREADY_IN_LOBBY,
          existingClientName: existing.personalInfo.name ?? null,
        },
      });
      return;
    }

    const client = this.lobbyManager.addClient(
      ws,
      ip,
      personalInfo,
      preferredId,
    );

    if (client) {
      this.broadcastToLobby({
        type: MESSAGE_TYPES.SEND.ALL.LOBBY.JOINED,
        data: {
          client,
          timestamp: new Date().toISOString(),
          lobbyInfo: {
            members: this.lobbyManager.getLobbyMembers(),
          },
        },
      });

      this.sendToClient(ws, {
        type: MESSAGE_TYPES.SEND.ME.LOBBY_JOINED,
        data: {
          client,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Обработка обновления профиля участника:
   * обновляет personalInfo в лобби и рассылает изменения
   * всем участникам лобби и текущего звонка (если он есть)
   */
  private handleUpdateProfile(
    ws: WebSocket,
    raw?: PersonalInfoData | null,
  ): void {
    const client = this.lobbyManager.getMemberByWs(ws);
    if (!client) {
      throw new Error('Вы не в лобби');
    }

    const updated = this.lobbyManager.updatePersonalInfo(client.id, raw);
    if (!updated) return;

    this.broadcastToLobby({
      type: MESSAGE_TYPES.SEND.ALL.LOBBY.PROFILE_UPDATED,
      data: {
        client: updated,
        timestamp: new Date().toISOString(),
        lobbyInfo: {
          members: this.lobbyManager.getLobbyMembers(),
        },
      },
    });

    const memberCall = this.callManager.getClientCall(updated.id);
    if (memberCall) {
      this.broadcastToCall(memberCall.id, {
        type: MESSAGE_TYPES.SEND.ALL.CALL.PROFILE_UPDATED,
        data: {
          client: updated,
          timestamp: new Date().toISOString(),
          callInfo: memberCall,
        },
      });
    }
  }

  /** Уведомляет вторую сторону оффера, что он больше неактуален */
  private notifyOfferDeclined(offer: CallOffer, declinedById: string): void {
    const peer =
      offer.initiator.id === declinedById ? offer.receiver : offer.initiator;

    this.sendToClient(peer.ws, {
      type: MESSAGE_TYPES.SEND.ME.CALL_OFFER_DECLINED,
      data: {
        callOffer: offer,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Отклоняет все висящие офферы участника: каждая вторая сторона получает
   * уведомление, сами офферы удаляются. Используется для защиты от
   * дублирования — у одного участника не может быть нескольких офферов.
   */
  private declineOffersFor(memberId: string): void {
    this.lobbyManager.getOffersByMemberId(memberId).forEach((offer) => {
      this.notifyOfferDeclined(offer, memberId);
      this.lobbyManager.callOffers.delete(offer.id);
    });
  }

  /**
   * Отзывает приглашения, созданные участником (он вышел из комнаты или
   * отключился): у приглашённых должна закрыться модалка входящего.
   */
  private declineInitiatorOffers(initiatorId: string): void {
    this.lobbyManager
      .getOffersByMemberId(initiatorId)
      .filter((offer) => offer.initiator.id === initiatorId)
      .forEach((offer) => {
        this.notifyOfferDeclined(offer, initiatorId);
        this.lobbyManager.callOffers.delete(offer.id);
      });
  }

  /** Отзывает все приглашения в завершённый звонок */
  private declineOffersForCall(callId: string): void {
    this.lobbyManager.getOffersByCallId(callId).forEach((offer) => {
      this.sendToClient(offer.receiver.ws, {
        type: MESSAGE_TYPES.SEND.ME.CALL_OFFER_DECLINED,
        data: {
          callOffer: offer,
          timestamp: new Date().toISOString(),
        },
      });
      this.lobbyManager.callOffers.delete(offer.id);
    });
  }

  /**
   * Сбрасывает висящие офферы у клиента, который создаёт/входит
   * в комнату: обе стороны должны закрыть модалку ожидания/входящего.
   */
  private declinePendingOfferFor(clientId: string, ws: WebSocket): void {
    this.lobbyManager.getOffersByMemberId(clientId).forEach((offer) => {
      this.notifyOfferDeclined(offer, clientId);
      this.sendToClient(ws, {
        type: MESSAGE_TYPES.SEND.ME.CALL_OFFER_DECLINED,
        data: {
          callOffer: offer,
          timestamp: new Date().toISOString(),
        },
      });
      this.lobbyManager.callOffers.delete(offer.id);
    });
  }

  private handleInitiateCall(ws: WebSocket, receiverId: string): void {
    const initiator = this.lobbyManager.getMemberByWs(ws);
    const receiver = this.lobbyManager.getMemberById(receiverId);

    if (!receiver) {
      throw new Error('Пользователя с таким ID не существует');
    }

    if (!initiator || receiver.id === initiator.id) {
      throw new Error('Вы не можете позвонить сами себе');
    }

    // Занятость: участники активного звонка не могут ни звонить, ни принимать
    // вызовы. Иначе оффер «висит» — получатель его не видит, а звонящий ждёт.
    if (this.callManager.getClientCall(initiator.id)) {
      throw new Error('Вы уже в звонке. Сначала завершите текущий');
    }

    if (this.callManager.getClientCall(receiver.id)) {
      const receiverName =
        receiver.personalInfo?.name?.trim() || 'Пользователь';
      throw new Error(`${receiverName} сейчас в другом звонке`);
    }

    // Защита от дублирования: отклонить предыдущий активный оффер инициатора
    this.declineOffersFor(initiator.id);

    // Если получателя уже кто-то зовёт — отклоняем тот оффер, иначе у получателя
    // окажется два висящих вызова и первый потеряется.
    this.declineOffersFor(receiver.id);

    const offer = this.lobbyManager.createCallOffer(initiator, receiver);

    this.sendToClient(ws, {
      type: MESSAGE_TYPES.SEND.ME.CALL_INITIATED,
      data: {
        callOffer: offer,
        timestamp: new Date().toISOString(),
      },
    });

    this.sendToClient(receiver.ws, {
      type: MESSAGE_TYPES.SEND.ME.CALL_OFFER,
      data: {
        callOffer: offer,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Приглашение участника лобби в групповую комнату.
   * В отличие от 1-на-1, приглашать можно сразу нескольких человек — оффер
   * создаётся на каждого получателя, а принятие входит в существующий звонок.
   */
  private handleInviteToRoom(
    ws: WebSocket,
    callId: string,
    receiverId: string,
  ): void {
    const initiator = this.lobbyManager.getMemberByWs(ws);
    if (!initiator) {
      this.failRoomInvite(ws, receiverId, 'Вы не в лобби');
      return;
    }

    const receiver = this.lobbyManager.getMemberById(receiverId);
    if (!receiver) {
      this.failRoomInvite(
        ws,
        receiverId,
        'Пользователя с таким ID не существует',
      );
      return;
    }
    if (receiver.id === initiator.id) {
      this.failRoomInvite(ws, receiverId, 'Вы не можете пригласить сами себя');
      return;
    }

    const call = this.callManager.getCallById(callId);
    if (!call || !call.hasMember(initiator.id)) {
      this.failRoomInvite(ws, receiverId, 'Вы не участник этого звонка');
      return;
    }
    if (call.type !== 'group' || !call.roomCode) {
      this.failRoomInvite(
        ws,
        receiverId,
        'Приглашать можно только в групповой чат',
      );
      return;
    }

    const receiverName = receiver.personalInfo?.name?.trim() || 'Пользователь';

    if (call.hasMember(receiver.id)) {
      this.failRoomInvite(ws, receiverId, `${receiverName} уже в этом звонке`);
      return;
    }
    if (this.callManager.getClientCall(receiver.id)) {
      this.failRoomInvite(
        ws,
        receiverId,
        `${receiverName} сейчас в другом звонке`,
      );
      return;
    }
    if (call.members.length >= this.callManager.getMaxMembers()) {
      this.failRoomInvite(ws, receiverId, 'Комната заполнена');
      return;
    }

    // У получателя не должно быть нескольких висящих офферов
    this.declineOffersFor(receiver.id);

    const offer = this.lobbyManager.createCallOffer(initiator, receiver, {
      kind: 'room',
      callId: call.id,
      roomCode: call.roomCode,
    });

    this.sendToClient(ws, {
      type: MESSAGE_TYPES.SEND.ME.CALL_INITIATED,
      data: {
        callOffer: offer,
        timestamp: new Date().toISOString(),
      },
    });

    this.sendToClient(receiver.ws, {
      type: MESSAGE_TYPES.SEND.ME.CALL_OFFER,
      data: {
        callOffer: offer,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Сообщает приглашающему, что приглашение не создано. Отдельный тип нужен,
   * чтобы клиент снял блокировку с кнопки конкретного участника.
   */
  private failRoomInvite(
    ws: WebSocket,
    receiverId: string,
    message: string,
  ): void {
    this.sendToClient(ws, {
      type: MESSAGE_TYPES.SEND.ME.ROOM_INVITE_FAILED,
      data: {
        receiverId,
        message,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private handleAcceptCallOffer(ws: WebSocket, offerId: string): void {
    const receiver = this.lobbyManager.getMemberByWs(ws);
    const currentOffer = this.lobbyManager.getOfferById(offerId);
    if (
      !currentOffer ||
      !receiver ||
      receiver.id !== currentOffer.receiver.id
    ) {
      throw new Error('Вы не можете начать этот звонок');
    }

    // Приглашение в комнату: входим в существующий звонок, а не создаём новый
    if (currentOffer.kind === 'room') {
      this.acceptRoomInvite(ws, currentOffer);
      return;
    }

    this.sendToClient(currentOffer.initiator.ws, {
      type: MESSAGE_TYPES.SEND.ME.CALL_OFFER_ACCEPTED,
      data: {
        callOffer: currentOffer,
        timestamp: new Date().toISOString(),
      },
    });

    const call = this.callManager.startCall(currentOffer);

    // Оффер больше не нужен — звонок начался
    this.lobbyManager.callOffers.delete(offerId);

    this.broadcastToCall(call.id, {
      type: MESSAGE_TYPES.SEND.ALL.CALL.CALL_STARTED,
      data: {
        callInfo: call,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Принятие приглашения в комнату: участник входит в существующий звонок,
   * получает историю чата и актуальный состав.
   */
  private acceptRoomInvite(ws: WebSocket, offer: CallOffer): void {
    const receiver = offer.receiver;
    const call = offer.callId
      ? this.callManager.getCallById(offer.callId)
      : undefined;

    if (!call || !call.roomCode) {
      this.lobbyManager.callOffers.delete(offer.id);
      this.notifyOfferDeclined(offer, receiver.id);
      throw new Error('Комната больше не существует');
    }

    const wasMember = call.hasMember(receiver.id);

    try {
      if (!wasMember) {
        this.callManager.joinRoom(call.id, receiver);
      }
    } catch (error) {
      this.lobbyManager.callOffers.delete(offer.id);
      this.notifyOfferDeclined(offer, receiver.id);
      throw error;
    }

    this.lobbyManager.callOffers.delete(offer.id);

    this.sendToClient(offer.initiator.ws, {
      type: MESSAGE_TYPES.SEND.ME.CALL_OFFER_ACCEPTED,
      data: {
        callOffer: offer,
        timestamp: new Date().toISOString(),
      },
    });

    const updated = this.callManager.getCallById(call.id);
    if (!updated) {
      throw new Error('Комната не найдена');
    }

    // Вошедшему — история сообщений и состав, остальным — новый участник
    this.sendCallSnapshot(ws, updated);

    if (!wasMember) {
      this.broadcastToCall(
        updated.id,
        {
          type: MESSAGE_TYPES.SEND.ALL.CALL.MEMBER_JOINED,
          data: {
            callInfo: updated,
            client: receiver,
            timestamp: new Date().toISOString(),
          },
        },
        receiver.id,
      );
    }

    const player = musicPlayerService.get(updated.id);
    if (player?.isPlaying()) {
      this.broadcastMusicState(updated.id);
    }
  }

  private handleDeclineCallOffer(ws: WebSocket, offerId: string): void {
    const receiver = this.lobbyManager.getMemberByWs(ws);
    const currentOffer = this.lobbyManager.getOfferById(offerId);

    if (!currentOffer || !receiver) {
      throw new Error('Вы не можете отклонить этот звонок');
    }

    const initiatorDeclined = receiver.id === currentOffer.initiator.id;
    const receiverDeclined = receiver.id === currentOffer.receiver.id;

    if (!initiatorDeclined && !receiverDeclined) {
      throw new Error('Вы не можете отклонить этот звонок');
    }

    this.sendToClient(
      initiatorDeclined ? currentOffer.receiver.ws : currentOffer.initiator.ws,
      {
        type: MESSAGE_TYPES.SEND.ME.CALL_OFFER_DECLINED,
        data: {
          callOffer: currentOffer,
          timestamp: new Date().toISOString(),
        },
      },
    );

    this.lobbyManager.callOffers.delete(offerId);
  }

  /** Создаёт групповую комнату и отправляет её создателю */
  private handleCreateRoom(ws: WebSocket): void {
    const client = this.lobbyManager.getMemberByWs(ws);
    if (!client) {
      throw new Error('Вы не в лобби');
    }

    const call = this.callManager.createRoom(client);

    // Если клиента кто-то звал в 1-на-1, оффер больше не актуален
    this.declinePendingOfferFor(client.id, ws);

    this.sendToClient(ws, {
      type: MESSAGE_TYPES.SEND.ME.ROOM_CREATED,
      data: {
        callInfo: call,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /** Вход в комнату по коду */
  private handleJoinRoom(ws: WebSocket, rawCode: string): void {
    const client = this.lobbyManager.getMemberByWs(ws);
    if (!client) {
      throw new Error('Вы не в лобби');
    }

    const code = CallManager.normalizeRoomCode(rawCode);
    if (!CallManager.isValidRoomCode(code)) {
      throw new Error('Некорректный код комнаты');
    }

    const room = this.callManager.getRoomByCode(code);
    if (!room) {
      throw new Error('Комната не найдена');
    }

    const currentCall = this.callManager.getClientCall(client.id);
    if (currentCall && currentCall.id !== room.id) {
      throw new Error('Вы уже в звонке. Сначала завершите текущий');
    }

    const wasMember = room.hasMember(client.id);
    if (!wasMember) {
      this.callManager.joinRoom(room.id, client);
      // Висящий 1-на-1 оффер после входа в комнату неактуален
      this.declinePendingOfferFor(client.id, ws);
    }

    const call = this.callManager.getCallById(room.id);
    if (!call) {
      throw new Error('Комната не найдена');
    }

    // Вошедшему отдаём историю чата: в комнату можно зайти позже
    // и переписка, отправленная до входа, не должна теряться.
    this.sendCallSnapshot(ws, call);

    if (!wasMember) {
      this.broadcastToCall(
        call.id,
        {
          type: MESSAGE_TYPES.SEND.ALL.CALL.MEMBER_JOINED,
          data: {
            callInfo: call,
            client,
            timestamp: new Date().toISOString(),
          },
        },
        client.id,
      );
    }

    // Вошедший должен сразу увидеть, что уже играет в комнате
    const player = musicPlayerService.get(call.id);
    if (player?.isPlaying()) {
      this.broadcastMusicState(call.id);
    }
  }

  /** Выход участника из звонка без завершения его для остальных */
  private handleLeaveCall(ws: WebSocket, callId: string): void {
    const client = this.lobbyManager.getMemberByWs(ws);
    if (!client) {
      throw new Error('Вы не в лобби');
    }

    const call = this.callManager.getCallById(callId);
    if (!call || !call.hasMember(client.id)) {
      throw new Error('Вы не участник этого звонка');
    }

    this.removeMemberFromCall(callId, client.id);
  }

  /**
   * Удаляет участника из звонка и уведомляет оставшихся.
   * Если звонок опустел — освобождает его ресурсы.
   */
  private removeMemberFromCall(callId: string, clientId: string): void {
    const call = this.callManager.getCallById(callId);
    if (!call) return;

    const isEmpty = this.callManager.leaveCall(callId, clientId);

    // Вышедший мог кого-то приглашать — приглашения отзываем, иначе у
    // приглашённых останется модалка входящего без звонка.
    this.declineInitiatorOffers(clientId);

    if (isEmpty) {
      this.cleanupCallResources(callId);
      return;
    }

    this.broadcastToCall(callId, {
      type: MESSAGE_TYPES.SEND.ALL.CALL.MEMBER_LEFT,
      data: {
        clientId,
        callInfo: this.callManager.getCallById(callId),
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Превращает 1-на-1 в групповую комнату: выдаёт код и рассылает
   * обновлённое состояние всем участникам. Действие необратимо.
   */
  private handleConvertToRoom(ws: WebSocket, callId: string): void {
    const client = this.lobbyManager.getMemberByWs(ws);
    if (!client) {
      throw new Error('Вы не в лобби');
    }

    const call = this.callManager.getCallById(callId);
    if (!call || !call.hasMember(client.id)) {
      throw new Error('Вы не участник этого звонка');
    }

    const updated = this.callManager.convertToRoom(callId);

    this.broadcastToCall(callId, {
      type: MESSAGE_TYPES.SEND.ALL.CALL.ROOM_CREATED,
      data: {
        callInfo: updated,
        createdBy: client.id,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Возврат в звонок по callId после F5 или обрыва связи.
   * Возвращается только тот, кто уже был участником звонка; ему
   * отдаётся актуальный состав и история сообщений.
   */
  private handleRejoinCall(ws: WebSocket, callId: string): void {
    const client = this.lobbyManager.getMemberByWs(ws);
    if (!client) {
      throw new Error('Вы не в лобби');
    }

    const call = this.callManager.getCallById(callId);
    if (!call) {
      throw new Error('Звонок не найден');
    }

    this.callManager.rejoinCall(callId, client);

    const updated = this.callManager.getCallById(callId);
    if (!updated) {
      throw new Error('Звонок не найден');
    }

    this.sendCallSnapshot(
      ws,
      updated,
      MESSAGE_TYPES.SEND.ME.CALL_REJOINED,
    );

    this.broadcastToCall(
      updated.id,
      {
        type: MESSAGE_TYPES.SEND.ALL.CALL.MEMBER_JOINED,
        data: {
          callInfo: updated,
          client,
          timestamp: new Date().toISOString(),
        },
      },
      client.id,
    );

    const player = musicPlayerService.get(updated.id);
    if (player?.isPlaying()) {
      this.broadcastMusicState(updated.id);
    }
  }

  /**
   * Отправляет одному клиенту состояние звонка и историю сообщений.
   * Системные ответы слэш-команд видны только инициатору, поэтому в
   * историю они не попадают; заодно ограничиваем размер пакета.
   */
  private sendCallSnapshot(
    ws: WebSocket,
    call: Call,
    type: string = MESSAGE_TYPES.SEND.ME.ROOM_JOINED,
  ): void {
    this.sendToClient(ws, {
      type,
      data: {
        callInfo: call,
        messages: call.messages
          .filter((message) => !message.isSystem)
          .slice(-SignalingServer.MAX_CALL_HISTORY),
        timestamp: new Date().toISOString(),
      },
    });
  }

  /** Освобождает ресурсы завершённого звонка */
  private cleanupCallResources(callId: string): void {
    // Приглашения в уже несуществующую комнату больше неактуальны
    this.declineOffersForCall(callId);
    // У каждого звонка своя очередь и свои файлы: удаляем только его
    musicPlayerService.destroy(callId);
    this.fileManager.cleanCallFiles(callId).catch(console.error);
  }

  private handleEndCall(ws: WebSocket, callId: string): void {
    const client = this.lobbyManager.getMemberByWs(ws);
    const call = this.callManager.getCallById(callId);

    if (!call) {
      throw new Error('Нет такого звонка');
    }
    if (!client || !call.hasMember(client.id)) {
      throw new Error('Вы не участник этого звонка');
    }

    this.broadcastToCall(callId, {
      type: MESSAGE_TYPES.SEND.ALL.CALL.CALL_ENDED,
      data: {
        callEndingInitiator: client,
      },
    });
    this.callManager.endCall(callId);
    this.cleanupCallResources(callId);
  }

  private handleChangeOnlineStatus(
    clientId: string,
    callId: string,
    status: boolean,
  ): void {
    this.callManager.changeOnlineStatus(callId, clientId, status);
    this.broadcastToCall(callId, {
      type: MESSAGE_TYPES.SEND.ALL.CALL.ONLINE_STATUS_CHANGED,
      data: {
        client: {
          id: clientId,
        },
        isOnline: status,
        callInfo: this.callManager.getCallById(callId),
      },
    });
  }

  private handleChangeMutedStatus(
    ws: WebSocket,
    callId: string,
    status: boolean,
  ): void {
    const client = this.lobbyManager.getMemberByWs(ws);
    if (!client) return;
    this.callManager.changeMuteStatus(callId, client.id, status);
    this.broadcastToCall(callId, {
      type: MESSAGE_TYPES.SEND.ALL.CALL.MUTE_STATUS_CHANGED,
      data: {
        client,
        isMuted: status,
        callInfo: this.callManager.getCallById(callId),
      },
    });
  }

  /**
   * Обработка отправки сообщения в звонок.
   * Текст и вложения приходят одним сообщением: файлы уже загружены
   * по HTTP, здесь остаются только их ID.
   */
  private async handleSendCallMessage(
    ws: WebSocket,
    callId: string,
    text: string,
    attachmentIds: string[] = [],
  ): Promise<void> {
    const trimmedText = text.trim();

    if (!callId || (!trimmedText && attachmentIds.length === 0)) {
      throw new Error('Не указан callId или текст сообщения');
    }

    const client = this.lobbyManager.getMemberByWs(ws);
    if (!client) {
      throw new Error('Вы не в лобби');
    }

    let attachments: FileAttachment[] = [];

    if (attachmentIds.length > 0) {
      // Сообщение с вложениями слэш-командой не считается: у команды
      // нет доступа к файлам, поэтому отправляем текст как обычное сообщение
      attachments = this.fileManager.claimAttachments(
        attachmentIds,
        client.id,
        callId,
      );
    } else {
      // Проверяем, является ли текст слэш-командой
      const slashMatch = trimmedText.match(/^\/([\w-]+)(?:\s+(.*))?$/);
      if (slashMatch && this.slashCommands) {
        const [, command, args] = slashMatch;
        await this.executeSlashCommand(ws, callId, client.id, command, args);
        return;
      }
    }

    const message = this.callManager.sendMessage(
      callId,
      client.id,
      trimmedText,
      false,
      attachments,
    );

    this.broadcastToCall(callId, {
      type: MESSAGE_TYPES.SEND.ALL.CALL.NEW_MESSAGE,
      data: message,
    });
  }

  private async executeSlashCommand(
    ws: WebSocket,
    callId: string,
    senderId: string,
    command: string,
    args: string,
  ): Promise<void> {
    if (!this.slashCommands) return;

    // Сразу сообщаем инициатору, что команда принята в работу:
    // разбор ссылок через yt-dlp занимает несколько секунд
    type CommandStatus = 'started' | 'running' | 'done';
    const sendStatus = (status: CommandStatus, text: string): void => {
      this.sendToClient(ws, {
        type: MESSAGE_TYPES.SEND.ME.COMMAND_STATUS,
        data: { command, status, text },
      });
    };

    let result: SlashCommandResult | null;

    sendStatus('started', `Выполняю /${command}…`);

    try {
      result = await this.slashCommands.execute(
        command,
        args,
        senderId,
        callId,
        (text) => sendStatus('running', text),
      );
    } catch (error) {
      // Команда упала (например, yt-dlp не смог разобрать ссылку) —
      // сообщаем об этом инициатору и гасим индикатор
      const detail = error instanceof Error ? error.message : String(error);
      const message = this.callManager.sendMessage(
        callId,
        senderId,
        `Ошибка при выполнении /${command}: ${detail}`,
        true,
      );
      this.sendToClient(ws, {
        type: MESSAGE_TYPES.SEND.ALL.CALL.NEW_MESSAGE,
        data: message,
      });
      sendStatus('done', '');
      return;
    }

    sendStatus('done', '');

    if (!result) {
      const message = this.callManager.sendMessage(
        callId,
        senderId,
        `Команда «/${command}» не найдена. Используйте /help для списка команд.`,
        true,
      );
      this.sendToClient(ws, {
        type: MESSAGE_TYPES.SEND.ALL.CALL.NEW_MESSAGE,
        data: message,
      });
      return;
    }

    const message = this.callManager.sendMessage(
      callId,
      senderId,
      result.text,
      true,
    );
    this.sendToClient(ws, {
      type: MESSAGE_TYPES.SEND.ALL.CALL.NEW_MESSAGE,
      data: message,
    });

    // Если плеер запустился — рассылаем состояние музыки всем в звонке
    if (musicPlayerService.forCall(callId).isPlaying()) {
      this.broadcastMusicState(callId);
    }
  }

  private handleChangeSpeakingStatus(
    ws: WebSocket,
    callId: string,
    status: boolean,
  ): void {
    const client = this.lobbyManager.getMemberByWs(ws);
    if (!client) return;
    this.callManager.changeSpeakingStatus(callId, client.id, status);
    this.broadcastToCall(callId, {
      type: MESSAGE_TYPES.SEND.ALL.CALL.SPEAKING_STATUS_CHANGED,
      data: {
        client,
        isSpeaking: status,
        callInfo: this.callManager.getCallById(callId),
      },
    });
  }

  private handleStartScreenSharing(ws: WebSocket, callId: string): void {
    const client = this.lobbyManager.getMemberByWs(ws);
    if (!client) return;

    const call = this.callManager.getCallById(callId);
    if (
      call?.members.some(
        (member) => member.client.id !== client.id && member.isScreenSharing,
      )
    ) {
      throw new Error('Кто-то уже демонстрирует экран');
    }

    this.callManager.changeScreenSharingStatus(callId, client.id, true);
    this.broadcastToCall(callId, {
      type: MESSAGE_TYPES.SEND.ALL.CALL.SCREEN_SHARING_STARTED,
      data: {
        client,
        callInfo: this.callManager.getCallById(callId),
      },
    });
  }

  private handleStopScreenSharing(ws: WebSocket, callId: string): void {
    const client = this.lobbyManager.getMemberByWs(ws);
    if (!client) return;
    this.callManager.changeScreenSharingStatus(callId, client.id, false);
    this.broadcastToCall(callId, {
      type: MESSAGE_TYPES.SEND.ALL.CALL.SCREEN_SHARING_STOPPED,
      data: {
        client,
        callInfo: this.callManager.getCallById(callId),
      },
    });
  }

  /** Запуск воспроизведения текущего трека (кнопка Play) */
  private handleMusicPlay(_ws: WebSocket, callId: string): void {
    const player = musicPlayerService.forCall(callId);
    if (!player.isPlaying()) return;
    player.setStatus('playing');
    this.broadcastMusicState(callId);
  }

  /** Приостановка воспроизведения (кнопка Pause) */
  private handleMusicPause(_ws: WebSocket, callId: string): void {
    const player = musicPlayerService.forCall(callId);
    if (!player.isPlaying()) return;
    player.setStatus('paused');
    this.broadcastMusicState(callId);
  }

  /** Остановка и сброс (кнопка Stop) */
  private handleMusicStop(_ws: WebSocket, callId: string): void {
    musicPlayerService.forCall(callId).stop();
    this.broadcastMusicState(callId);
  }

  /** Возобновление воспроизведения (после /play) */
  private handleMusicStart(_ws: WebSocket, callId: string): void {
    if (!musicPlayerService.forCall(callId).isPlaying()) return;
    this.broadcastMusicState(callId);
  }

  /**
   * Переключение трека в очереди (⏮ / ⏭).
   * @param expectedIndex — индекс, который видел клиент. Если сервер уже
   *   ушёл вперёд (оба участника нажали одновременно), переключение
   *   пропускается и клиенту просто возвращается актуальное состояние.
   */
  private handleMusicSkip(
    _ws: WebSocket,
    callId: string,
    direction: 1 | -1,
    expectedIndex: number,
  ): void {
    const player = musicPlayerService.forCall(callId);
    if (!player.isPlaying()) return;

    const isStale =
      Number.isFinite(expectedIndex) && expectedIndex !== player.queueIndex;

    if (!isStale) {
      if (direction > 0) {
        player.next();
      } else {
        player.prev();
      }
    }

    this.broadcastMusicState(callId);
  }

  /** Рассылает текущее состояние плеера всем участникам звонка */
  private broadcastMusicState(callId: string): void {
    this.broadcastToCall(callId, {
      type: MESSAGE_TYPES.SEND.ALL.CALL.MUSIC_STATE_CHANGED,
      data: {
        ...musicPlayerService.forCall(callId).state,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private broadcastToLobby(
    message: OutgoingMessage,
    excludeClientId: string | null = null,
  ): void {
    const clients = this.lobbyManager.getLobbyMembers();
    clients.forEach((client) => {
      if (
        client.id !== excludeClientId &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        this.sendToClient(client.ws, message);
      }
    });
  }

  private sendToClient(ws: WebSocket, message: OutgoingMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(Helpers.omitDeep(message, ['ws'])));
    }
  }

  private broadcastToCall(
    callId: string,
    message: OutgoingMessage,
    excludeClientId: string | null = null,
  ): void {
    const clients = this.callManager.getCallMembers(callId);
    clients.forEach((member) => {
      if (
        member.client.id !== excludeClientId &&
        member.client.ws.readyState === WebSocket.OPEN
      ) {
        this.sendToClient(member.client.ws, message);
      }
    });
  }

  getStats(): { totalClients: number } {
    return this.lobbyManager.getStats();
  }

  setSlashCommands(registry: SlashCommandRegistry): void {
    this.slashCommands = registry;
  }

  getSlashCommands(): SlashCommandRegistry | null {
    return this.slashCommands;
  }

  /** Graceful shutdown: уведомить всех, закрыть wss */
  shutdown(): void {
    const calls = this.callManager.getAllCalls();
    calls.forEach((call) => {
      this.broadcastToCall(call.id, {
        type: MESSAGE_TYPES.SEND.ALL.CALL.CALL_ENDED,
        data: {
          callEndingInitiator: null,
        },
      });
    });

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1001, 'Server shutting down');
      }
    });

    this.wss.close();
    console.info('Signaling server shutdown complete');
  }
}
