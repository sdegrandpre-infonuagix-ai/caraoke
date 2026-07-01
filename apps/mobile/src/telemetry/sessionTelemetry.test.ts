import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSessionStartedEvent,
  buildDriftDetectedEvent,
  buildVoiceLatencyEvent,
  buildSessionEndedEvent,
  buildSessionFailedEvent,
  hasNoPersonalData,
} from './sessionTelemetry.js';

const TS = '2026-07-01T12:00:00.000Z';
const SID = 'sess_abc123';

describe('buildSessionStartedEvent', () => {
  it('returns correct shape', () => {
    const ev = buildSessionStartedEvent(SID, 42, TS);
    assert.equal(ev.eventType, 'session_started');
    assert.equal(ev.sessionId, SID);
    assert.equal(ev.simultaneousStartOffsetMs, 42);
    assert.equal(ev.timestamp, TS);
  });
});

describe('buildDriftDetectedEvent', () => {
  it('captures drift and correction flag', () => {
    const ev = buildDriftDetectedEvent(SID, 150, true, TS);
    assert.equal(ev.eventType, 'drift_detected');
    assert.equal(ev.driftMs, 150);
    assert.equal(ev.correctionApplied, true);
  });
});

describe('buildVoiceLatencyEvent', () => {
  it('records one-way latency', () => {
    const ev = buildVoiceLatencyEvent(SID, 80, TS);
    assert.equal(ev.eventType, 'voice_latency');
    assert.equal(ev.estimatedOneWayMs, 80);
  });
});

describe('buildSessionEndedEvent', () => {
  it('records duration and drift count', () => {
    const ev = buildSessionEndedEvent(SID, 180000, 3, TS);
    assert.equal(ev.eventType, 'session_ended');
    assert.equal(ev.durationMs, 180000);
    assert.equal(ev.driftCorrectionCount, 3);
  });
});

describe('buildSessionFailedEvent', () => {
  it('records reason', () => {
    const ev = buildSessionFailedEvent(SID, 'network_timeout', TS);
    assert.equal(ev.eventType, 'session_failed');
    assert.equal(ev.reason, 'network_timeout');
  });
});

describe('hasNoPersonalData (NFR6/8/9)', () => {
  it('passes for clean session events', () => {
    const ev = buildSessionStartedEvent(SID, 0, TS);
    assert.equal(hasNoPersonalData(ev), true);
  });

  it('passes for drift events', () => {
    const ev = buildDriftDetectedEvent(SID, 10, false, TS);
    assert.equal(hasNoPersonalData(ev), true);
  });

  it('fails if a prohibited key is present', () => {
    const ev = {
      ...buildSessionStartedEvent(SID, 0, TS),
      email: 'test@example.com',
    };
    assert.equal(hasNoPersonalData(ev as Parameters<typeof hasNoPersonalData>[0]), false);
  });
});
