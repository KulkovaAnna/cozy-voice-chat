import express from 'express';
import * as http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import * as path from 'path';
import * as fs from 'fs';

import config from './config';
import SignalingServer from './signaling-v2/SignalingServer';
import AuthMiddleware from './security/AuthMiddleware';
import Helpers from './utils/helpers';
import FileManagerRoutes from './app/modules/file-manager/file-manager.routes';
import FileManagerService from './app/modules/file-manager/file-manager.service';
import FileManagerController from './app/modules/file-manager/file-manager.controller';
import LobbyManager from './signaling-v2/LobbyManager';
import CallManager from './signaling-v2/CallManager';

export class VoiceChatServer {
  protected app: express.Express;
  protected server: http.Server;
  protected lobbyManager: LobbyManager;
  protected callManager: CallManager;
  protected fileManagerService: FileManagerService;
  protected fileManagerController: FileManagerController;
  protected fileManagerRoutes: FileManagerRoutes;
  protected signalingServer: SignalingServer;

  constructor() {
    this.app = express();
    this.setupMiddleware();

    this.server = this.setupServer();
    this.lobbyManager = new LobbyManager();
    this.callManager = new CallManager();
    this.fileManagerService = new FileManagerService(
      this.callManager,
      this.lobbyManager,
    );
    this.fileManagerController = new FileManagerController(
      this.fileManagerService,
    );
    this.fileManagerRoutes = new FileManagerRoutes(this.fileManagerController);
    this.signalingServer = new SignalingServer(
      this.server,
      this.lobbyManager,
      this.callManager,
      this.fileManagerService,
    );

    this.setupRoutes();
    this.start();
  }

  protected setupMiddleware(): void {
    // Security headers
    this.app.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
      }),
    );

    // CORS для локальной сети
    this.app.use(
      cors({
        origin: (origin, callback) => {
          if (
            !origin ||
            AuthMiddleware.validateOrigin({ headers: { origin } })
          ) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      }),
    );

    // Статические файлы
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  protected setupServer(): http.Server {
    return http.createServer(this.app);
  }

  protected setupRoutes(): void {
    // Главная страница с инструкцией
    this.app.get('/', (_req, res) => {
      const template = fs.readFileSync(
        path.join(__dirname, '../public/index.html'),
        'utf8',
      );

      const ips = Helpers.getLocalIP();
      const rendered = template.replace('<%= ips %>', JSON.stringify(ips));

      res.send(rendered);
    });

    // Статистика сервера
    this.app.get('/stats', (req, res) => {
      if (!AuthMiddleware.authenticate(req)) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      res.json(this.signalingServer.getStats());
    });

    // Проверка здоровья
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    });

    this.app.use(
      FileManagerRoutes.BASE_URL,
      this.fileManagerRoutes.getRouter(),
    );
  }

  protected getProtocol(): string {
    return 'http';
  }

  protected start(): void {
    this.server.listen(config.server.port, config.server.host, () => {
      const protocol = this.getProtocol();
      const wsProtocol = protocol === 'https' ? 'wss' : 'ws';
      console.log('='.repeat(50));
      console.log('Голосовой чат сервер запущен!');
      console.log('='.repeat(50));
      console.log(`Режим: ${config.server.environment}`);
      console.log(`Порт: ${config.server.port}`);
      console.log(`Хост: ${config.server.host}`);
      console.log('');
      console.log('Доступные адреса:');
      console.log(
        `  Локальный:  ${protocol}://localhost:${config.server.port}`,
      );
      Helpers.getLocalIP().forEach((ip) => {
        console.log(`  Сетевой:    ${protocol}://${ip}:${config.server.port}`);
      });
      console.log('');
      console.log('WebSocket:');
      Helpers.getLocalIP().forEach((ip) => {
        console.log(`  ${wsProtocol}://${ip}:${config.server.port}`);
      });
      console.log('');
      console.log(
        `Безопасность: ${config.security.requireAuth ? 'ВКЛЮЧЕНА' : 'ОТКЛЮЧЕНА'}`,
      );
      console.log(`Макс. подключений: ${config.websocket.maxClients}`);
      console.log('='.repeat(50));
    });
  }
}

// Обработка ошибок
process.on('uncaughtException', (error) => {
  console.error('Необработанная ошибка:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Необработанный промис:', reason);
});

// Запуск сервера
if (require.main === module) {
  new VoiceChatServer();
}

export default VoiceChatServer;
