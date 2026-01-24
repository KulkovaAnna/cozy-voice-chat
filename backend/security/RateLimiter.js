const { RateLimiterMemory } = require('rate-limiter-flexible');

class RateLimiter {
  constructor() {
    // Limit connections per IP
    this.connectionLimiter = new RateLimiterMemory({
      points: 2, // connections per IP
      duration: 60, // per 60 seconds
    });

    // Limit messages per client
    this.messageLimiter = new RateLimiterMemory({
      points: 100, // messages per minute
      duration: 60,
    });
  }

  async checkConnection(ip) {
    try {
      await this.connectionLimiter.consume(ip);
      return true;
    } catch (rejRes) {
      console.warn(`Rate limit exceeded for IP: ${ip}`);
      return false;
    }
  }

  async checkMessage(clientId) {
    try {
      await this.messageLimiter.consume(clientId);
      return true;
    } catch (rejRes) {
      console.warn(`Message rate limit exceeded for client: ${clientId}`);
      return false;
    }
  }
}

module.exports = RateLimiter;
