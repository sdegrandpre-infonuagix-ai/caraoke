import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyConnectIntent, findByName } from './connectIntent.ts';
import type { NearbyUser } from '../api/discovery.ts';

// --- classifyConnectIntent ---

test('classifyConnectIntent: "connect with Alice"', () => {
  const r = classifyConnectIntent('connect with Alice');
  assert.equal(r.matched, true);
  if (r.matched) assert.equal(r.targetName, 'Alice');
});

test('classifyConnectIntent: "sing with Bob"', () => {
  const r = classifyConnectIntent('sing with Bob');
  assert.equal(r.matched, true);
  if (r.matched) assert.equal(r.targetName, 'Bob');
});

test('classifyConnectIntent: "pair with Maria"', () => {
  const r = classifyConnectIntent('pair with Maria');
  assert.equal(r.matched, true);
  if (r.matched) assert.equal(r.targetName, 'Maria');
});

test('classifyConnectIntent: "add Carlos as a partner"', () => {
  const r = classifyConnectIntent('add Carlos as a partner');
  assert.equal(r.matched, true);
  if (r.matched) assert.equal(r.targetName, 'Carlos');
});

test('classifyConnectIntent: "duet with Alice"', () => {
  const r = classifyConnectIntent('duet with Alice');
  assert.equal(r.matched, true);
  if (r.matched) assert.equal(r.targetName, 'Alice');
});

test('classifyConnectIntent: case-insensitive "CONNECT WITH ALICE"', () => {
  const r = classifyConnectIntent('CONNECT WITH ALICE');
  assert.equal(r.matched, true);
  if (r.matched) assert.equal(r.targetName.toLowerCase(), 'alice');
});

test('classifyConnectIntent: no match — nearby query', () => {
  assert.equal(classifyConnectIntent('any Caraokes nearby').matched, false);
});

test('classifyConnectIntent: no match — pause', () => {
  assert.equal(classifyConnectIntent('pause').matched, false);
});

test('classifyConnectIntent: no match — empty', () => {
  assert.equal(classifyConnectIntent('').matched, false);
});

// --- findByName ---

const USERS: NearbyUser[] = [
  { userId: 'u1', displayName: 'Alice', plusCode: '87Q8GG00+' },
  { userId: 'u2', displayName: 'Bob Smith', plusCode: '87Q8GG00+' },
  { userId: 'u3', displayName: 'Carlos M.', plusCode: '87Q8GG00+' },
];

test('findByName: exact match', () => {
  const found = findByName(USERS, 'Alice');
  assert.equal(found?.userId, 'u1');
});

test('findByName: case-insensitive exact', () => {
  const found = findByName(USERS, 'alice');
  assert.equal(found?.userId, 'u1');
});

test('findByName: prefix match (first name of "Bob Smith")', () => {
  const found = findByName(USERS, 'Bob');
  assert.equal(found?.userId, 'u2');
});

test('findByName: substring match (partial of "Carlos M.")', () => {
  const found = findByName(USERS, 'Carlos');
  assert.equal(found?.userId, 'u3');
});

test('findByName: no match returns undefined', () => {
  assert.equal(findByName(USERS, 'Zara'), undefined);
});

test('findByName: empty list returns undefined', () => {
  assert.equal(findByName([], 'Alice'), undefined);
});
