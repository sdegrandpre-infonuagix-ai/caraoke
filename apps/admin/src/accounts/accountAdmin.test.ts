import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  accountStatus,
  accountStatusLabel,
  isSuspended,
  suspendConfirmMessage,
  reinstateConfirmMessage,
} from './accountAdmin.js';

describe('accountStatus', () => {
  it('returns active for null suspendedAt', () => assert.equal(accountStatus(null), 'active'));
  it('returns active for undefined suspendedAt', () => assert.equal(accountStatus(undefined), 'active'));
  it('returns suspended for a timestamp', () => assert.equal(accountStatus('2026-07-01T00:00:00Z'), 'suspended'));
});

describe('accountStatusLabel', () => {
  it('labels null as Active', () => assert.equal(accountStatusLabel(null), 'Active'));
  it('labels a timestamp as Suspended', () => assert.equal(accountStatusLabel('2026-07-01T00:00:00Z'), 'Suspended'));
});

describe('isSuspended', () => {
  it('returns false for null', () => assert.equal(isSuspended(null), false));
  it('returns false for undefined', () => assert.equal(isSuspended(undefined), false));
  it('returns true for a timestamp', () => assert.equal(isSuspended('2026-07-01T00:00:00Z'), true));
});

describe('suspendConfirmMessage', () => {
  it('uses display name when available', () => {
    assert.ok(suspendConfirmMessage('Alice').includes('Alice'));
  });
  it('falls back gracefully for null name', () => {
    assert.ok(suspendConfirmMessage(null).includes('this user'));
  });
  it('mentions losing access', () => {
    assert.ok(suspendConfirmMessage('Alice').toLowerCase().includes('access'));
  });
});

describe('reinstateConfirmMessage', () => {
  it('uses display name when available', () => {
    assert.ok(reinstateConfirmMessage('Alice').includes('Alice'));
  });
  it('falls back gracefully for null name', () => {
    assert.ok(reinstateConfirmMessage(null).includes('this user'));
  });
  it('mentions regaining access', () => {
    assert.ok(reinstateConfirmMessage('Alice').toLowerCase().includes('access'));
  });
});
