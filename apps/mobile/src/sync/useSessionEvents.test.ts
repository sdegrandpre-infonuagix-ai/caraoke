// node --import tsx --test src/sync/useSessionEvents.test.ts
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { useSessionMachine } from '../stores/useSessionMachine.ts';
import { handleDomainEvent } from './useSessionEvents.ts';
import type { AnyDomainEvent } from './appSyncEvents.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function reset() {
  useSessionMachine.getState().reset();
}

function makeEvent(type: string): AnyDomainEvent {
  return { type: type as AnyDomainEvent['type'], version: 1, sessionId: 'sess-1', occurredAt: '2026-07-01T00:00:00.000Z', data: {} };
}

function fire(type: string): boolean {
  return handleDomainEvent(makeEvent(type), useSessionMachine.getState().transition);
}

// ---------------------------------------------------------------------------
// Valid transitions driven by real events
// ---------------------------------------------------------------------------

test('partner.ready transitions pairing → ready', () => {
  reset();
  useSessionMachine.getState().transition('pairing');
  const ok = fire('partner.ready');
  assert.equal(ok, true);
  assert.equal(useSessionMachine.getState().state, 'ready');
});

test('playback.scheduled transitions ready → playing', () => {
  reset();
  useSessionMachine.getState().transition('pairing');
  useSessionMachine.getState().transition('ready');
  const ok = fire('playback.scheduled');
  assert.equal(ok, true);
  assert.equal(useSessionMachine.getState().state, 'playing');
});

test('session.reconnecting transitions playing → reconnecting', () => {
  reset();
  useSessionMachine.getState().transition('pairing');
  useSessionMachine.getState().transition('ready');
  useSessionMachine.getState().transition('playing');
  const ok = fire('session.reconnecting');
  assert.equal(ok, true);
  assert.equal(useSessionMachine.getState().state, 'reconnecting');
});

test('session.ended transitions playing → ended', () => {
  reset();
  useSessionMachine.getState().transition('pairing');
  useSessionMachine.getState().transition('ready');
  useSessionMachine.getState().transition('playing');
  const ok = fire('session.ended');
  assert.equal(ok, true);
  assert.equal(useSessionMachine.getState().state, 'ended');
});

test('session.ended transitions reconnecting → ended', () => {
  reset();
  useSessionMachine.getState().transition('pairing');
  useSessionMachine.getState().transition('ready');
  useSessionMachine.getState().transition('playing');
  useSessionMachine.getState().transition('reconnecting');
  const ok = fire('session.ended');
  assert.equal(ok, true);
  assert.equal(useSessionMachine.getState().state, 'ended');
});

test('session.ended transitions pairing → ended', () => {
  reset();
  useSessionMachine.getState().transition('pairing');
  const ok = fire('session.ended');
  assert.equal(ok, true);
  assert.equal(useSessionMachine.getState().state, 'ended');
});

// ---------------------------------------------------------------------------
// Illegal-transition rejections — machine state must not change
// ---------------------------------------------------------------------------

test('partner.ready is rejected when state is idle (idle cannot → ready)', () => {
  reset(); // state: idle
  const ok = fire('partner.ready');
  assert.equal(ok, false);
  assert.equal(useSessionMachine.getState().state, 'idle');
});

test('playback.scheduled is rejected when state is pairing (pairing cannot → playing)', () => {
  reset();
  useSessionMachine.getState().transition('pairing');
  const ok = fire('playback.scheduled');
  assert.equal(ok, false);
  assert.equal(useSessionMachine.getState().state, 'pairing');
});

test('playback.scheduled is rejected when state is idle', () => {
  reset();
  const ok = fire('playback.scheduled');
  assert.equal(ok, false);
  assert.equal(useSessionMachine.getState().state, 'idle');
});

test('session.reconnecting is rejected when state is ready (ready cannot → reconnecting)', () => {
  reset();
  useSessionMachine.getState().transition('pairing');
  useSessionMachine.getState().transition('ready');
  const ok = fire('session.reconnecting');
  assert.equal(ok, false);
  assert.equal(useSessionMachine.getState().state, 'ready');
});

test('no transition is applied for an ended session (ended has no allowed targets)', () => {
  reset();
  useSessionMachine.getState().transition('pairing');
  useSessionMachine.getState().transition('ended');
  // Any further event should be rejected.
  const ok = fire('partner.ready');
  assert.equal(ok, false);
  assert.equal(useSessionMachine.getState().state, 'ended');
});

// ---------------------------------------------------------------------------
// Unknown event types — must be no-ops
// ---------------------------------------------------------------------------

test('unknown event type returns false and leaves state unchanged', () => {
  reset();
  useSessionMachine.getState().transition('pairing');
  const ok = fire('some.unknown.event');
  assert.equal(ok, false);
  assert.equal(useSessionMachine.getState().state, 'pairing');
});

test('session.started event is a no-op (server-only, not consumed by the machine here)', () => {
  reset();
  const ok = fire('session.started');
  assert.equal(ok, false);
  assert.equal(useSessionMachine.getState().state, 'idle');
});
