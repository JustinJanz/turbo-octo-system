'use strict';

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const queryRouter = require('./routes/query');
const { logger } = require('./services/auditLogger');

const app = express();

// ── Security headers ────────────────────────────────────────────────────────
app.use(helmet());

// ── HTTP request logging ─────────────────────────────────────────────────────
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }),
);

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '64kb' }));

// ── Trust proxy (set to 1 if running behind a single reverse proxy) ──────────
app.set('trust proxy', 1);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/v1', queryRouter);

// ── Health check (no auth required) ──────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'NotFound', message: 'Route not found.' });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const isClientError = statusCode >= 400 && statusCode < 500;

  if (!isClientError) {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
  }

  res.status(statusCode).json({
    error: err.code || 'InternalServerError',
    message: isClientError ? err.message : 'An unexpected error occurred.',
  });
});

module.exports = app;
