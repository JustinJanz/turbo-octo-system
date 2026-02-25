'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Rate limiter keyed by tenant ID (set by auth middleware).
 * Falls back to IP if tenant is not yet resolved.
 */
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.tenantId || req.ip,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'TooManyRequests',
      message: 'Rate limit exceeded. Please slow down.',
    });
  },
});

module.exports = { limiter };
