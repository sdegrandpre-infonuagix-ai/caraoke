// ⚠️ THROWAWAY — Phase 0 go/no-go report (Story 1.4). Pure: SessionLog → GoNoGoReport.

import {
  NFR2_DRIFT_MAX_MS,
  NFR3_VOICE_LATENCY_MAX_MS,
  type GoNoGoReport,
  type SessionLog,
} from './types.ts';
import { summarize } from './stats.ts';
import { pairedDriftSeries } from './drift.ts';
import { oneWayLatencyMs } from './voiceLatency.ts';

/**
 * Build the go/no-go report. Drift is judged on inter-device drift (operator vs partner
 * paired by timestamp); when only one phone's samples are present we fall back to that
 * phone's |errorMs| series. p95 (not max) is the headline so a single GPS/cellular blip
 * doesn't sink an otherwise-solid run.
 */
export function buildGoNoGoReport(log: SessionLog): GoNoGoReport {
  const operatorSamples = log.driftSamples.filter((s) => s.role === 'operator');
  const partnerSamples = log.driftSamples.filter((s) => s.role === 'partner');

  const driftMagnitudes =
    operatorSamples.length > 0 && partnerSamples.length > 0
      ? pairedDriftSeries(operatorSamples, partnerSamples)
      : log.driftSamples.map((s) => Math.abs(s.errorMs));

  const drift = summarize(driftMagnitudes);

  const oneWay = oneWayLatencyMs(log.latencySamples);
  const voiceLatencyOneWay = summarize(
    log.latencySamples.map((s) => s.rttMs / 2),
  );

  const haveDrift = driftMagnitudes.length > 0;
  const haveLatency = log.latencySamples.length > 0;

  const driftWithinNfr2 = haveDrift && drift.p95Ms <= NFR2_DRIFT_MAX_MS;
  const latencyWithinNfr3 = haveLatency && oneWay <= NFR3_VOICE_LATENCY_MAX_MS;

  let recommendation: GoNoGoReport['recommendation'];
  let rationale: string;

  if (!haveDrift || !haveLatency) {
    recommendation = 'inconclusive';
    rationale =
      'Insufficient samples — need both drift and voice-latency data from a full song.';
  } else if (driftWithinNfr2 && latencyWithinNfr3) {
    recommendation = 'go';
    rationale = `Drift p95 ${drift.p95Ms.toFixed(0)}ms ≤ ${NFR2_DRIFT_MAX_MS}ms (NFR2) and one-way voice ${oneWay.toFixed(0)}ms ≤ ${NFR3_VOICE_LATENCY_MAX_MS}ms (NFR3). The duet is technically feasible.`;
  } else {
    recommendation = 'no-go';
    const fails: string[] = [];
    if (!driftWithinNfr2)
      fails.push(`drift p95 ${drift.p95Ms.toFixed(0)}ms > ${NFR2_DRIFT_MAX_MS}ms (NFR2)`);
    if (!latencyWithinNfr3)
      fails.push(
        `one-way voice ${oneWay.toFixed(0)}ms > ${NFR3_VOICE_LATENCY_MAX_MS}ms (NFR3)`,
      );
    rationale = `Exceeds threshold: ${fails.join('; ')}.`;
  }

  return {
    sessionId: log.sessionId,
    drift,
    voiceLatencyOneWay,
    driftWithinNfr2,
    latencyWithinNfr3,
    feltTogether: log.feltTogether,
    recommendation,
    rationale,
  };
}

/** Render a human-readable Markdown report. */
export function renderReportMarkdown(report: GoNoGoReport, generatedAt: string): string {
  const felt = report.feltTogether
    ? `${report.feltTogether.felt ? '✅ Yes' : '❌ No'}${report.feltTogether.transcript ? ` — “${report.feltTogether.transcript}”` : ''}`
    : '_not captured_';

  const verdict =
    report.recommendation === 'go'
      ? '🟢 GO'
      : report.recommendation === 'no-go'
        ? '🔴 NO-GO'
        : '🟡 INCONCLUSIVE';

  return `# Phase 0 Go/No-Go Report

- **Session:** ${report.sessionId}
- **Generated:** ${generatedAt}
- **Recommendation:** ${verdict}

${report.rationale}

## Backing-track drift (NFR2 ≤ ${NFR2_DRIFT_MAX_MS}ms)

| metric | value | within NFR2 |
| ------ | ----- | ----------- |
| samples | ${report.drift.count} | — |
| mean | ${report.drift.meanMs.toFixed(0)}ms | — |
| p95 | ${report.drift.p95Ms.toFixed(0)}ms | ${report.driftWithinNfr2 ? '✅' : '❌'} |
| max | ${report.drift.maxMs.toFixed(0)}ms | — |

## One-way voice latency (NFR3 ≤ ${NFR3_VOICE_LATENCY_MAX_MS}ms)

| metric | value | within NFR3 |
| ------ | ----- | ----------- |
| samples | ${report.voiceLatencyOneWay.count} | — |
| mean | ${report.voiceLatencyOneWay.meanMs.toFixed(0)}ms | — |
| p95 | ${report.voiceLatencyOneWay.p95Ms.toFixed(0)}ms | ${report.latencyWithinNfr3 ? '✅' : '❌'} |
| max | ${report.voiceLatencyOneWay.maxMs.toFixed(0)}ms | — |

## "Did that feel like singing together?"

${felt}
`;
}
