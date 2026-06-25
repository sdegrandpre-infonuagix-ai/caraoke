import type { ErrorRequestHandler } from 'express';
import { AppError, fail } from '@caraoke/shared';

/**
 * Central Express error middleware → uniform `{ data, error }` envelope
 * (architecture: Process Patterns). Unknown errors become a generic INTERNAL.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.httpStatus).json(fail(err.toErrorObject()));
    return;
  }

  // Avoid leaking internals; structured log without PII.
  console.error('[api] unhandled error', { message: (err as Error)?.message });
  res.status(500).json(
    fail({ code: 'INTERNAL', message: 'An unexpected error occurred.' }),
  );
};
