import type { BodyZone, Evaluation, IndicatorDef, LandingReadiness, Projection, Reading, Status } from '../../domain/types';
import { BODY_ZONES } from '../../domain/types';
import type { ZoneFill } from './BodyFigure';

const SEVERITY: Record<Status, number> = { green: 0, yellow: 1, red: 2, stale: 3 };
const worse = (a: Status, b: Status) => (SEVERITY[b] > SEVERITY[a] ? b : a);

/**
 * Today's body: worst fresh evaluation per zone. A zone whose readings are all old is 'stale'
 * (never green). A zone with no indicators at all is 'none'.
 */
export function todayZones(evals: Evaluation[], defs: IndicatorDef[]): Record<BodyZone, ZoneFill> {
  const zoneOf = new Map(defs.map((d) => [d.id, d.zone]));
  const fresh = new Map<BodyZone, Status>();
  const seen = new Set<BodyZone>();
  for (const e of evals) {
    const z = zoneOf.get(e.indicatorId);
    if (!z) continue;
    seen.add(z);
    if (e.status !== 'stale') fresh.set(z, worse(fresh.get(z) ?? 'green', e.status));
  }
  const out = {} as Record<BodyZone, ZoneFill>;
  for (const z of BODY_ZONES) out[z] = fresh.get(z) ?? (seen.has(z) ? 'stale' : 'none');
  return out;
}

/** Arrival body: projected status per zone, with current habits or with the plan. Unprojected zones are 'none'. */
export function arrivalZones(r: LandingReadiness, withPlan: boolean): Record<BodyZone, ZoneFill> {
  const out = Object.fromEntries(BODY_ZONES.map((z) => [z, 'none'])) as Record<BodyZone, ZoneFill>;
  for (const p of r.projections) out[p.zone] = p.status;
  if (withPlan) {
    for (const t of r.tasks) for (const z of t.zones) {
      const p = r.projections.find((x) => x.zone === z);
      if (!p || p.status === 'stale') continue;
      // Single-zone tasks give the zone's plan status exactly. For multi-zone tasks the plan
      // status is the worst zone's, so a zone already OK with current habits stays OK.
      out[z] = t.zones.length === 1 || SEVERITY[t.statusIfPlan] < SEVERITY[p.status] ? t.statusIfPlan : p.status;
    }
  }
  return out;
}

export interface ZoneDelta {
  zone: BodyZone;
  metric: string;
  from: number;
  to: number;
}

/** The biggest projected drops between today and the viewed day (max `n`, at least 0.5 points). */
export function biggestDrops(projections: Projection[], withPlan: boolean, n = 3): ZoneDelta[] {
  return projections
    .map((p) => ({ zone: p.zone, metric: p.metric, from: p.today, to: withPlan ? p.atArrivalIfPlanFollowed : p.atArrival }))
    .filter((d) => d.from - d.to >= 0.5)
    .sort((a, b) => b.from - b.to - (a.from - a.to))
    .slice(0, n);
}

/** Exercise minutes per mission day (latest reading of the day), for the woven timeline. */
export function exerciseByDay(readings: Reading[]): Map<number, number> {
  const best = new Map<number, Reading>();
  for (const r of readings) {
    if (r.indicatorId !== 'exercise_min') continue;
    const cur = best.get(r.missionDay);
    if (!cur || r.ts > cur.ts) best.set(r.missionDay, r);
  }
  return new Map([...best].map(([d, r]) => [d, r.value]));
}

/** "6 days of incomplete exercise" insight over the last `window` days. */
export function exerciseGap(readings: Reading[], today: number, targetMin = 90, window = 7) {
  const ex = exerciseByDay(readings);
  const days: number[] = [];
  for (let d = today - window; d < today; d++) if (ex.has(d)) days.push(ex.get(d)!);
  // "Short" = clearly under target (below 75 %), so an 85-minute day is not nagged about.
  const short = days.filter((m) => m < targetMin * 0.75).length;
  const avg = days.length ? days.reduce((a, b) => a + b, 0) / days.length : targetMin;
  return { shortDays: short, missingMinPerDay: Math.max(0, Math.round(targetMin - avg)) };
}

/** Current habits shown next to the plan steppers (same windows as the projection model). */
export function currentHabits(readings: Reading[], today: number) {
  const daily = (id: string) => {
    const best = new Map<number, Reading>();
    for (const r of readings) if (r.indicatorId === id && (!best.has(r.missionDay) || r.ts > best.get(r.missionDay)!.ts)) best.set(r.missionDay, r);
    return best;
  };
  const avg = (id: string, n: number, fallback: number) => {
    const m = daily(id);
    const v: number[] = [];
    for (let d = today - n + 1; d <= today; d++) if (m.has(d)) v.push(m.get(d)!.value);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : fallback;
  };
  return {
    exerciseMinPerDay: Math.round(avg('exercise_min', 7, 90) / 5) * 5,
    waterMlPerDay: Math.round(avg('water_ml', 3, 2000) / 50) * 50,
    sleepHours: Math.round(avg('sleep_hours', 7, 7) * 10) / 10,
  };
}

/** Fills {placeholders} in content strings. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}
