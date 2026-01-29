const { v4: uuidv4 } = require("uuid");
const Helpers = require("../utils/helpers");

class ClientManager {
  constructor() {
    this.clients = new Map(); // ws -> clientData
    this.rooms = new Map(); // roomId -> Set of clientIds
  }

  addClient(ws, ip, additionalInfo = {}) {
    const clientId = uuidv4();
    const clientData = {
      id: clientId,
      ws,
      ip,
      joinedAt: new Date(),
      lastHeartbeat: Date.now(),
      room: null,
      additionalInfo,
    };

    this.clients.set(ws, clientData);
    console.log(`Client connected: ${clientId} from ${ip}`);

    return clientData;
  }

  removeClient(ws) {
    const clientData = { ...this.clients.get(ws) };

    if (clientData) {
      // Remove from room if in one
      if (clientData.room) {
        this.leaveRoom(clientData.id);
      }

      this.clients.delete(ws);
      console.log(`Client disconnected: ${clientData.id}`);
      return clientData;
    }
    return null;
  }

  createRoom() {
    let roomId = Helpers.generateRoomCode();
    while (this.rooms.has(roomId)) {
      roomId = Helpers.generateRoomCode();
    }
    this.rooms.set(roomId, new Set());
    console.log(`Room created: ${roomId}`);
    return roomId;
  }

  joinRoom(clientId, data) {
    const client = this.getClientById(clientId);
    if (!client) return false;

    const room = this.rooms.get(data.roomId);

    if (!room) throw new Error("Комнаты с таким номером не существует");

    // Leave current room if any
    if (client.room) {
      this.leaveRoom(clientId);
    }

    room.add(clientId);
    client.room = data.roomId;
    client.additionalInfo = {
      ...client.additionalInfo,
      ...data,
    };

    console.log(
      `Client ${data.userName} (id: ${clientId}) joined room: ${data.roomId}`,
    );
    return true;
  }

  leaveRoom(clientId) {
    const client = this.getClientById(clientId);
    if (!client || !client.room) return false;

    const room = this.rooms.get(client.room);
    if (room) {
      room.delete(clientId);

      // Delete empty room
      if (room.size === 0) {
        this.rooms.delete(client.room);
        console.log(`Room deleted: ${client.room}`);
      }
    }

    client.room = null;
    return true;
  }

  getClientById(clientId) {
    for (const [ws, data] of this.clients.entries()) {
      if (data.id === clientId) {
        return data;
      }
    }
    return null;
  }

  getClientByWs(ws) {
    return this.clients.get(ws);
  }

  getClientsInRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return Array.from(room)
      .map((clientId) => this.getClientById(clientId))
      .filter((client) => client !== null);
  }

  updateHeartbeat(clientId) {
    const client = this.getClientById(clientId);
    if (client) {
      client.lastHeartbeat = Date.now();
    }
  }

  getConnectedClients() {
    return Array.from(this.clients.values());
  }

  getStats() {
    return {
      totalClients: this.clients.size,
      totalRooms: this.rooms.size,
      rooms: Array.from(this.rooms.entries()).map(([roomId, clients]) => ({
        roomId,
        clientCount: clients.size,
      })),
    };
  }
}

module.exports = ClientManager;
