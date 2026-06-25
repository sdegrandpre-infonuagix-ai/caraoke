import { z, type ZodType } from 'zod';
import { errorObjectSchema, type ErrorObject } from './errors.js';

/**
 * Uniform response envelope (architecture: Format Patterns).
 * EVERY API response is `{ data, error }` — exactly one is non-null.
 */
export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: ErrorObject };

/** Collection payload shape for list endpoints. */
export interface Collection<T> {
  items: T[];
  nextCursor?: string;
}

export function ok<T>(data: T): ApiResponse<T> {
  return { data, error: null };
}

export function fail(error: ErrorObject): ApiResponse<never> {
  return { data: null, error };
}

/** Build a Zod schema for a success/failure envelope around a data schema. */
export function apiResponseSchema<T extends ZodType>(dataSchema: T) {
  return z.union([
    z.object({ data: dataSchema, error: z.null() }),
    z.object({ data: z.null(), error: errorObjectSchema }),
  ]);
}
