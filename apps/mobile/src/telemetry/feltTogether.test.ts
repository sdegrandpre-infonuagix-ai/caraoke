// node --import tsx --test src/telemetry/feltTogether.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifySentiment,
  AFTERGLOW_MS,
  ANSWER_WINDOW_MS,
  FELT_TOGETHER_QUESTION,
} from './feltTogether.ts';

// ── no_response ───────────────────────────────────────────────────────────────

test('no_response: null transcript', () => {
  assert.equal(classifySentiment(null), 'no_response');
});

test('no_response: undefined transcript', () => {
  assert.equal(classifySentiment(undefined), 'no_response');
});

test('no_response: empty string', () => {
  assert.equal(classifySentiment(''), 'no_response');
});

test('no_response: whitespace only', () => {
  assert.equal(classifySentiment('   '), 'no_response');
});

// ── yes ───────────────────────────────────────────────────────────────────────

test('yes: exact word "yes"', () => {
  assert.equal(classifySentiment('yes'), 'yes');
});

test('yes: yeah', () => {
  assert.equal(classifySentiment('yeah totally'), 'yes');
});

test('yes: absolutely', () => {
  assert.equal(classifySentiment('absolutely, it felt great'), 'yes');
});

test('yes: it was amazing, yeah', () => {
  // "felt" and "together" are excluded from YES — too ambiguous in negative contexts.
  assert.equal(classifySentiment('it was amazing, yeah'), 'yes');
});

test('yes: loved it', () => {
  assert.equal(classifySentiment('I loved it'), 'yes');
});

test('yes: wonderful', () => {
  assert.equal(classifySentiment('it was wonderful'), 'yes');
});

test('yes: case-insensitive YES', () => {
  assert.equal(classifySentiment('YES'), 'yes');
});

// ── no ────────────────────────────────────────────────────────────────────────

test('no: exact word "no"', () => {
  assert.equal(classifySentiment('no'), 'no');
});

test('no: nope', () => {
  assert.equal(classifySentiment('nope, not really'), 'no');
});

test('no: it was disconnected', () => {
  assert.equal(classifySentiment('it was disconnected'), 'no');
});

test('no: lag ruined it', () => {
  assert.equal(classifySentiment("there was lag, it didn't feel right"), 'no');
});

test('no: separate', () => {
  assert.equal(classifySentiment('felt separate, not together'), 'no');
});

test('no: did not', () => {
  assert.equal(classifySentiment('it did not feel like singing together'), 'no');
});

// ── unclear ───────────────────────────────────────────────────────────────────

test('unclear: both yes and no present', () => {
  assert.equal(classifySentiment('yes and no, it was a bit disconnected but also great'), 'unclear');
});

test('unclear: unrelated speech', () => {
  assert.equal(classifySentiment('uh um what'), 'unclear');
});

test('unclear: background noise placeholder', () => {
  assert.equal(classifySentiment('hmm'), 'unclear');
});

test('unclear: mixed — felt + lag both appear', () => {
  assert.equal(classifySentiment('it felt great but there was some lag'), 'unclear');
});

// ── constants ─────────────────────────────────────────────────────────────────

test('AFTERGLOW_MS is 2 seconds', () => {
  assert.equal(AFTERGLOW_MS, 2_000);
});

test('ANSWER_WINDOW_MS is 10 seconds', () => {
  assert.equal(ANSWER_WINDOW_MS, 10_000);
});

test('FELT_TOGETHER_QUESTION is a non-empty string', () => {
  assert.ok(
    typeof FELT_TOGETHER_QUESTION === 'string' && FELT_TOGETHER_QUESTION.length > 0,
  );
});
