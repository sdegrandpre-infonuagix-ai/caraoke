// ⚠️ THROWAWAY — Phase 0 results recorder (Story 1.4). Node-only (fs). Each session is one
// JSON file under results/; the report CLI reads them back.

import { writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SessionLog } from './types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(HERE, '..', 'results');

export function sessionLogPath(sessionId: string): string {
  return join(RESULTS_DIR, `session-${sessionId}.json`);
}

export function saveSessionLog(log: SessionLog): string {
  const path = sessionLogPath(log.sessionId);
  writeFileSync(path, JSON.stringify(log, null, 2), 'utf8');
  return path;
}

export function loadSessionLog(path: string): SessionLog {
  return JSON.parse(readFileSync(path, 'utf8')) as SessionLog;
}

/** List session-log files under results/ (most recent last by name). */
export function listSessionLogs(): string[] {
  return readdirSync(RESULTS_DIR)
    .filter((f) => f.startsWith('session-') && f.endsWith('.json'))
    .sort()
    .map((f) => join(RESULTS_DIR, f));
}

export function saveReportMarkdown(sessionId: string, markdown: string): string {
  const path = join(RESULTS_DIR, `report-${sessionId}.md`);
  writeFileSync(path, markdown, 'utf8');
  return path;
}
