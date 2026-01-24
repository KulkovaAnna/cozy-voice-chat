const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const config = {
  server: {
    port: process.env.PORT || 8080,
    environment: process.env.NODE_ENV || 'development',
    host: process.env.HOST || '0.0.0.0',
  },

  security: {
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:*', 'http://192.168.*'],

    requireAuth: process.env.REQUIRE_AUTH === 'true',
    authToken: process.env.AUTH_TOKEN || 'local_default_token',

    maxConnectionsPerIP: parseInt(process.env.MAX_CONNECTIONS_PER_IP) || 5,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  websocket: {
    maxMessageSize: parseInt(process.env.MAX_MESSAGE_SIZE) || 16384,
    heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL) || 30000,
    maxClients: parseInt(process.env.MAX_CLIENTS) || 100,
  },
};

// Validate local network IP patterns
config.security.allowedOrigins = config.security.allowedOrigins.map(
  (origin) => {
    if (origin.includes('*')) {
      return new RegExp(
        '^' + origin.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$',
      );
    }
    return origin;
  },
);

module.exports = config;
