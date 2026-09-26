import WebSocket from 'ws';
import type { Server as HttpServer } from 'http';
import type { IncomingMessage } from 'http';
import AuthMiddleware from '../security/AuthMiddleware';
import RateLimiter from '../security/RateLimiter';
import config from '../config';
import PersonalInfo from '../models/PersonalInfo';
import MESSAGE_TYPES from '../constants/message-types';
import Helpers from '../utils/helpers';
import eventBus from '../utils/event-bus';
import type LobbyManager from './LobbyManager';
import type CallManager from './CallManager';
import type FileManagerService from '../app/modules/file-manager/file-manager.service';
import type {
  FileDeletedEvent,
  FileUploadedEvent,
} from '../app/modules/file-manager/file-manager.types';
import type { IncomingWsMessage, OutgoingMessage } from '../types';

export default class SignalingServer {
  private wss: WebSocket.Server;
  private lobbyManager: LobbyManager;
  private callManager: CallManager;
  private fileManager: FileManagerService;
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
        this.lobbyManager.removeMember(ws);
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
    const data = message.data ?? {};
    try {
      switch (message.type) {
        case MESSAGE_TYPES.RECEIVE.LOBBY.JOIN: {
          const raw = data.personalInfo;
          const personalInfo = new PersonalInfo(raw?.name, raw?.avatar);
          this.handleJoinLobby(ws, ip, personalInfo);
          break;
        }

        case MESSAGE_TYPES.RECEIVE.LOBBY.INITIATE_CALL:
          this.handleInitiateCall(ws, String(data.receiverId));
          break;

        case MESSAGE_TYPES.RECEIVE.LOBBY.ACCEPT_OFFER:
          this.handleAcceptCallOffer(ws, String(data.offerId));
          break;

        case MESSAGE_TYPES.RECEIVE.LOBBY.DECLINE_OFFER:
          this.handleDeclineCallOffer(ws, String(data.offerId));
          break;

        case MESSAGE_TYPES.RECEIVE.CALL.END_CALL:
          this.handleEndCall(ws, String(data.callId));
          break;

        case MESSAGE_TYPES.RECEIVE.CALL.CHANGE_MUTE_STATUS:
          this.handleChangeMutedStatus(ws, String(data.callId), !!data.status);
          break;

        case MESSAGE_TYPES.RECEIVE.CALL.CHANGE_ONLINE_STATUS: {
          const client = this.lobbyManager.getMemberByWs(ws);
          if (client) {
            this.handleChangeOnlineStatus(
              client.id,
              String(data.callId),
              !!data.status,
            );
          }
          break;
        }

        case MESSAGE_TYPES.RECEIVE.CALL.CHANGE_SPEAKING_STATUS:
          this.handleChangeSpeakingStatus(
            ws,
            String(data.callId),
            !!data.status,
          );
          break;

        case MESSAGE_TYPES.RECEIVE.CALL.SEND_MESSAGE:
          this.handleSendCallMessage(ws, String(data.callId), String(data.text));
          break;

        case MESSAGE_TYPES.RECEIVE.CALL.START_SCREEN_SHARING:
          this.handleStartScreenSharing(ws, String(data.callId));
          break;

        case MESSAGE_TYPES.RECEIVE.CALL.STOP_SCREEN_SHARING:
          this.handleStopScreenSharing(ws, String(data.callId));
          break;

        default:
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

  private handleJoinLobby(ws: WebSocket, ip: string, personalInfo: PersonalInfo): void {
    const client = this.lobbyManager.addClient(ws, ip, personalInfo);

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

  private handleInitiateCall(ws: WebSocket, receiverId: string): void {
    const initiator = this.lobbyManager.getMemberByWs(ws);
    const receiver = this.lobbyManager.getMemberById(receiverId);

    if (!receiver) {
      throw new Error('Пользователя с таким ID не существует');
    }

    if (!initiator || receiver.id === initiator.id) {
      throw new Error('Вы не можете позвонить сами себе');
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
    if (!currentOffer || !receiver || receiver.id !== currentOffer.receiver.id) {
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

    const message = this.callManager.sendMessage(callId, client.id, text);

    this.broadcastToCall(callId, {
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
}
