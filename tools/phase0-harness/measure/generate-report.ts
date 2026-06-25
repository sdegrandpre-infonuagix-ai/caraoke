// ⚠️ THROWAWAY — Phase 0 report CLI (Story 1.4).
//   node --import tsx measure/generate-report.ts [results/session-XXX.json]
// With no arg, uses the most recent session log under results/.

import { buildGoNoGoReport, renderReportMarkdown } from './report.ts';
import {
  listSessionLogs,
  loadSessionLog,
  saveReportMarkdown,
} from './recorder.ts';

function main(): void {
  const arg = process.argv[2];
  const path = arg ?? listSessionLogs().at(-1);
  if (!path) {
    console.error('No session logs found under results/. Run a harness session first.');
    process.exit(1);
  }

  const log = loadSessionLog(path);
  const report = buildGoNoGoReport(log);
  const markdown = renderReportMarkdown(report, new Date().toISOString());
  const out = saveReportMarkdown(log.sessionId, markdown);

  console.log(markdown);
  console.log(`\nReport written to ${out}`);
  console.log(`Recommendation: ${report.recommendation.toUpperCase()}`);
}

main();
