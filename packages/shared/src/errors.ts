import { z } from 'zod';

/**
 * Stable, machine-readable error codes used across the API (architecture: Format Patterns).
 * `code` is a stable string clients can switch on; `message` is human-facing.
 */
export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'PREMIUM_REQUIRED',
  'SESSION_NOT_FOUND',
  'INVITE_EXPIRED',
  'RATE_LIMITED',
  'INTERNAL',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const errorObjectSchema = z.object({
  code: z.enum(ERROR_CODES),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ErrorObject = z.infer<typeof errorObjectSchema>;

/**
 * Typed application error. Thrown in services; mapped to the uniform error
 * envelope by the central Express error middleware (architecture: Process Patterns).
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    options?: { httpStatus?: number; details?: Record<string, unknown> },
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = options?.httpStatus ?? DEFAULT_HTTP_STATUS[code];
    this.details = options?.details;
  }

  toErrorObject(): ErrorObject {
    return {
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

const DEFAULT_HTTP_STATUS: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PREMIUM_REQUIRED: 402,
  SESSION_NOT_FOUND: 404,
  INVITE_EXPIRED: 410,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};
