import type { ErrorRequestHandler } from 'express';
import { AppError, fail } from '@caraoke/shared';

/**
 * Central Express error middleware → uniform `{ data, error }` envelope
 * (architecture: Process Patterns). Unknown errors become a generic INTERNAL.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    // Temporary: log handled errors too (code+message+path) so playback failures are visible.
    console.warn('[api] handled error', {
      code: err.code,
      status: err.httpStatus,
      message: err.message,
      path: req.method + ' ' + req.path,
    });
    res.status(err.httpStatus).json(fail(err.toErrorObject()));
    return;
  }

  // Avoid leaking internals; structured log without PII.
  console.error('[api] unhandled error', { message: (err as Error)?.message });
  res.status(500).json(
    fail({ code: 'INTERNAL', message: 'An unexpected error occurred.' }),
  );
};
