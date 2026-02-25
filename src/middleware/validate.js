'use strict';

const { z } = require('zod');

const querySchema = z.object({
  query: z.string().min(1).max(10_000),
  // Optional positional parameters for the query ($1, $2, ...)
  params: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).max(50).optional(),
});

/**
 * Validate the request body against the expected query schema.
 */
function validateBody(req, res, next) {
  const result = querySchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'Invalid request body.',
      details: result.error.flatten().fieldErrors,
    });
  }
  req.validatedBody = result.data;
  return next();
}

module.exports = { validateBody };
