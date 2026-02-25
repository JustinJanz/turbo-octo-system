'use strict';

const { randomUUID } = require('crypto');
const config = require('../config');
const { runTenantQuery } = require('./db');
const { auditQuery } = require('./auditLogger');
const { validateQuery } = require('../utils/queryGuard');

/**
 * Execute a validated SQL query in the context of a tenant.
 *
 * @param {object} opts
 * @param {string}   opts.tenantId  - Resolved tenant identifier (schema name).
 * @param {string}   opts.apiKey    - Raw API key (will be masked in audit).
 * @param {string}   opts.query     - SQL query string.
 * @param {Array}    opts.params    - Query parameters.
 * @param {string}   opts.clientIp  - Originating client IP.
 * @returns {Promise<object>} Structured result payload.
 */
async function executeQuery({ tenantId, apiKey, query, params = [], clientIp }) {
  const requestId = randomUUID();
  const startTime = Date.now();

  // --- Security validation ---
  const guard = validateQuery(query);
  if (!guard.ok) {
    auditQuery({
      requestId, tenantId, apiKey, query, params, clientIp,
      success: false,
      error: `QueryGuard: ${guard.reason}`,
    });
    const err = new Error(guard.reason);
    err.statusCode = 400;
    err.code = 'QUERY_FORBIDDEN';
    throw err;
  }

  // --- Execute ---
  let result;
  try {
    result = await runTenantQuery(
      tenantId,
      query,
      params,
      config.security.queryTimeoutMs,
    );
  } catch (dbErr) {
    const durationMs = Date.now() - startTime;
    auditQuery({
      requestId, tenantId, apiKey, query, params, clientIp,
      success: false,
      durationMs,
      error: dbErr.message,
    });
    const err = new Error(sanitiseDbError(dbErr.message));
    err.statusCode = dbErr.code === '57014' ? 504 : 500; // 57014 = query_canceled (timeout)
    err.code = dbErr.code || 'DB_ERROR';
    throw err;
  }

  const durationMs = Date.now() - startTime;

  // Enforce max-row limit by slicing (the DB may return more if LIMIT was not set)
  const rows = result.rows.slice(0, config.security.maxRows);
  const truncated = result.rows.length > config.security.maxRows;

  auditQuery({
    requestId, tenantId, apiKey, query, params, clientIp,
    success: true,
    rowCount: rows.length,
    durationMs,
  });

  return {
    requestId,
    tenantId,
    rowCount: rows.length,
    truncated,
    maxRows: config.security.maxRows,
    durationMs,
    rows,
  };
}

/**
 * Strip internal PostgreSQL detail from error messages before surfacing to clients.
 * Removes file paths, line numbers, and internal routine names.
 */
function sanitiseDbError(message) {
  return message
    .replace(/\(.*\)/g, '')   // Remove parenthetical details
    .replace(/LINE \d+:.*$/im, '')
    .replace(/\bDETAIL:.*$/im, '')
    .trim();
}

module.exports = { executeQuery };
