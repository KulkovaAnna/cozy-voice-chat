const WebSocket = require('ws');
const AuthMiddleware = require('../security/AuthMiddleware');
const RateLimiter = require('../security/RateLimiter');
const config = require('../config');
const LobbyManager = require('./LobbyManager');
const PersonalInfo = require('../models/PersonalInfo');
const MESSAGE_TYPES = require('../constants/message-types');
const CallOffer = require('../models/CallOffer');
const Helpers = require('../utils/helpers');
const CallManager = require('./CallManager');

class SignalingServer {
  constructor(server) {
    this.wss = new WebSocket.Server({
      server,
      maxPayload: config.websocket.maxMessageSize,
    });

    this.lobbyManager = new LobbyManager();
    this.callManager = new CallManager();
    this.rateLimiter = new RateLimiter();

    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', async (ws, req) => {
      if (!AuthMiddleware.validateWebSocket(ws, req)) {
        return;
      }

      const ip = req.socket.remoteAddress;
      if (!(await this.rateLimiter.checkConnection(ip))) {
        ws.close(1013, 'Too many connections');
        return;
      }

      console.info(`Участник сети ${ip} подключился`);

      this.sendToClient(ws, {
        type: 'welcome',
      });

      // Setup message handler
      ws.on('message', async (message) => {
        await this.handleMessage(ws, ip, JSON.parse(message));
      });

      // Setup close handler
      ws.on('close', () => {
        const clientData = this.lobbyManager.getMemberByWs(ws);
        const memberCall = this.callManager.getClientCall(clientData.id);
        if (memberCall) {
          this.handleChangeOnlineStatus(ws, memberCall.id, false);
        }
        if (clientData) {
          this.broadcastToLobby(
            {
              type: MESSAGE_TYPES.SEND.ALL.LOBBY.CLIENT_DISCONNECTED,
              data: {
                client: clientData,
                timestamp: new Date().toISOString(),
                lobbyInfo: {
                  members: this.lobbyManager.getLobbyMembers(true),
                },
              },
            },
            clientData.id,
          );
        }
      });

      // Setup error handler
      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${ip}:`, error);
        this.clientManager.removeClient(ws);
      });
    });
  }

  async handleMessage(ws, ip, message) {
    const data = message.data;
    try {
      switch (message.type) {
        case MESSAGE_TYPES.RECEIVE.LOBBY.JOIN:
          this.handleJoinLobby(ws, ip, data.personalInfo);
          break;

        case MESSAGE_TYPES.RECEIVE.LOBBY.INITIATE_CALL:
          this.handleInitiateCall(ws, data.receiverId);
          break;

        case MESSAGE_TYPES.RECEIVE.LOBBY.ACCEPT_OFFER:
          this.handleAcceptCallOffer(ws, data.offerId);
          break;

        case MESSAGE_TYPES.RECEIVE.LOBBY.DECLINE_OFFER:
          this.handleDeclineCallOffer(ws, data.offerId);
          break;

        case MESSAGE_TYPES.RECEIVE.CALL.END_CALL:
          this.handleEndCall(ws, data.callId);
          break;

        case MESSAGE_TYPES.RECEIVE.CALL.CHANGE_MUTE_STATUS:
          this.handleChangeMutedStatus(ws, data.callId, data.status);
          break;

        case MESSAGE_TYPES.RECEIVE.CALL.CHANGE_ONLINE_STATUS:
          this.handleChangeOnlineStatus(ws, data.callId, data.status);
          break;

        case MESSAGE_TYPES.RECEIVE.CALL.CHANGE_SPEAKING_STATUS:
          this.handleChangeSpeakingStatus(ws, data.callId, data.status);
          break;

        default:
          console.warn(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.sendToClient(ws, {
        type: 'error',
        data: {
          message: error.message || 'Invalid message format',
          code: 400,
        },
      });
    }
  }

  /**
   * @param {WebSocket} ws
   * @param {string} ip
   * @param {PersonalInfo} personalInfo
   */
  handleJoinLobby(ws, ip, personalInfo) {
    const client = this.lobbyManager.addClient(ws, ip, personalInfo);

    if (client) {
      this.broadcastToLobby({
        type: MESSAGE_TYPES.SEND.ALL.LOBBY.JOINED,
        data: {
          client,
          timestamp: new Date().toISOString(),
          lobbyInfo: {
            members: this.lobbyManager.getLobbyMembers(true),
          },
        },
      });
    }
  }

  /**
   * @param {WebSocket} ws
   * @param {string} receiverId
   */
  handleInitiateCall(ws, receiverId) {
    const initiator = this.lobbyManager.getMemberByWs(ws);
    const receiver = this.lobbyManager.getMemberById(receiverId);

    if (receiver.id === initiator.id) {
      throw new Error('Вы не можете позвонить сами себе');
    }

    if (!receiver) {
      throw new Error('Пользователя с таким ID не существует');
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

  /**
   * @param {WebSocket} ws
   * @param {string} offerId
   */
  handleAcceptCallOffer(ws, offerId) {
    const receiver = this.lobbyManager.getMemberByWs(ws);
    const currentOffer = this.lobbyManager.getOfferById(offerId);
    if (!currentOffer || receiver.id !== currentOffer.receiver.id) {
      console.log('offer', !!currentOffer);
      console.log('rec', receiver.id, currentOffer.receiver.id);
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

  /**
   * @param {WebSocket} ws
   * @param {string} offerId
   */
  handleDeclineCallOffer(ws, offerId) {
    const receiver = this.lobbyManager.getMemberByWs(ws);
    const currentOffer = this.lobbyManager.getOfferById(offerId);
    if (!currentOffer || receiver.id !== currentOffer.receiver.id) {
      throw new Error('Вы не можете отклонить этот звонок');
    }

    this.sendToClient(currentOffer.initiator.ws, {
      type: MESSAGE_TYPES.SEND.ME.CALL_OFFER_DECLINED,
      data: {
        callOffer: currentOffer,
        timestamp: new Date().toISOString(),
      },
    });

    this.lobbyManager.callOffers.delete(offerId);
  }

  /**
   * @param {WebSocket} ws
   */
  handleEndCall(ws, callId) {
    const client = this.lobbyManager.getMemberByWs(ws);
    this.broadcastToCall(callId, {
      type: MESSAGE_TYPES.SEND.ALL.CALL.CALL_ENDED,
      data: {
        callEndingInitiator: client,
      },
    });
    this.callManager.endCall(callId);
  }

  /**
   * @param {WebSocket} ws
   * @param {string} callId
   * @param {boolean} status
   */
  handleChangeOnlineStatus(ws, callId, status) {
    const client = this.lobbyManager.getMemberByWs(ws);
    this.callManager.changeOnlineStatus(callId, client.id, status);
    this.broadcastToCall(callId, {
      type: MESSAGE_TYPES.SEND.ALL.CALL.ONLINE_STATUS_CHANGED,
      data: {
        client,
        isOnline: status,
        callInfo: this.callManager.getCallById(callId),
      },
    });
  }

  /**
   * @param {WebSocket} ws
   * @param {string} callId
   * @param {boolean} status
   */
  handleChangeMutedStatus(ws, callId, status) {
    const client = this.lobbyManager.getMemberByWs(ws);
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
   * @param {WebSocket} ws
   * @param {string} callId
   * @param {boolean} status
   */
  handleChangeSpeakingStatus(ws, callId, status) {
    const client = this.lobbyManager.getMemberByWs(ws);
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

  /**
   * @param {object} message
   * @param {string | undefined} excludeClientId
   */
  broadcastToLobby(message, excludeClientId = null) {
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

  /**
   * @param {WebSocket} ws
   * @param {object} message
   */
  sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(Helpers.omitDeep(message, ['ws'])));
    }
  }

  /**
   * @param {object} message
   * @param {string | undefined} excludeClientId
   */
  broadcastToCall(callId, message, excludeClientId = null) {
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

  getStats() {
    return this.lobbyManager.getStats();
  }
}

module.exports = SignalingServer;
