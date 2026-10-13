import { RateLimiterMemory } from 'rate-limiter-flexible';
import config from '../config';

export default class RateLimiter {
  /** Лимит подключений на IP */
  private connectionLimiter: RateLimiterMemory;
  /** Лимит сообщений на клиента */
  private messageLimiter: RateLimiterMemory;

  constructor() {
    // Limit connections per IP
    this.connectionLimiter = new RateLimiterMemory({
      points: config.security.maxConnectionsPerIP, // connections per IP
      duration: 60, // per 60 seconds
    });

    // Limit messages per client
    this.messageLimiter = new RateLimiterMemory({
      points: config.security.rateLimitMaxRequests,
      duration: config.security.rateLimitWindowMs / 1000,
    });
  }

  async checkConnection(ip: string): Promise<boolean> {
    try {
      await this.connectionLimiter.consume(ip);
      return true;
    } catch {
      console.warn(`Rate limit exceeded for IP: ${ip}`);
      return false;
    }
  }

  /** Освободить слот подключения (откатить потраченное очко) */
  releaseConnection(ip: string): void {
    this.connectionLimiter.reward(ip);
  }

  async checkMessage(key: string): Promise<boolean> {
    try {
      await this.messageLimiter.consume(key);
      return true;
    } catch {
      console.warn(`Message rate limit exceeded for key: ${key}`);
      return false;
    }
  }
}
