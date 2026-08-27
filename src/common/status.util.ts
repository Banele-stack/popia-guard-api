/**
 * Compliance-status derivation, mirroring the frontend's src/lib/status.ts
 * exactly so the API's numbers agree with the UI's own client-side badge
 * logic. Anchored to the real clock, evaluated fresh on every call rather
 * than cached at module-load time — this is a long-running process, so a
 * load-time constant would freeze "today" at whenever the server last booted.
 */
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Today's date as an ISO day string (UTC), computed fresh on every call. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function today(): Date {
  return new Date(`${todayIso()}T00:00:00Z`);
}

export function daysUntil(isoDate: string): number {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return Math.round((d.getTime() - today().getTime()) / MS_PER_DAY);
}

export type ComplianceStatus = 'Compliant' | 'Review Due Soon' | 'Overdue';

export const REVIEW_DUE_SOON_DAYS = 30;

export function getStatusForDays(daysRemaining: number): ComplianceStatus {
  if (daysRemaining < 0) return 'Overdue';
  if (daysRemaining <= REVIEW_DUE_SOON_DAYS) return 'Review Due Soon';
  return 'Compliant';
}

export function getReviewStatus(reviewDate: string): ComplianceStatus {
  return getStatusForDays(daysUntil(reviewDate));
}
