'use strict';

const config = require('../config');

/**
 * Authenticate the request using the X-API-Key header.
 * Attaches `req.tenantId` and `req.apiKey` on success.
 */
function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing X-API-Key header.',
    });
  }

  const tenantId = config.security.apiKeys.get(apiKey);
  if (!tenantId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key.',
    });
  }

  req.apiKey = apiKey;
  req.tenantId = tenantId;
  return next();
}

module.exports = { authenticate };
