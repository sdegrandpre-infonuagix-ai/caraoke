import { describe, it, expect } from 'vitest';
import { canTransition, SESSION_STATES } from './session.js';
import { ok, fail } from './response.js';
import { AppError } from './errors.js';

describe('session state machine', () => {
  it('allows valid forward transitions', () => {
    expect(canTransition('idle', 'pairing')).toBe(true);
    expect(canTransition('ready', 'playing')).toBe(true);
    expect(canTransition('playing', 'reconnecting')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(canTransition('idle', 'playing')).toBe(false);
    expect(canTransition('ended', 'pairing')).toBe(false);
  });

  it('every state is reachable in the enum', () => {
    expect(SESSION_STATES).toContain('idle');
    expect(SESSION_STATES).toContain('ended');
  });
});

describe('response envelope', () => {
  it('ok() puts data with null error', () => {
    expect(ok(42)).toEqual({ data: 42, error: null });
  });

  it('fail() puts error with null data', () => {
    const err = new AppError('NOT_FOUND', 'missing').toErrorObject();
    expect(fail(err)).toEqual({ data: null, error: err });
  });
});

describe('AppError', () => {
  it('maps codes to default http status', () => {
    expect(new AppError('PREMIUM_REQUIRED', 'x').httpStatus).toBe(402);
    expect(new AppError('SESSION_NOT_FOUND', 'x').httpStatus).toBe(404);
  });
});
