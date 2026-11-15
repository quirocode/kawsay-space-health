/**
 * Evaluation by threshold and personal baseline (P3-02).
 * Pure: no clock, no randomness. This module has no figures of its own; it only applies
 * the thresholds it receives, so every status it returns carries that threshold's source.
 */
import { cabinCo2 } from './cabinCo2';
import type { Baseline, Evaluation, IndicatorDef, MissionContext, Reading, Source, Status, Threshold } from './types';

const HOUR_MS = 3_600_000;

/** At most one decimal, no trailing ".0". */
export function fmt(v: number): string {
  return String(Math.round(v * 10) / 10);
}

function matches(th: Threshold, value: number, baseline?: Baseline): boolean {
  const absolute = th.min !== undefined || th.max !== undefined;
  if (absolute) return (th.min === undefined || (th.minExclusive ? value > th.min : value >= th.min)) && (th.max === undefined || value < th.max);
  if (th.sdFromBaseline === undefined || !baseline || baseline.sd <= 0) return false;
  return Math.abs(value - baseline.mean) / baseline.sd >= th.sdFromBaseline;
}

/** Status of a single value against an indicator's thresholds and optional personal baseline. */
export function statusOf(
  def: IndicatorDef,
  value: number,
  baseline?: Baseline,
): { status: Exclude<Status, 'stale'>; label: string | null; source: Source | null; fromBaseline: boolean } {
  for (const level of ['red', 'yellow'] as const) {
    const hit = def.thresholds.find((th) => th.status === level && matches(th, value, baseline));
    if (hit) {
      const fromBaseline = hit.min === undefined && hit.max === undefined;
      return { status: level, label: hit.label, source: hit.source, fromBaseline };
    }
  }
  return { status: 'green', label: null, source: null, fromBaseline: false };
}

/** Mean and sample SD per indicator over the last `windowDays` mission days (only indicators with ≥ 5 readings). */
export function computeBaselines(readings: Reading[], windowDays: number, untilMissionDay: number): Baseline[] {
  const from = untilMissionDay - windowDays + 1;
  const byIndicator = new Map<string, number[]>();
  for (const r of readings) {
    if (r.missionDay < from || r.missionDay > untilMissionDay) continue;
    const list = byIndicator.get(r.indicatorId);
    if (list) list.push(r.value);
    else byIndicator.set(r.indicatorId, [r.value]);
  }
  const out: Baseline[] = [];
  for (const [indicatorId, values] of byIndicator) {
    if (values.length < 5) continue;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1);
    out.push({ indicatorId, mean, sd: Math.sqrt(variance), windowDays });
  }
  return out.sort((a, b) => a.indicatorId.localeCompare(b.indicatorId));
}

function latestByIndicator(readings: Reading[]): Map<string, Reading> {
  const out = new Map<string, Reading>();
  for (const r of readings) {
    const cur = out.get(r.indicatorId);
    if (!cur || r.ts > cur.ts) out.set(r.indicatorId, r);
  }
  return out;
}

function dedupe(sources: Source[]): Source[] {
  const seen = new Set<string>();
  return sources.filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true)));
}

/** Latest reading per indicator → Evaluation. One Evaluation per indicator in `defs`, in the same order. */
export function evaluate(
  defs: IndicatorDef[],
  readings: Reading[],
  baselines: Baseline[],
  _ctx: MissionContext,
  nowTs: number,
): Evaluation[] {
  const latest = latestByIndicator(readings);
  const baselineOf = new Map(baselines.map((b) => [b.indicatorId, b]));
  return defs.map((def) => {
    const co2 = def.id === 'cabin_co2' ? cabinCo2(readings, nowTs) : null;
    const r = co2 ? co2.latest : latest.get(def.id);
    if (!r) return { indicatorId: def.id, status: 'stale', reason: 'No reading yet.', sources: dedupe(def.sources) };
    const ageH = (nowTs - r.ts) / HOUR_MS;
    if (ageH > def.staleAfterHours) {
      const age = ageH >= 48 ? `${Math.floor(ageH / 24)} days` : `${Math.floor(ageH)} h`;
      return { indicatorId: def.id, status: 'stale', reason: `Last reading is ${age} old.`, sources: dedupe(def.sources) };
    }
    if (co2 && co2.value === null) {
      return { indicatorId: def.id, status: 'stale', reason: 'Insufficient data for the 1-hour cabin CO₂ average.', sources: dedupe(def.sources) };
    }
    const value = co2?.value ?? r.value;
    const baseline = baselineOf.get(def.id);
    const hit = statusOf(def, value, baseline);
    if (hit.status === 'green') {
      return { indicatorId: def.id, status: 'green', reason: `${def.name} is in the expected range.`, sources: dedupe(def.sources) };
    }
    const reason = hit.fromBaseline
      ? `${def.name} is unusual for you (more than 2 SD from your last ${baseline?.windowDays ?? 0} days).`
      : `${def.name} ${def.input === 'boolean' ? 'reported' : `${fmt(value)} ${def.unit}`}: ${hit.label}.`;
    return { indicatorId: def.id, status: hit.status, reason, sources: dedupe([hit.source!, ...def.sources]) };
  });
}
