import type { IncomingMessage } from 'http';
import config from '../config';

export default class AuthMiddleware {
  static validateOrigin(req: Pick<IncomingMessage, 'headers'>): boolean {
    const origin = req.headers.origin;
    if (!origin) return true; // Allow direct connections

    return config.security.allowedOrigins.some((allowed) => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
  }

  static authenticate(
    req: Pick<IncomingMessage, 'headers'> & { query?: Record<string, unknown> },
  ): boolean {
    if (!config.security.requireAuth) return true;

    const token =
      (req.headers['x-auth-token'] as string | undefined) ??
      (req.query?.token as string | undefined);

    return token === config.security.authToken;
  }

  static validateWebSocket(
    ws: { close: (code: number, reason: string) => void },
    req: IncomingMessage,
  ): boolean {
    // Check origin
    if (!this.validateOrigin(req)) {
      ws.close(1008, 'Origin not allowed');
      return false;
    }

    // Check authentication if required
    if (!this.authenticate(req)) {
      ws.close(1008, 'Authentication required');
      return false;
    }

    return true;
  }
}
