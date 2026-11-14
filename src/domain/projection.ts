/**
 * Future Self projection (P3-04): where each body system will be on arrival day, with the
 * crew member's current habits and with their plan. Deterministic and illustrative: it uses
 * the rates NASA publishes and labels everything else as a prototype value.
 */
import type {
  BodyZone, CountermeasurePlan, LandingReadiness, LandingTask, MissionContext, Projection, Reading, Source, Status,
} from './types';
import { SRC } from './indicators';

const P = SRC.prototype;

// ── Helpers ───────────────────────────────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const r1 = (v: number) => Math.round(v * 10) / 10;

/** Latest value per mission day for one indicator. */
function dailyValues(readings: Reading[], id: string): Map<number, number> {
  const out = new Map<number, { ts: number; v: number }>();
  for (const r of readings) {
    if (r.indicatorId !== id) continue;
    const cur = out.get(r.missionDay);
    if (!cur || r.ts > cur.ts) out.set(r.missionDay, { ts: r.ts, v: r.value });
  }
  return new Map([...out].map(([d, x]) => [d, x.v]));
}

function avgDays(m: Map<number, number>, from: number, to: number): number | undefined {
  const vals: number[] = [];
  for (let d = from; d <= to; d++) if (m.has(d)) vals.push(m.get(d)!);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined;
}

const SEVERITY: Record<Status, number> = { green: 0, yellow: 1, red: 2, stale: 3 };
const worst = (s: Status[]) => s.reduce((a, b) => (SEVERITY[b] > SEVERITY[a] ? b : a), 'green' as Status);

// ── Model parameters. Official anchors: bone 1.0–1.5 %/month, fitness −10 to −12 % (some >20 %),
// exercise 90 min/day (SRC). Interpolations, cut-offs and effect sizes are prototype values.
export const PARAMS = {
  target: 90, missing: 0.5,
  bone: { zero: 1.5, full: 1.0, green: 95, red: 92 },
  muscle: { zero: 22, full: 10, green: 88, red: 82 },
  heart: { zero: 18, full: 8, bonus: 6, penalty: 4, good: 2500, low: 2000, green: 90, red: 82 },
  eyes: { per: 4, max: 12, green: 96, red: 90 },
  brain: { target: 7, per: 8, green: 92, red: 84 },
  score: { atRed: 30, atGreen: 80 },
};

