// node --import tsx --test src/sonic/cues.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cueForState, STATE_CUES } from './cues.ts';
import { SESSION_STATES } from '@caraoke/shared';

test('STATE_CUES covers every SessionState', () => {
  for (const s of SESSION_STATES) {
    assert.ok(s in STATE_CUES, `Missing cue entry for state: ${s}`);
  }
});

test('idle has no cue (silent entry point)', () => {
  assert.equal(cueForState('idle'), null);
});

test('every non-idle state has a cue string', () => {
  const active = ['pairing', 'ready', 'playing', 'reconnecting', 'ended'] as const;
  for (const s of active) {
    const cue = cueForState(s);
    assert.ok(typeof cue === 'string' && cue.length > 0, `Expected cue string for ${s}`);
  }
});
