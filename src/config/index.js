'use strict';

const parseApiKeys = (raw) => {
  const map = new Map();
  if (!raw) return map;
  for (const pair of raw.split(',')) {
    const [key, tenantId] = pair.trim().split(':');
    if (key && tenantId) map.set(key.trim(), tenantId.trim());
  }
  return map;
};

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    connectionString: process.env.DATABASE_URL,
    // Pool settings
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  },

  security: {
    // Map of apiKey -> tenantId
    apiKeys: parseApiKeys(process.env.API_KEYS || ''),
    queryTimeoutMs: parseInt(process.env.QUERY_TIMEOUT_MS || '5000', 10),
    maxRows: parseInt(process.env.MAX_ROWS || '1000', 10),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
};

module.exports = config;
