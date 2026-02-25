'use strict';

const { Parser } = require('node-sql-parser');

const parser = new Parser();

// Statements that are never permitted, regardless of SQL structure.
const BLOCKED_STATEMENT_TYPES = new Set([
  'alter', 'create', 'drop', 'truncate',  // DDL
  'insert', 'update', 'delete', 'merge',  // DML
  'grant', 'revoke',                       // DCL
  'call', 'execute',                       // Stored procs
  'copy',                                  // Bulk ops (PostgreSQL)
  'set', 'reset',                          // Session configuration
  'show',                                  // Could leak config
]);

// Keyword fragments that must not appear anywhere in the raw SQL,
// used as a secondary safeguard against parser edge cases.
const BLOCKED_PATTERNS = [
  /\bpg_read_file\b/i,
  /\bpg_ls_dir\b/i,
  /\bpg_sleep\b/i,          // trivial DoS via sleep
  /\blo_import\b/i,
  /\blo_export\b/i,
  /\bcopy\b/i,
  /\bexec\s*\(/i,
  /;\s*\S/,                  // Multiple statements via semicolon
  /--/,                      // Inline comment (could hide injections)
  /\/\*/,                    // Block comment
];

/**
 * Validate that the provided SQL is a safe, single SELECT statement.
 *
 * @param {string} sql - Raw SQL string from the request.
 * @returns {{ ok: boolean, reason?: string }}
 */
function validateQuery(sql) {
  if (typeof sql !== 'string' || !sql.trim()) {
    return { ok: false, reason: 'Query must be a non-empty string.' };
  }

  if (sql.length > 10_000) {
    return { ok: false, reason: 'Query exceeds maximum allowed length (10 000 chars).' };
  }

  // Secondary pattern checks before parsing
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(sql)) {
      return { ok: false, reason: 'Query contains disallowed syntax or keywords.' };
    }
  }

  let ast;
  try {
    ast = parser.astify(sql, { database: 'PostgresQL' });
  } catch {
    return { ok: false, reason: 'Query could not be parsed as valid SQL.' };
  }

  // Normalise to array (parser returns object for single statements)
  const statements = Array.isArray(ast) ? ast : [ast];

  if (statements.length !== 1) {
    return { ok: false, reason: 'Only a single SQL statement is allowed per request.' };
  }

  const stmt = statements[0];
  const type = (stmt.type || '').toLowerCase();

  if (type !== 'select') {
    return { ok: false, reason: `Statement type "${type}" is not permitted. Only SELECT is allowed.` };
  }

  if (BLOCKED_STATEMENT_TYPES.has(type)) {
    return { ok: false, reason: `Statement type "${type}" is not permitted.` };
  }

  return { ok: true };
}

module.exports = { validateQuery };
