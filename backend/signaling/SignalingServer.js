const WebSocket = require("ws");
const AuthMiddleware = require("../security/AuthMiddleware");
const ClientManager = require("./ClientManager");
const RateLimiter = require("../security/RateLimiter");
const config = require("../config");
const Adapters = require("../utils/adapters");

class SignalingServer {
  constructor(server) {
    this.wss = new WebSocket.Server({
      server,
      maxPayload: config.websocket.maxMessageSize,
    });

    this.clientManager = new ClientManager();
    this.rateLimiter = new RateLimiter();

    this.setupWebSocket();
    this.startHeartbeatCheck();
  }

  setupWebSocket() {
    this.wss.on("connection", async (ws, req) => {
      // Security checks
      if (!AuthMiddleware.validateWebSocket(ws, req)) {
        return;
      }

      // Rate limiting by IP
      const ip = req.socket.remoteAddress;
      if (!(await this.rateLimiter.checkConnection(ip))) {
        ws.close(1013, "Too many connections");
        return;
      }

      const client = this.clientManager.addClient(ws, ip);

      this.sendToClient(ws, {
        type: "welcome",
        data: {
          clientId: client.id,
        },
      });

      // Setup message handler
      ws.on("message", async (message) => {
        await this.handleMessage(ws, JSON.parse(message));
      });

      // Setup close handler
      ws.on("close", () => {
        const clientData = this.clientManager.removeClient(ws);
        if (clientData) {
          this.broadcastToRoom(
            clientData.room,
            {
              type: "user-disconnected",
              data: {
                clientId: clientData.id,
                timestamp: new Date().toISOString(),
                clients: this.clientManager
                  .getClientsInRoom(clientData.room)
                  .map(Adapters.getClientUser(clientData.id)),
              },
            },
            clientData.id,
          );
        }
      });

      // Setup error handler
      ws.on("error", (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.clientManager.removeClient(ws);
      });
    });
  }

  async handleMessage(ws, message) {
    const data = message.data;
    try {
      const clientData = this.clientManager.getClientByWs(ws);
      if (!clientData) return;

      // Rate limiting for messages
      if (!(await this.rateLimiter.checkMessage(clientData.id))) {
        this.sendToClient(ws, {
          type: "error",
          message: "Rate limit exceeded",
        });
        return;
      }

      // Update heartbeat on any message
      this.clientManager.updateHeartbeat(clientData.id);

      switch (message.type) {
        case "create-room":
          this.handleCreateRoom(clientData.id);
          break;

        case "join-room":
          this.handleJoinRoom(clientData.id, data);
          break;

        case "leave-room":
          this.handleLeaveRoom(clientData.id);
          break;

        case "offer":
        case "answer":
        case "candidate":
          this.handleWebRTCMessage(clientData.id, data);
          break;

        case "ping":
          this.sendToClient(ws, { type: "pong", timestamp: Date.now() });
          break;
        case "broadcast":
          this.handleBroadcast(clientData.id, data);
          break;
        default:
          console.warn(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error("Error handling message:", error);
      this.sendToClient(ws, {
        type: "error",
        message: error.message || "Invalid message format",
      });
    }
  }

  handleBroadcast(clientId, data) {
    const clientData = this.clientManager.getClientById(clientId);
    this.broadcastToRoom(
      data.roomId,
      {
        type: "user-broadcasted",
        data: {
          clientId,
          timestamp: new Date().toISOString(),
          clientInfo: clientData.additionalInfo,
          broadcastedData: data.broadcastedData,
        },
      },
      clientId,
    );
  }

  handleCreateRoom(clientId) {
    const clientData = this.clientManager.getClientById(clientId);
    if (!clientData) return;

    const roomId = this.clientManager.createRoom();
    this.sendToClient(clientData.ws, {
      type: "room-created",
      data: {
        roomId,
      },
    });
  }

  handleJoinRoom(clientId, data) {
    const success = this.clientManager.joinRoom(clientId, data);
    const clientData = this.clientManager.getClientById(clientId);

    if (success && clientData) {
      // Notify the joining client
      this.sendToClient(clientData.ws, {
        type: "joined-room",
        data: {
          roomId: data.roomId,
          clients: this.clientManager
            .getClientsInRoom(data.roomId)
            .map(Adapters.getClientUser(clientData.id)),
        },
      });

      // Notify others in the room
      this.broadcastToRoom(
        data.roomId,
        {
          type: "user-joined",
          data: {
            clientId,
            timestamp: new Date().toISOString(),
            clientInfo: clientData.additionalInfo,
          },
        },
        clientId,
      );
    }
  }

  handleLeaveRoom(clientId) {
    const clientData = this.clientManager.getClientById(clientId);
    if (clientData && clientData.room) {
      const roomId = clientData.room;
      this.clientManager.leaveRoom(clientId);

      this.broadcastToRoom(roomId, {
        type: "user-left",
        data: {
          clientId,
          timestamp: new Date().toISOString(),
          clients: this.clientManager
            .getClientsInRoom(roomId)
            .map(Adapters.getClientUser(clientData.id)),
        },
      });

      this.sendToClient(clientData.ws, {
        type: "left-room",
        data: { roomId },
      });
    }
  }

  handleWebRTCMessage(senderId, message) {
    const targetClient = this.clientManager.getClientById(message.data.target);
    if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
      this.sendToClient(targetClient.ws, {
        type: "offer-accepted",
        data: {
          message: message.data.message,
          sender: senderId,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  broadcastToRoom(roomId, message, excludeClientId = null) {
    const clients = this.clientManager.getClientsInRoom(roomId);
    clients.forEach((client) => {
      if (
        client.id !== excludeClientId &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        this.sendToClient(client.ws, message);
      }
    });
  }

  sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  startHeartbeatCheck() {
    setInterval(() => {
      const now = Date.now();
      this.clientManager.getConnectedClients().forEach((client) => {
        if (
          now - client.lastHeartbeat >
          config.websocket.heartbeatInterval * 2
        ) {
          console.log(`Client ${client.id} heartbeat timeout, disconnecting`);
          client.ws.close(1001, "Heartbeat timeout");
          this.clientManager.removeClient(client.ws);
        }
      });
    }, 10000); // Check every 10 seconds
  }

  getStats() {
    return this.clientManager.getStats();
  }
}

module.exports = SignalingServer;
