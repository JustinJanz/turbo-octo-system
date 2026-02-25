# CLAUDE.md

This file provides context and guidance for Claude Code when working in this repository.

## Project Overview

**turbo-octo-system** is a secure SQL query API server built with Express.js and PostgreSQL.

It accepts SQL SELECT queries over HTTP, executes them against PostgreSQL with tenant isolation, and returns structured JSON results. All executions are audited.

## Architecture

```
src/
├── index.js              # Entry point: starts HTTP server, graceful shutdown
├── app.js                # Express app: middleware stack, routes, error handler
├── config/
│   └── index.js          # Centralised config from env vars
├── middleware/
│   ├── auth.js           # API key authentication → resolves tenantId
│   ├── rateLimiter.js    # Per-tenant rate limiting
│   └── validate.js       # Zod request body validation
├── routes/
│   └── query.js          # POST /v1/query endpoint
├── services/
│   ├── db.js             # pg connection pool; runTenantQuery (schema isolation)
│   ├── queryExecutor.js  # Orchestrates validation + execution + audit
│   └── auditLogger.js    # Structured Winston logger for audit events
└── utils/
    └── queryGuard.js     # SQL AST parser — enforces SELECT-only policy
```

## Development Commands

### Install Dependencies
```bash
npm install
```

### Run (development — auto-restarts on change)
```bash
npm run dev
```

### Run (production)
```bash
npm start
```

### Run Tests
```bash
npm test
```

## Configuration

Copy `.env.example` to `.env` and fill in values:

| Variable              | Description                                              | Default    |
|-----------------------|----------------------------------------------------------|------------|
| `DATABASE_URL`        | PostgreSQL connection string                             | required   |
| `PORT`                | HTTP port                                                | `3000`     |
| `NODE_ENV`            | Environment (`development` / `production`)               | `development` |
| `API_KEYS`            | Comma-separated `key:tenantId` pairs                     | required   |
| `QUERY_TIMEOUT_MS`    | Max query execution time (ms)                            | `5000`     |
| `MAX_ROWS`            | Maximum rows returned per query                          | `1000`     |
| `RATE_LIMIT_WINDOW_MS`| Rate limit window (ms)                                   | `60000`    |
| `RATE_LIMIT_MAX`      | Max requests per window per tenant                       | `100`      |

### API Keys format

```
API_KEYS=secret-key-1:tenant_acme,secret-key-2:tenant_globex
```

Each key maps to a PostgreSQL schema name. All queries for that key execute with `search_path` set to that schema.

## API

### `POST /v1/query`

Execute a read-only SELECT query.

**Headers:**
```
X-API-Key: <your-api-key>
Content-Type: application/json
```

**Body:**
```json
{
  "query": "SELECT id, name FROM users WHERE active = $1",
  "params": [true]
}
```

**Response 200:**
```json
{
  "requestId": "a1b2c3d4-...",
  "tenantId": "tenant_acme",
  "rowCount": 3,
  "truncated": false,
  "maxRows": 1000,
  "durationMs": 12,
  "rows": [...]
}
```

### `GET /health`

Returns `200 { "status": "ok" }` — no auth required.

## Security Model

| Control                | Implementation                                             |
|------------------------|------------------------------------------------------------|
| Authentication         | `X-API-Key` header — constant-time lookup against config   |
| Tenant isolation       | PostgreSQL `SET LOCAL search_path = <tenant_schema>`       |
| SELECT-only enforcement| SQL AST parsing via `node-sql-parser`                      |
| Dangerous keyword block| Regex blocklist (comments, `pg_read_file`, `COPY`, etc.)   |
| Query timeout          | `SET LOCAL statement_timeout` per query                    |
| Row cap                | Server-side slice to `MAX_ROWS`                            |
| Rate limiting          | `express-rate-limit` keyed by tenant ID                    |
| Security headers       | `helmet`                                                   |
| Audit logging          | Structured JSON via Winston — every query, success or fail |
| Error sanitisation     | DB error details stripped before returning to client       |

## Repository Conventions

- **Default branch**: `main`
- **Feature branches**: `feature/my-feature` or `fix/bug-description`
- **Commit style**: Clear, imperative messages (e.g. "Add user authentication")

## Claude Code Session Hook

A `SessionStart` hook is configured at `.claude/hooks/session-start.sh`. It runs automatically at the start of each Claude Code web session.

Edit `.claude/hooks/session-start.sh` to add dependency installation steps as the project evolves.

## Notes for Claude

- Only modify files that are directly related to the requested change.
- Never relax security controls (query guard, tenant isolation, auth) without explicit instruction.
- The `validateQuery` function in `src/utils/queryGuard.js` is the security boundary — treat changes to it with extra care.
- When adding new routes, always apply `authenticate` and `limiter` middleware.
- Keep error messages returned to clients vague (avoid leaking schema/table names or stack traces).
