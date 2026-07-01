import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyNearbyIntent, buildNearbyResponse } from './nearbyIntent.ts';
import type { NearbyUser } from '../api/discovery.ts';

// --- classifyNearbyIntent ---

test('classifyNearbyIntent: exact phrase "any Caraokes nearby"', () =>
  assert.equal(classifyNearbyIntent('any Caraokes nearby'), true));

test('classifyNearbyIntent: singular "any Caraoke nearby"', () =>
  assert.equal(classifyNearbyIntent('any Caraoke nearby'), true));

test('classifyNearbyIntent: "who\'s nearby"', () =>
  assert.equal(classifyNearbyIntent("who's nearby"), true));

test('classifyNearbyIntent: "who is singing nearby"', () =>
  assert.equal(classifyNearbyIntent('who is singing nearby'), true));

test('classifyNearbyIntent: "anyone near me"', () =>
  assert.equal(classifyNearbyIntent('anyone near me'), true));

test('classifyNearbyIntent: "anyone nearby"', () =>
  assert.equal(classifyNearbyIntent('anyone nearby'), true));

test('classifyNearbyIntent: "nearby singers"', () =>
  assert.equal(classifyNearbyIntent('are there nearby singers'), true));

test('classifyNearbyIntent: "find someone nearby"', () =>
  assert.equal(classifyNearbyIntent('find someone nearby'), true));

test('classifyNearbyIntent: "who is near me"', () =>
  assert.equal(classifyNearbyIntent('who is near me'), true));

test('classifyNearbyIntent: case-insensitive', () =>
  assert.equal(classifyNearbyIntent('ANY CARAOKES NEARBY'), true));

test('classifyNearbyIntent: null — song request', () =>
  assert.equal(classifyNearbyIntent('sing Bohemian Rhapsody'), false));

test('classifyNearbyIntent: null — pause', () =>
  assert.equal(classifyNearbyIntent('pause'), false));

test('classifyNearbyIntent: null — empty string', () =>
  assert.equal(classifyNearbyIntent(''), false));

test('classifyNearbyIntent: null — unrelated driving noise', () =>
  assert.equal(classifyNearbyIntent('um yeah okay'), false));

// --- buildNearbyResponse ---

test('buildNearbyResponse: empty array — warm message, no zero-count (UX-DR8)', () => {
  const result = buildNearbyResponse([]);
  assert.ok(!result.includes('0'), 'must not say "0"');
  assert.ok(result.length > 10, 'must be a warm non-trivial response');
});

test('buildNearbyResponse: one user — includes name and connect prompt', () => {
  const users: NearbyUser[] = [{ userId: 'u1', displayName: 'Alice', plusCode: '87Q8GG00+' }];
  const result = buildNearbyResponse(users);
  assert.ok(result.includes('Alice'), 'must include the user name');
  assert.ok(result.includes('connect'), 'must include a connect prompt');
});

test('buildNearbyResponse: two users — lists both names', () => {
  const users: NearbyUser[] = [
    { userId: 'u1', displayName: 'Alice', plusCode: '87Q8GG00+' },
    { userId: 'u2', displayName: 'Bob', plusCode: '87Q8GG00+' },
  ];
  const result = buildNearbyResponse(users);
  assert.ok(result.includes('Alice'), 'must include Alice');
  assert.ok(result.includes('Bob'), 'must include Bob');
  assert.ok(result.includes('2'), 'must mention count');
});

test('buildNearbyResponse: three users — Oxford-comma list', () => {
  const users: NearbyUser[] = [
    { userId: 'u1', displayName: 'Alice', plusCode: '87Q8GG00+' },
    { userId: 'u2', displayName: 'Bob', plusCode: '87Q8GG00+' },
    { userId: 'u3', displayName: 'Carlos', plusCode: '87Q8GG00+' },
  ];
  const result = buildNearbyResponse(users);
  assert.ok(result.includes('Alice'), 'must include Alice');
  assert.ok(result.includes('Bob'), 'must include Bob');
  assert.ok(result.includes('Carlos'), 'must include Carlos');
  assert.ok(result.includes('3'), 'must mention count');
});
