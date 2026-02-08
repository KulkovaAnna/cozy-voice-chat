const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const config = require('./config');
const SignalingServer = require('./signaling-v2/SignalingServer');
const AuthMiddleware = require('./security/AuthMiddleware');
const Helpers = require('./utils/helpers');

class VoiceChatServer {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();

    this.server = http.createServer(this.app);
    this.signalingServer = new SignalingServer(this.server);

    this.start();
  }

  setupMiddleware() {
    // Security headers
    this.app.use(
      helmet({
        contentSecurityPolicy: false, // Отключаем для WebSocket
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
      }),
    );

    // Статические файлы
    this.app.use(express.static(path.join(__dirname, 'public')));
  }

  setupRoutes() {
    // Главная страница с инструкцией
    this.app.get('/', (req, res) => {
      const template = require('fs').readFileSync(
        path.join(__dirname, 'public/index.html'),
        'utf8',
      );

      const ips = Helpers.getLocalIP();
      const rendered = template.replace('<%= ips %>', JSON.stringify(ips));

      res.send(rendered);
    });

    // Статистика сервера
    this.app.get('/stats', (req, res) => {
      if (!AuthMiddleware.authenticate(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
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
  }

  start() {
    this.server.listen(config.server.port, config.server.host, () => {
      console.log('='.repeat(50));
      console.log('Голосовой чат сервер запущен!');
      console.log('='.repeat(50));
      console.log(`Режим: ${config.server.environment}`);
      console.log(`Порт: ${config.server.port}`);
      console.log(`Хост: ${config.server.host}`);
      console.log('');
      console.log('Доступные адреса:');
      console.log(`  Локальный:  http://localhost:${config.server.port}`);
      Helpers.getLocalIP().forEach((ip) => {
        console.log(`  Сетевой:    http://${ip}:${config.server.port}`);
      });
      console.log('');
      console.log('WebSocket:');
      Helpers.getLocalIP().forEach((ip) => {
        console.log(`  ws://${ip}:${config.server.port}`);
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

process.on('unhandledRejection', (reason, promise) => {
  console.error('Необработанный промис:', reason);
});

// Запуск сервера
if (require.main === module) {
  new VoiceChatServer();
}

module.exports = VoiceChatServer;
