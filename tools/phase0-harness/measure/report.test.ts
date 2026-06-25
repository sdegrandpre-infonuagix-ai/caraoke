// Runnable with: node --import tsx --test measure/report.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize, percentile } from './stats.ts';
import { driftSample, pairedDriftSeries, interDeviceDriftMs } from './drift.ts';
import { oneWayLatencyMs } from './voiceLatency.ts';
import { buildGoNoGoReport } from './report.ts';
import type { DriftSample, LatencySample, SessionLog } from './types.ts';

test('summarize computes count/mean/p95/max', () => {
  const s = summarize([10, 20, 30, 40]);
  assert.equal(s.count, 4);
  assert.equal(s.meanMs, 25);
  assert.equal(s.maxMs, 40);
  assert.equal(percentile([10, 20, 30, 40], 0.5), 25);
});

test('driftSample derives expected position and signed error', () => {
  // started at 1000; sampled at 6000 → expected 5000; actual 5030 → +30ms ahead.
  const s = driftSample('operator', 1000, 6000, 5030);
  assert.equal(s.expectedMs, 5000);
  assert.equal(s.errorMs, 30);
});

test('interDeviceDriftMs is the absolute difference of errors', () => {
  const a = driftSample('operator', 0, 1000, 1020); // +20
  const b = driftSample('partner', 0, 1000, 990); // -10
  assert.equal(interDeviceDriftMs(a, b), 30);
});

test('pairedDriftSeries matches nearest timestamps within tolerance', () => {
  const op: DriftSample[] = [driftSample('operator', 0, 2000, 2040)]; // +40
  const pt: DriftSample[] = [driftSample('partner', 0, 2100, 2090)]; // -10, 100ms apart
  assert.deepEqual(pairedDriftSeries(op, pt, 1000), [50]);
  // Outside tolerance → no pair.
  assert.deepEqual(pairedDriftSeries(op, pt, 50), []);
});

test('oneWayLatencyMs is median(rtt)/2', () => {
  const samples: LatencySample[] = [{ rttMs: 100 }, { rttMs: 200 }, { rttMs: 120 }];
  // median rtt = 120 → one-way 60.
  assert.equal(oneWayLatencyMs(samples), 60);
});

function baseLog(over: Partial<SessionLog>): SessionLog {
  return {
    sessionId: 's1',
    trackUri: 'spotify:track:x',
    startAt: 0,
    driftSamples: [],
    latencySamples: [],
    ...over,
  };
}

test('buildGoNoGoReport → GO when both NFRs pass', () => {
  const log = baseLog({
    driftSamples: [
      driftSample('operator', 0, 1000, 1010),
      driftSample('partner', 0, 1000, 995),
    ], // inter-device drift 15ms
    latencySamples: [{ rttMs: 120 }], // one-way 60ms
    feltTogether: { felt: true },
  });
  const r = buildGoNoGoReport(log);
  assert.equal(r.driftWithinNfr2, true);
  assert.equal(r.latencyWithinNfr3, true);
  assert.equal(r.recommendation, 'go');
});

test('buildGoNoGoReport → NO-GO when latency exceeds NFR3', () => {
  const log = baseLog({
    driftSamples: [
      driftSample('operator', 0, 1000, 1005),
      driftSample('partner', 0, 1000, 1000),
    ],
    latencySamples: [{ rttMs: 400 }], // one-way 200ms > 150
  });
  const r = buildGoNoGoReport(log);
  assert.equal(r.recommendation, 'no-go');
  assert.match(r.rationale, /NFR3/);
});

test('buildGoNoGoReport → INCONCLUSIVE without both data sets', () => {
  const r = buildGoNoGoReport(baseLog({ latencySamples: [{ rttMs: 100 }] }));
  assert.equal(r.recommendation, 'inconclusive');
});
