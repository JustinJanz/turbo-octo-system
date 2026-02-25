'use strict';

require('dotenv').config();

const config = require('./config');
const app = require('./app');
const { logger } = require('./services/auditLogger');
const { end: closeDb } = require('./services/db');

const server = app.listen(config.port, () => {
  logger.info(`Server started`, {
    port: config.port,
    env: config.nodeEnv,
    tenantsConfigured: config.security.apiKeys.size,
  });
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully…`);
  server.close(async () => {
    await closeDb();
    logger.info('Server closed.');
    process.exit(0);
  });
  // Force exit after 10 s
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = server;
