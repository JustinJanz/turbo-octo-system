'use strict';

const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'sql-api' },
  transports: [
    new transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? format.json()
        : format.combine(format.colorize(), format.simple()),
    }),
  ],
});

/**
 * Emit a structured audit event for every query execution attempt.
 *
 * @param {object} entry
 * @param {string}  entry.requestId   - Unique request identifier.
 * @param {string}  entry.tenantId    - Tenant identifier.
 * @param {string}  entry.apiKey      - Redacted/masked API key.
 * @param {string}  entry.query       - SQL query executed.
 * @param {string[]} entry.params     - Query parameters (values masked).
 * @param {string}  entry.clientIp    - Client IP address.
 * @param {boolean} entry.success     - Whether execution succeeded.
 * @param {number}  [entry.rowCount]  - Number of rows returned.
 * @param {number}  [entry.durationMs] - Query duration in ms.
 * @param {string}  [entry.error]     - Error message if failed.
 */
function auditQuery(entry) {
  const level = entry.success ? 'info' : 'warn';
  logger[level]('query.executed', {
    audit: true,
    requestId: entry.requestId,
    tenantId: entry.tenantId,
    // Mask all but the last 4 chars of the API key for log correlation
    apiKeyHint: entry.apiKey ? `****${entry.apiKey.slice(-4)}` : null,
    query: entry.query,
    // Mask parameter values — log only their count and types
    paramCount: Array.isArray(entry.params) ? entry.params.length : 0,
    clientIp: entry.clientIp,
    success: entry.success,
    rowCount: entry.rowCount ?? null,
    durationMs: entry.durationMs ?? null,
    error: entry.error ?? null,
  });
}

module.exports = { logger, auditQuery };
