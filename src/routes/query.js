'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { limiter } = require('../middleware/rateLimiter');
const { validateBody } = require('../middleware/validate');
const { executeQuery } = require('../services/queryExecutor');

const router = Router();

/**
 * POST /query
 *
 * Execute a read-only SQL SELECT against the caller's tenant schema.
 *
 * Headers:
 *   X-API-Key: <api-key>      (required)
 *   Content-Type: application/json
 *
 * Body:
 *   { "query": "SELECT ...", "params": [...] }
 *
 * Response 200:
 *   {
 *     "requestId": "uuid",
 *     "tenantId": "tenant_acme",
 *     "rowCount": 42,
 *     "truncated": false,
 *     "maxRows": 1000,
 *     "durationMs": 12,
 *     "rows": [...]
 *   }
 */
router.post(
  '/query',
  authenticate,
  limiter,
  validateBody,
  async (req, res, next) => {
    try {
      const { query, params } = req.validatedBody;
      const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';

      const result = await executeQuery({
        tenantId: req.tenantId,
        apiKey: req.apiKey,
        query,
        params: params || [],
        clientIp,
      });

      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  },
);

module.exports = router;
