const config = require('../config');

class AuthMiddleware {
  static validateOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) return true; // Allow direct connections

    return config.security.allowedOrigins.some((allowed) => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
  }

  static authenticate(req) {
    if (!config.security.requireAuth) return true;

    const token = req.headers['x-auth-token'] || req.query.token;

    return token === config.security.authToken;
  }

  static validateWebSocket(ws, req) {
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

module.exports = AuthMiddleware;
