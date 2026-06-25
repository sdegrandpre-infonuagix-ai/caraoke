// Runnable with: node --import tsx --test src/auth/jwt.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeJwt, isExpired } from './jwt.ts';

// A JWT with payload { sub: "abc", email: "x@y.ca", exp: 2000000000 } (signature irrelevant).
function makeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'none' })}.${b64(payload)}.sig`;
}

test('decodeJwt reads the payload', () => {
  const token = makeJwt({ sub: 'abc', email: 'x@y.ca', exp: 2_000_000_000 });
  assert.equal(decodeJwt(token)?.email, 'x@y.ca');
});

test('decodeJwt returns null for malformed tokens', () => {
  assert.equal(decodeJwt('not-a-jwt'), null);
});

test('isExpired is true for null and past tokens, false for future', () => {
  assert.equal(isExpired(null, Date.now()), true);
  const past = makeJwt({ exp: 1_000 }); // 1970
  const future = makeJwt({ exp: 2_000_000_000 }); // 2033
  assert.equal(isExpired(past, Date.now()), true);
  assert.equal(isExpired(future, Date.now()), false);
});
