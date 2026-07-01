// node --import tsx --test src/agent/playbackIntent.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyPlaybackIntent, COMMAND_CONFIRMATIONS } from './playbackIntent.ts';

// --- pause ---
test('pause: exact word', () => assert.equal(classifyPlaybackIntent('pause'), 'pause'));
test('pause: with surrounding words', () => assert.equal(classifyPlaybackIntent('can you pause please'), 'pause'));
test('pause: hold on', () => assert.equal(classifyPlaybackIntent('hold on a second'), 'pause'));
test('pause: wait', () => assert.equal(classifyPlaybackIntent('wait'), 'pause'));

// --- resume ---
test('resume: exact word', () => assert.equal(classifyPlaybackIntent('resume'), 'resume'));
test('resume: continue', () => assert.equal(classifyPlaybackIntent('continue'), 'resume'));
test('resume: unpause', () => assert.equal(classifyPlaybackIntent('unpause'), 'resume'));
test('resume: play again', () => assert.equal(classifyPlaybackIntent('play again'), 'resume'));
test('resume: keep going', () => assert.equal(classifyPlaybackIntent('keep going'), 'resume'));

// --- stop ---
test('stop: stop the song', () => assert.equal(classifyPlaybackIntent('stop the song'), 'stop'));
test('stop: end the session', () => assert.equal(classifyPlaybackIntent('end the session'), 'stop'));
test('stop: stop the music', () => assert.equal(classifyPlaybackIntent('stop the music'), 'stop'));
test('stop: finish', () => assert.equal(classifyPlaybackIntent('finish'), 'stop'));
test('stop: end', () => assert.equal(classifyPlaybackIntent('end'), 'stop'));
test('stop: bare stop', () => assert.equal(classifyPlaybackIntent('okay stop'), 'stop'));

// --- priority: resume beats pause and stop ---
test('priority: resume beats pause when both present', () =>
  assert.equal(classifyPlaybackIntent('pause and resume'), 'resume'));
test('priority: resume beats stop', () =>
  assert.equal(classifyPlaybackIntent('stop playing and resume'), 'resume'));

// --- null for unrelated transcripts ---
test('null: unrelated transcript', () => assert.equal(classifyPlaybackIntent('sing Bohemian Rhapsody'), null));
test('null: empty string', () => assert.equal(classifyPlaybackIntent(''), null));
test('null: background noise placeholder', () => assert.equal(classifyPlaybackIntent('um'), null));

// --- confirmation messages present ---
test('COMMAND_CONFIRMATIONS has all three commands', () => {
  assert.ok(COMMAND_CONFIRMATIONS.pause.length > 0);
  assert.ok(COMMAND_CONFIRMATIONS.resume.length > 0);
  assert.ok(COMMAND_CONFIRMATIONS.stop.length > 0);
});

// case-insensitivity
test('case-insensitive: PAUSE', () => assert.equal(classifyPlaybackIntent('PAUSE'), 'pause'));
test('case-insensitive: RESUME NOW', () => assert.equal(classifyPlaybackIntent('RESUME NOW'), 'resume'));
