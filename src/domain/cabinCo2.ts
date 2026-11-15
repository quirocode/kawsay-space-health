import type { Reading } from './types';

export const CABIN_CO2_LIMIT = 3;
const MINUTE = 60_000;
const WINDOW = 60 * MINUTE;
// Prototype sampling policy. NASA specifies the exposure window, not this sampling interval.
const MAX_GAP = 15 * MINUTE;

export function cabinCo2(readings: Reading[], end: number) {
  const start = end - WINDOW;
  const samples = [...new Map(readings
    .filter((r) => r.indicatorId === 'cabin_co2' && r.ts <= end && Number.isFinite(r.value) && r.value >= 0)
    .map((r) => [r.ts, r])).values()].sort((a, b) => a.ts - b.ts);
  const latest = samples.at(-1);
  const first = samples.findLastIndex((r) => r.ts <= start);
  const window = first < 0 ? samples.filter((r) => r.ts >= start) : samples.slice(first);
  const origins = [...new Set(window.map((r) => r.origin))];
  let weighted = 0;
  let covered = 0;
  for (const [index, sample] of window.entries()) {
    const next = window[index + 1]?.ts ?? end;
    // Hold the most recent valid measurement only as far as the sampling policy allows.
    const duration = Math.max(0, Math.min(next, sample.ts + MAX_GAP) - Math.max(start, sample.ts));
    covered += duration;
    weighted += duration * sample.value;
  }
  const value = covered === WINDOW ? Math.round(weighted / WINDOW * 1e9) / 1e9 : null;
  return { value, latest, start, end, origins, count: window.length, coveredMinutes: covered / MINUTE };
}
