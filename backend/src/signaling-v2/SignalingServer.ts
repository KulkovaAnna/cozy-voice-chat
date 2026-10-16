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
import eventBus from '../utils/event-bus';
import type LobbyManager from './LobbyManager';
import type CallManager from './CallManager';
import type FileManagerService from '../app/modules/file-manager/file-manager.service';
import type {
  FileDeletedEvent,
  FileUploadedEvent,
} from '../app/modules/file-manager/file-manager.types';
import type {
  IncomingWsMessage,
  OutgoingMessage,
  PersonalInfoData,
} from '../types';
import type { MessageHandler } from './message-handlers';
import { SlashCommandRegistry } from './SlashCommands';

export default class SignalingServer {
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
    eventBus.on('file:uploaded', this.handleFileUploaded.bind(this));
    eventBus.on('file:deleted', this.handleFileDeleted.bind(this));
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
        const offer = this.lobbyManager.getOfferByMemberId(clientData.id);
        const memberCall = this.callManager.getClientCall(clientData.id);
        if (offer && !memberCall) {
          this.handleDeclineCallOffer(ws, offer.id);
        }
        this.lobbyManager.removeMember(ws);
        if (memberCall) {
          this.handleChangeOnlineStatus(clientData.id, memberCall.id, false);
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

  private handleFileUploaded({
    fileId,
    callId,
    originalName,
    size,
    senderIp,
  }: FileUploadedEvent): void {
    const call = this.callManager.getCallById(callId);
    if (!call) return;
    const sender = call.members.find((m) => m.client.ip === senderIp);
    if (!sender) return;

    this.broadcastToCall(callId, {
      type: MESSAGE_TYPES.SEND.ALL.CALL.FILE_RECEIVED,
      data: {
        fileId,
        originalName,
        size,
        timestamp: new Date().toISOString(),
        senderInfo: {
          id: sender.client.id,
          name: sender.client.personalInfo.name,
          avatar: sender.client.personalInfo.avatar,
        },
      },
    });
  }

  private handleFileDeleted({
    fileId,
    callId,
    originalName,
    size,
  }: FileDeletedEvent): void {
    const call = this.callManager.getCallById(callId);
    if (call) {
      this.broadcastToCall(callId, {
        type: MESSAGE_TYPES.SEND.ALL.CALL.FILE_DELETED,
        data: {
          fileId,
          originalName,
          size,
          timestamp: new Date().toISOString(),
        },
      });
    }
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

      [MESSAGE_TYPES.RECEIVE.CALL.END_CALL]: (ws, _ip, data) => {
        this.handleEndCall(ws, String(data.callId));
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
        this.handleSendCallMessage(ws, String(data.callId), String(data.text));
      },

      [MESSAGE_TYPES.RECEIVE.CALL.START_SCREEN_SHARING]: (ws, _ip, data) => {
        this.handleStartScreenSharing(ws, String(data.callId));
      },

      [MESSAGE_TYPES.RECEIVE.CALL.STOP_SCREEN_SHARING]: (ws, _ip, data) => {
        this.handleStopScreenSharing(ws, String(data.callId));
      },
    };
  }

  private handleJoinLobby(
    ws: WebSocket,
    ip: string,
    personalInfo: PersonalInfo,
    preferredId?: string | null,
  ): void {
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

  private handleInitiateCall(ws: WebSocket, receiverId: string): void {
    const initiator = this.lobbyManager.getMemberByWs(ws);
    const receiver = this.lobbyManager.getMemberById(receiverId);

    if (!receiver) {
      throw new Error('Пользователя с таким ID не существует');
    }

    if (!initiator || receiver.id === initiator.id) {
      throw new Error('Вы не можете позвонить сами себе');
    }

    // Защита от дублирования: отклонить предыдущий активный оффер инициатора
    const prevOffer = this.lobbyManager.getOfferByMemberId(initiator.id);
    if (prevOffer) {
      const prevPeer =
        prevOffer.initiator.id === initiator.id
          ? prevOffer.receiver
          : prevOffer.initiator;
      this.sendToClient(prevPeer.ws, {
        type: MESSAGE_TYPES.SEND.ME.CALL_OFFER_DECLINED,
        data: {
          callOffer: prevOffer,
          timestamp: new Date().toISOString(),
        },
      });
      this.lobbyManager.callOffers.delete(prevOffer.id);
    }

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

    this.sendToClient(currentOffer.initiator.ws, {
      type: MESSAGE_TYPES.SEND.ME.CALL_OFFER_ACCEPTED,
      data: {
        callOffer: currentOffer,
        timestamp: new Date().toISOString(),
      },
    });

    const call = this.callManager.startCall(currentOffer);

    this.broadcastToCall(call.id, {
      type: MESSAGE_TYPES.SEND.ALL.CALL.CALL_STARTED,
      data: {
        callInfo: call,
        timestamp: new Date().toISOString(),
      },
    });
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

  private handleEndCall(ws: WebSocket, callId: string): void {
    const client = this.lobbyManager.getMemberByWs(ws);
    this.broadcastToCall(callId, {
      type: MESSAGE_TYPES.SEND.ALL.CALL.CALL_ENDED,
      data: {
        callEndingInitiator: client,
      },
    });
    this.callManager.endCall(callId);
    this.fileManager.cleanDownloads().catch(console.error);
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
   * Обработка отправки текстового сообщения в звонок
   */
  private handleSendCallMessage(
    ws: WebSocket,
    callId: string,
    text: string,
  ): void {
    if (!callId || !text) {
      throw new Error('Не указан callId или текст сообщения');
    }

    const client = this.lobbyManager.getMemberByWs(ws);
    if (!client) {
      throw new Error('Вы не в лобби');
    }

    // Проверяем, является ли текст слэш-командой
    const slashMatch = text.trim().match(/^\/([\w-]+)(?:\s+(.*))?$/);
    if (slashMatch && this.slashCommands) {
      const [, command, args] = slashMatch;
      this.executeSlashCommand(ws, callId, client.id, command, args);
      return;
    }

    const message = this.callManager.sendMessage(callId, client.id, text);

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

    const result = await this.slashCommands.execute(command, args, senderId);
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

  /** Очистка подписок на eventBus */
  private unsubscribeFromEventBus(): void {
    eventBus.off('file:uploaded', this.handleFileUploaded.bind(this));
    eventBus.off('file:deleted', this.handleFileDeleted.bind(this));
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
    this.unsubscribeFromEventBus();
    console.info('Signaling server shutdown complete');
  }
}
