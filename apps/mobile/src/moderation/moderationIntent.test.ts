import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyModerationIntent, MODERATION_CONFIRMATIONS } from './moderationIntent.ts';

// --- mute ---

test('mute: bare "mute"', () =>
  assert.equal(classifyModerationIntent('mute'), 'mute'));

test('mute: "mute my partner"', () =>
  assert.equal(classifyModerationIntent('mute my partner'), 'mute'));

test('mute: "silence them"', () =>
  assert.equal(classifyModerationIntent('silence them'), 'mute'));

test('mute: "silence this person"', () =>
  assert.equal(classifyModerationIntent('silence this person'), 'mute'));

test('mute: "stop their voice"', () =>
  assert.equal(classifyModerationIntent('stop their voice'), 'mute'));

// --- block ---

test('block: bare "block"', () =>
  assert.equal(classifyModerationIntent('block'), 'block'));

test('block: "block this person"', () =>
  assert.equal(classifyModerationIntent('block this person'), 'block'));

test('block: "block my partner"', () =>
  assert.equal(classifyModerationIntent('block my partner'), 'block'));

// block takes priority over report for "block and report"
test('block: priority over report on "block and report"', () =>
  assert.equal(classifyModerationIntent('block and report'), 'block'));

// --- report ---

test('report: bare "report"', () =>
  assert.equal(classifyModerationIntent('report'), 'report'));

test('report: "report this person"', () =>
  assert.equal(classifyModerationIntent('report this person'), 'report'));

test('report: "report my partner"', () =>
  assert.equal(classifyModerationIntent('report my partner'), 'report'));

test('report: "report this incident"', () =>
  assert.equal(classifyModerationIntent('report this incident'), 'report'));

// --- case-insensitive ---

test('case-insensitive: MUTE', () =>
  assert.equal(classifyModerationIntent('MUTE'), 'mute'));

test('case-insensitive: BLOCK THIS PERSON', () =>
  assert.equal(classifyModerationIntent('BLOCK THIS PERSON'), 'block'));

// --- null (not a moderation command) ---

test('null: song request', () =>
  assert.equal(classifyModerationIntent('sing Bohemian Rhapsody'), null));

test('null: pause', () =>
  assert.equal(classifyModerationIntent('pause'), null));

test('null: empty string', () =>
  assert.equal(classifyModerationIntent(''), null));

test('null: nearby query', () =>
  assert.equal(classifyModerationIntent('any Caraokes nearby'), null));

// --- confirmations ---

test('MODERATION_CONFIRMATIONS: all three commands have confirmations', () => {
  assert.ok(MODERATION_CONFIRMATIONS['mute'].length > 0);
  assert.ok(MODERATION_CONFIRMATIONS['block'].length > 0);
  assert.ok(MODERATION_CONFIRMATIONS['report'].length > 0);
});