export function project(history: Reading[], ctx: MissionContext, plan?: CountermeasurePlan): LandingReadiness {
  const today = ctx.missionDay;
  const g = ctx.environment === 'moon' || ctx.environment === 'mars_surface' ? 0.5 : 1;
  const ex = dailyValues(history, 'exercise_min');
  const water = dailyValues(history, 'water_ml');
  const sleep = dailyValues(history, 'sleep_hours');
  const adh = (d: number) => (ex.has(d) ? clamp(ex.get(d)! / PARAMS.target, 0, 1) : PARAMS.missing);

  const aNow = (() => { let s = 0; for (let d = today - 6; d <= today; d++) s += adh(d); return s / 7; })();
  const aPlan = plan?.exerciseMinPerDay !== undefined
    ? clamp(plan.exerciseMinPerDay / PARAMS.target, 0, 1) * ((plan.exerciseDaysPerWeek ?? 7) / 7)
    : aNow;
  const waterNow = avgDays(water, today - 2, today) ?? 2000;
  const waterPlan = plan?.waterMlPerDay ?? waterNow;
  const sleepNow = avgDays(sleep, today - 6, today) ?? 7;
  const sleepPlan = plan?.sleepHours ?? sleepNow;

  const exStale = ![today, today - 1, today - 2].some((d) => ex.has(d));
  const sleepStale = ![today, today - 1, today - 2].some((d) => sleep.has(d));

  const curve = (lossPerDay: (a: number) => number) => {
    const series = [] as { day: number; value: number; valueIfPlan: number }[];
    let v = 100;
    let vp = 100;
    for (let d = 0; d <= ctx.arrivalDay; d++) {
      if (d > 0) {
        if (d <= today) { v -= lossPerDay(adh(d)); vp = v; }
        else { v -= lossPerDay(aNow); vp -= lossPerDay(aPlan); }
      }
      series.push({ day: d, value: r1(v), valueIfPlan: r1(vp) });
    }
    return series;
  };

  const statusOf = (v: number, c: { green: number; red: number }): Status => (v >= c.green ? 'green' : v < c.red ? 'red' : 'yellow');
  const mk = (zone: BodyZone, metric: string, series: Projection['series'], c: { green: number; red: number }, stale: boolean, model: string, sources: Source[], arrivalAdj = 0, arrivalAdjPlan = 0): Projection => {
    const at = r1(series[series.length - 1].value + arrivalAdj);
    const atP = r1(series[series.length - 1].valueIfPlan + arrivalAdjPlan);
    return { zone, metric, today: series[Math.min(today, series.length - 1)].value, atArrival: at, atArrivalIfPlanFollowed: atP,
      status: stale ? 'stale' : statusOf(at, c), series, model, sources: [...sources, P] };
  };

  const fluid = (w: number) => (w >= PARAMS.heart.good ? PARAMS.heart.bonus : w < PARAMS.heart.low ? -PARAMS.heart.penalty : 0);
  const visionDays = (() => { const m = dailyValues(history, 'symptom_vision'); let n = 0; for (let d = today - 13; d <= today; d++) if (m.get(d) === 1) n++; return n; })();
  const eyesV = 100 - Math.min(PARAMS.eyes.max, PARAMS.eyes.per * visionDays);
  const flat = (v: number, vp: number) => Array.from({ length: ctx.arrivalDay + 1 }, (_, d) => ({ day: d, value: d <= today ? 100 : r1(v), valueIfPlan: d <= today ? 100 : r1(vp) }));
  const brainV = (s: number) => 100 - PARAMS.brain.per * Math.max(0, PARAMS.brain.target - s);

  const projections: Projection[] = [
    mk('bones', 'bone_density_pct', curve((a) => (g * lerp(PARAMS.bone.zero, PARAMS.bone.full, a)) / 30), PARAMS.bone, exStale,
      'Bone loses 1.0–1.5 % per month in microgravity (NASA). We interpolate by your exercise vs the 90 min/day target (prototype).', [SRC.bone]),
    mk('muscles', 'leg_strength_pct', curve((a) => (g * lerp(PARAMS.muscle.zero, PARAMS.muscle.full, a)) / 180), PARAMS.muscle, exStale,
      'Fitness drops 10–12 % on a 6-month mission on average; some crew lose more than 20 % (NASA). Scaled by your exercise (prototype).', [SRC.fitness]),
    mk('heart', 'orthostatic_tolerance_pct', curve((a) => (g * lerp(PARAMS.heart.zero, PARAMS.heart.full, a)) / 180), PARAMS.heart, exStale,
      'Low blood pressure can cause fainting at landing; fluids and compression garments help (NASA). Effect sizes are prototype values.', [SRC.cardio],
      fluid(waterNow), fluid(waterPlan)),
    { ...mk('eyes', 'vision_pct', flat(eyesV, eyesV), PARAMS.eyes, false,
      'About 70 % of ISS astronauts show some eye swelling (SANS, NASA). Each day with blurred vision lowers this (prototype).', [SRC.sans]), today: eyesV },
    { ...mk('brain', 'alertness_pct', flat(brainV(sleepNow), brainV(sleepPlan)), PARAMS.brain, sleepStale,
      'Short sleep slows decisions (NASA sleep risk). −8 points per hour under 7 h (prototype).', [SRC.sleep]), today: r1(brainV(sleepNow)) },
  ];

  const pBy = new Map(projections.map((p) => [p.zone, p]));
  const statusAt = (p: Projection, plan: boolean): Status => p.status === 'stale' ? 'stale'
    : statusOf(plan ? p.atArrivalIfPlanFollowed : p.atArrival, ZONE_CUT[p.zone as keyof typeof ZONE_CUT]);
  const taskDef: [LandingTask['id'], string, BodyZone[], string, Source[]][] = [
    ['stand', 'Stand up without fainting', ['heart'], 'Blood pressure can drop when gravity returns; fluids and compression help.', [SRC.cardio, P]],
    ['see', 'Read the displays', ['eyes'], 'Fluid shifts can press on the eyes (SANS).', [SRC.sans, P]],
    ['move', 'Climb out and walk', ['bones', 'muscles'], 'Weaker bones and legs raise the risk of falls during the gravity transition.', [SRC.bone, SRC.fitness, SRC.gravity, P]],
    ['think', 'Run the landing checklist', ['brain'], 'Short sleep slows decisions on the most demanding day.', [SRC.sleep, P]],
  ];
  const tasks: LandingTask[] = taskDef.map(([id, label, zones, why, sources]) => ({
    id, label, zones, why, sources,
    status: worst(zones.map((z) => statusAt(pBy.get(z)!, false))),
    statusIfPlan: worst(zones.map((z) => statusAt(pBy.get(z)!, true))),
  }));

  const pScore = (p: Projection, plan: boolean) => {
    if (p.status === 'stale') return 50;
    const c = ZONE_CUT[p.zone as keyof typeof ZONE_CUT];
    const v = plan ? p.atArrivalIfPlanFollowed : p.atArrival;
    return readinessPoints(v, c);
  };
  const score = (plan: boolean) => Math.round(taskDef.reduce((s, [, , zones]) => s + Math.min(...zones.map((z) => pScore(pBy.get(z)!, plan))), 0) / taskDef.length);

  return { score: score(false), scoreIfPlanFollowed: score(true), tasks, projections };
}

/** Piecewise: 0 at (red − span) → 30 at red → 80 at green → 100 at 100 % of pre-flight. */
function readinessPoints(v: number, c: { green: number; red: number }): number {
  const { atRed, atGreen } = PARAMS.score;
  const span = c.green - c.red;
  if (v < c.red) return clamp((atRed * (v - (c.red - span))) / span, 0, atRed);
  if (v < c.green) return atRed + ((atGreen - atRed) * (v - c.red)) / span;
  return clamp(atGreen + ((100 - atGreen) * (v - c.green)) / Math.max(1e-6, 100 - c.green), atGreen, 100);
}

const ZONE_CUT = { bones: PARAMS.bone, muscles: PARAMS.muscle, heart: PARAMS.heart, eyes: PARAMS.eyes, brain: PARAMS.brain };
