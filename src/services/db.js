'use strict';

const { Pool } = require('pg');
const config = require('../config');

// Validate that a schema name is a safe PostgreSQL identifier.
// Allows only alphanumeric characters and underscores.
const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const pool = new Pool(config.db);

pool.on('error', (err) => {
  // Log unexpected errors on idle clients without crashing the process
  process.stderr.write(`[db] Unexpected pool error: ${err.message}\n`);
});

/**
 * Execute a SQL query scoped to the given tenant schema.
 * The tenant schema is set with SET LOCAL search_path so it is only active
 * for the duration of the transaction.
 *
 * @param {string} tenantSchema - Validated schema name for the tenant.
 * @param {string} sql          - SQL query string.
 * @param {Array}  params       - Parameterized query values.
 * @param {number} timeoutMs    - Statement timeout in milliseconds.
 * @returns {Promise<pg.QueryResult>}
 */
async function runTenantQuery(tenantSchema, sql, params = [], timeoutMs = 5000) {
  if (!SAFE_IDENTIFIER.test(tenantSchema)) {
    throw new Error(`Invalid tenant schema name: "${tenantSchema}"`);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Scope search_path to the tenant schema for this transaction only.
    // pg driver escapes identifier strings; we further validate above.
    await client.query(`SET LOCAL search_path TO ${tenantSchema}, public`);
    // Enforce a per-query statement timeout.
    await client.query(`SET LOCAL statement_timeout = ${parseInt(timeoutMs, 10)}`);
    const result = await client.query(sql, params);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function end() {
  await pool.end();
}

module.exports = { runTenantQuery, end };
