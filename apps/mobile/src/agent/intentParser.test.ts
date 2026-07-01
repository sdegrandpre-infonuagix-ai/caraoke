// node --import tsx --test src/agent/intentParser.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAgentResponse } from './intentParser.ts';

const track = { id: 't1', name: 'Bohemian Rhapsody', artist: 'Queen', uri: 'spotify:track:t1' };

test('parseAgentResponse: valid confirm payload', () => {
  const r = parseAgentResponse({ action: 'confirm', speech: 'You want to sing Bohemian Rhapsody. Right?', track });
  assert.equal(r.action, 'confirm');
  if (r.action === 'confirm') {
    assert.equal(r.track.id, 't1');
    assert.equal(r.speech, 'You want to sing Bohemian Rhapsody. Right?');
  }
});

test('parseAgentResponse: confirm with bad track falls back to re_ask', () => {
  const r = parseAgentResponse({ action: 'confirm', speech: 'ok', track: { id: 123 } });
  assert.equal(r.action, 're_ask');
});

test('parseAgentResponse: valid clarify payload', () => {
  const track2 = { id: 't2', name: 'Bohemian Like You', artist: 'Dandy Warhols', uri: 'spotify:track:t2' };
  const r = parseAgentResponse({ action: 'clarify', speech: 'Did you mean A or B?', choices: [track, track2] });
  assert.equal(r.action, 'clarify');
  if (r.action === 'clarify') {
    assert.equal(r.choices[0].id, 't1');
    assert.equal(r.choices[1].id, 't2');
  }
});

test('parseAgentResponse: clarify with wrong number of choices falls back to re_ask', () => {
  const r = parseAgentResponse({ action: 'clarify', speech: 'Did you mean A or B or C?', choices: [track] });
  assert.equal(r.action, 're_ask');
});

test('parseAgentResponse: re_ask passthrough', () => {
  const r = parseAgentResponse({ action: 're_ask', speech: "Didn't catch that." });
  assert.equal(r.action, 're_ask');
  assert.equal(r.speech, "Didn't catch that.");
});

test('parseAgentResponse: exit passthrough', () => {
  const r = parseAgentResponse({ action: 'exit', speech: 'No worries.' });
  assert.equal(r.action, 'exit');
});

test('parseAgentResponse: null input falls back to re_ask', () => {
  const r = parseAgentResponse(null);
  assert.equal(r.action, 're_ask');
});

test('parseAgentResponse: unknown action falls back to re_ask', () => {
  const r = parseAgentResponse({ action: 'send_money', speech: 'transferring now' });
  assert.equal(r.action, 're_ask');
});

test('parseAgentResponse: missing speech gets a default message', () => {
  const r = parseAgentResponse({ action: 're_ask' });
  assert.equal(r.action, 're_ask');
  assert.ok(typeof r.speech === 'string' && r.speech.length > 0);
});
