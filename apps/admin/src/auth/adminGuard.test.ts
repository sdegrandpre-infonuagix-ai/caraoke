import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decodePayload, isAdminToken, isTokenValid } from './adminGuard.js';

// Helper: build a minimal base64url JWT-shaped string (no real signing)
function makeToken(payload: object): string {
  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `header.${encode(payload)}.sig`;
}

const ADMIN_PAYLOAD = {
  sub: 'user-001',
  email: 'founder@caraoke.app',
  'cognito:groups': ['admin'],
  exp: 9999999999,
};

const USER_PAYLOAD = {
  sub: 'user-002',
  email: 'singer@example.com',
  'cognito:groups': ['users'],
  exp: 9999999999,
};

const EXPIRED_PAYLOAD = {
  sub: 'user-003',
  'cognito:groups': ['admin'],
  exp: 1000000000,
};

describe('decodePayload', () => {
  it('decodes a valid JWT payload', () => {
    const token = makeToken(ADMIN_PAYLOAD);
    const payload = decodePayload(token);
    assert.equal(payload?.sub, 'user-001');
    assert.deepEqual(payload?.['cognito:groups'], ['admin']);
  });

  it('returns null for a malformed token', () => {
    assert.equal(decodePayload('not.a.token'), null);
    assert.equal(decodePayload('bad'), null);
  });
});

describe('isAdminToken', () => {
  it('returns true for admin group member', () => {
    const payload = decodePayload(makeToken(ADMIN_PAYLOAD));
    assert.equal(isAdminToken(payload), true);
  });

  it('returns false for non-admin user', () => {
    const payload = decodePayload(makeToken(USER_PAYLOAD));
    assert.equal(isAdminToken(payload), false);
  });

  it('returns false for null payload', () => {
    assert.equal(isAdminToken(null), false);
  });

  it('returns false when groups array is missing', () => {
    const payload = decodePayload(makeToken({ sub: 'x', exp: 9999999999 }));
    assert.equal(isAdminToken(payload), false);
  });
});

describe('isTokenValid', () => {
  it('returns true when not expired', () => {
    const payload = decodePayload(makeToken(ADMIN_PAYLOAD));
    assert.equal(isTokenValid(payload, 1_000_000), true);
  });

  it('returns false when expired', () => {
    const payload = decodePayload(makeToken(EXPIRED_PAYLOAD));
    assert.equal(isTokenValid(payload, 2_000_000_000), false);
  });

  it('returns false for null payload', () => {
    assert.equal(isTokenValid(null, 1_000_000), false);
  });
});
