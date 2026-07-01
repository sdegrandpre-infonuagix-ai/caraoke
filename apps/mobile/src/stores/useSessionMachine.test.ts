// node --import tsx --test src/stores/useSessionMachine.test.ts
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { useSessionMachine } from './useSessionMachine.ts';

function reset() {
  useSessionMachine.getState().reset();
}

test('initial state is idle', () => {
  reset();
  assert.equal(useSessionMachine.getState().state, 'idle');
});

test('valid transitions return true and apply the state', () => {
  reset();
  assert.equal(useSessionMachine.getState().transition('pairing'), true);
  assert.equal(useSessionMachine.getState().state, 'pairing');
});

test('invalid transitions return false and leave state unchanged', () => {
  reset();
  assert.equal(useSessionMachine.getState().transition('playing'), false);
  assert.equal(useSessionMachine.getState().state, 'idle');
});

test('same-state transition is a no-op that returns true', () => {
  reset();
  assert.equal(useSessionMachine.getState().transition('idle'), true);
  assert.equal(useSessionMachine.getState().state, 'idle');
});

test('full happy-path: idle → pairing → ready → playing → ended', () => {
  reset();
  const { transition } = useSessionMachine.getState();
  assert.equal(transition('pairing'), true);
  assert.equal(transition('ready'), true);
  assert.equal(transition('playing'), true);
  assert.equal(transition('ended'), true);
  assert.equal(useSessionMachine.getState().state, 'ended');
});

test('reconnect path: playing → reconnecting → playing', () => {
  reset();
  const { transition } = useSessionMachine.getState();
  transition('pairing'); transition('ready'); transition('playing');
  assert.equal(transition('reconnecting'), true);
  assert.equal(transition('playing'), true);
  assert.equal(useSessionMachine.getState().state, 'playing');
});

test('reset() returns the machine to idle from any state', () => {
  reset();
  useSessionMachine.getState().transition('pairing');
  useSessionMachine.getState().transition('ready');
  useSessionMachine.getState().reset();
  assert.equal(useSessionMachine.getState().state, 'idle');
});

test('subscriber fires on state change', () => {
  reset();
  const observed: string[] = [];
  const unsub = useSessionMachine.subscribe((s) => observed.push(s.state));
  useSessionMachine.getState().transition('pairing');
  useSessionMachine.getState().transition('ready');
  unsub();
  useSessionMachine.getState().transition('playing'); // should not fire after unsub
  assert.deepEqual(observed, ['pairing', 'ready']);
});
