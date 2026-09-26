import * as https from 'https';
import * as fs from 'fs';
import type { Server } from 'http';

import { VoiceChatServer } from './server';

class HttpsVoiceChatServer extends VoiceChatServer {
  protected override setupServer(): Server {
    const keyPath = process.env.SSL_KEY_PATH;
    const certPath = process.env.SSL_CERT_PATH;
    if (!keyPath || !certPath) {
      throw new Error('Не заданы SSL_KEY_PATH / SSL_CERT_PATH');
    }
    return https.createServer(
      {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      },
      this.app,
    );
  }

  protected override getProtocol(): string {
    return 'https';
  }
}

process.on('uncaughtException', (error) => {
  console.error('Необработанная ошибка:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Необработанный промис:', reason);
});

if (require.main === module) {
  new HttpsVoiceChatServer();
}

export default HttpsVoiceChatServer;
