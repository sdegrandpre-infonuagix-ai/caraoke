/**
 * Session-health telemetry event builders (Story 8.1, FR43/AR7).
 * No PII, voice data, or precise location included — NFR6/8/9.
 */

export type SessionHealthEventType =
  | 'session_started'
  | 'drift_detected'
  | 'voice_latency'
  | 'session_ended'
  | 'session_failed';

export interface BaseSessionHealthEvent {
  eventType: SessionHealthEventType;
  sessionId: string;
  /** ISO timestamp from the device clock. */
  timestamp: string;
}

export interface SessionStartedEvent extends BaseSessionHealthEvent {
  eventType: 'session_started';
  /** Signed offset between device and partner simultaneous-start in ms. */
  simultaneousStartOffsetMs: number;
}

export interface DriftDetectedEvent extends BaseSessionHealthEvent {
  eventType: 'drift_detected';
  driftMs: number;
  correctionApplied: boolean;
}

export interface VoiceLatencyEvent extends BaseSessionHealthEvent {
  eventType: 'voice_latency';
  /** Estimated one-way latency in ms (RTT / 2). */
  estimatedOneWayMs: number;
}

export interface SessionEndedEvent extends BaseSessionHealthEvent {
  eventType: 'session_ended';
  durationMs: number;
  /** Number of drift corrections made during the session. */
  driftCorrectionCount: number;
}

export interface SessionFailedEvent extends BaseSessionHealthEvent {
  eventType: 'session_failed';
  reason: string;
}

export type SessionHealthEvent =
  | SessionStartedEvent
  | DriftDetectedEvent
  | VoiceLatencyEvent
  | SessionEndedEvent
  | SessionFailedEvent;

export function buildSessionStartedEvent(
  sessionId: string,
  simultaneousStartOffsetMs: number,
  timestamp: string,
): SessionStartedEvent {
  return { eventType: 'session_started', sessionId, timestamp, simultaneousStartOffsetMs };
}

export function buildDriftDetectedEvent(
  sessionId: string,
  driftMs: number,
  correctionApplied: boolean,
  timestamp: string,
): DriftDetectedEvent {
  return { eventType: 'drift_detected', sessionId, timestamp, driftMs, correctionApplied };
}

export function buildVoiceLatencyEvent(
  sessionId: string,
  estimatedOneWayMs: number,
  timestamp: string,
): VoiceLatencyEvent {
  return { eventType: 'voice_latency', sessionId, timestamp, estimatedOneWayMs };
}

export function buildSessionEndedEvent(
  sessionId: string,
  durationMs: number,
  driftCorrectionCount: number,
  timestamp: string,
): SessionEndedEvent {
  return { eventType: 'session_ended', sessionId, timestamp, durationMs, driftCorrectionCount };
}

export function buildSessionFailedEvent(
  sessionId: string,
  reason: string,
  timestamp: string,
): SessionFailedEvent {
  return { eventType: 'session_failed', sessionId, timestamp, reason };
}

/**
 * Guard — confirm the event carries no personal data (NFR6/8/9).
 * Checks that none of the prohibited keys appear in the serialized event.
 */
export function hasNoPersonalData(event: SessionHealthEvent): boolean {
  const json = JSON.stringify(event).toLowerCase();
  const prohibited = ['email', 'name', 'phone', 'location', 'lat', 'lng', 'voice', 'audio'];
  return !prohibited.some((k) => json.includes(k));
}
