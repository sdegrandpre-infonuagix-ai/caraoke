import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isRequired,
  permissionLabel,
  PERMISSION_DESCRIPTIONS,
} from './permissionStatus.ts';

// --- isRequired ---

test('isRequired: microphone is the only required permission', () => {
  assert.equal(isRequired('microphone'), true);
  assert.equal(isRequired('location'), false);
  assert.equal(isRequired('notifications'), false);
});

// --- permissionLabel ---

test('permissionLabel: granted', () =>
  assert.equal(permissionLabel('granted'), 'Granted'));

test('permissionLabel: denied includes "Settings" hint', () => {
  const label = permissionLabel('denied');
  assert.ok(label.includes('Settings'), 'denied label should direct user to Settings');
});

test('permissionLabel: undetermined is "Not yet requested"', () =>
  assert.ok(permissionLabel('undetermined').toLowerCase().includes('not')));

// --- PERMISSION_DESCRIPTIONS ---

test('PERMISSION_DESCRIPTIONS: all three types have descriptions', () => {
  assert.ok(PERMISSION_DESCRIPTIONS.microphone.length > 0);
  assert.ok(PERMISSION_DESCRIPTIONS.location.length > 0);
  assert.ok(PERMISSION_DESCRIPTIONS.notifications.length > 0);
});

test('PERMISSION_DESCRIPTIONS: mic description mentions "required"', () =>
  assert.ok(PERMISSION_DESCRIPTIONS.microphone.toLowerCase().includes('required')));

test('PERMISSION_DESCRIPTIONS: location description mentions "optional"', () =>
  assert.ok(PERMISSION_DESCRIPTIONS.location.toLowerCase().includes('optional')));

test('PERMISSION_DESCRIPTIONS: notifications description mentions "optional"', () =>
  assert.ok(PERMISSION_DESCRIPTIONS.notifications.toLowerCase().includes('optional')));
