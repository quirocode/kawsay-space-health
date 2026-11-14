/**
 * Services Orbit (P1) — view model for the hub screen (design: "S8 v2 · Services Orbit").
 * Pure and deterministic: everything shown on the orbit is derived here from the engine's
 * output and the app state. The UI never decides a health status; where a status is shown
 * it is the engine's (evaluation, finding, projection or verification outcome), and missing
 * data is 'stale', never green.
 */
import copy from '../../../content/orbit.json';
import type {
  CountermeasurePlan, Engine, Finding, MissionContext, Projection, Reading, Status, VerificationResult,
} from '../../domain/types';
import { exerciseGap, fill, todayZones } from '../../features/future-self/zones';
import { clock } from '../format';

export type StationId = 'measure' | 'understand' | 'act' | 'verify' | 'escalate' | 'environment';
export const LOOP_STEPS = ['measure', 'understand', 'act', 'verify', 'escalate'] as const;
export type LoopStepId = (typeof LOOP_STEPS)[number];

export interface Station {
  id: StationId;
  step: number;             // 1..6, clockwise from the top
  href: string;
  stage: string;            // loop stage, e.g. "Measure"
  name: string;
  status: Status;
  progress: number;         // 0..1, the medallion ring
  datum: string;
}

export interface Chip {
  kind: 'gain' | 'time' | 'prototype' | 'official';
  label: string;
}

export interface RightNow {
  step: LoopStepId | null;  // null = today's loop is closed
  stepLabel: string;
  status: Status;
  title: string;
  why: string;
  chips: Chip[];
  cta: { label: string; href: string };
  whyHref: string;
}

export interface OrbitModel {
  stations: Station[];
  active: StationId | null; // the station of the current loop step
  core: { score: number; status: Status };
  rightNow: RightNow;
  loop: { steps: { id: LoopStepId; label: string; state: 'done' | 'current' | 'todo' }[]; done: number };
  stats: { streak: number; solsToLanding: number };
}

/** Structural subset of the store's PendingRecheck (kept local so this module stays free of the store). */
export interface PendingLike {
  ruleId: string;
  indicatorId: string;
  dueTs: number;
}

export interface OrbitInput {
  readings: Reading[];
  ctx: MissionContext;
  nowTs: number;
  plan: CountermeasurePlan;
  planAccepted: boolean;
  pending: PendingLike | null;
  verifications: VerificationResult[];
  briefQueuedTs: number | null;
}

const DAY_MS = 86_400_000;
const SEVERITY: Record<Status, number> = { green: 0, yellow: 1, red: 2, stale: 3 };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const r1 = (v: number) => Math.round(v * 10) / 10;

/** Worst status that has data behind it; 'stale' only when nothing is fresh. */
export function worstFresh(statuses: Status[]): Status {
  const fresh = statuses.filter((s) => s !== 'stale');
  if (!fresh.length) return 'stale';
  return fresh.reduce((a, b) => (SEVERITY[b] > SEVERITY[a] ? b : a), 'green' as Status);
}

/** Consecutive mission days with a manual check-in, counted back from today (or yesterday if today is still open). */
export function checkInStreak(readings: Reading[], today: number): number {
  const days = new Set<number>();
  for (const r of readings) if (r.origin === 'manual') days.add(r.missionDay);
  let d = days.has(today) ? today : today - 1;
  let n = 0;
  while (days.has(d)) { n++; d--; }
  return n;
}

/** Projected loss per 30 days between today and arrival, in % of pre-flight (positive = losing). */
function monthlyLoss(p: Projection, ctx: MissionContext): number {
  const days = ctx.arrivalDay - ctx.missionDay;
  return days > 0 ? ((p.today - p.atArrival) / days) * 30 : 0;
}

const metricShort = (m: string) => (copy.metric as Record<string, string>)[m] ?? m;
const metricLong = (m: string) => (copy.metricLong as Record<string, string>)[m] ?? m;

export function buildOrbit(input: OrbitInput, engine: Engine): OrbitModel {
  const { readings, ctx, nowTs, plan, planAccepted, pending, verifications, briefQueuedTs } = input;
  const S = copy.stations;
  const today = ctx.missionDay;
  const defs = engine.indicators();
  const defById = new Map(defs.map((d) => [d.id, d]));
  const evals = engine.evaluate(readings, [], ctx, nowTs);
  const evalById = new Map(evals.map((e) => [e.indicatorId, e]));
  const findings = engine.findCompound(readings, ctx);
  const readiness = engine.project(readings, ctx, plan);

  // ── 1 · Measure ────────────────────────────────────────────────────────────
  const daily = defs.filter((d) => d.cadence === 'daily');
  const measuredToday = new Set(readings.filter((r) => r.missionDay === today).map((r) => r.indicatorId));
  const checkedIn = readings.some((r) => r.missionDay === today && r.origin === 'manual');
  const streak = checkInStreak(readings, today);
  const measure: Station = {
    id: 'measure', step: 1, href: '/check', stage: S.measure.stage, name: S.measure.name,
    status: checkedIn ? worstFresh(daily.map((d) => evalById.get(d.id)?.status ?? 'stale')) : 'stale',
    progress: daily.length ? daily.filter((d) => measuredToday.has(d.id)).length / daily.length : 0,
    datum: checkedIn || streak > 0 ? fill(S.measure.streak, { n: streak }) : S.measure.notToday,
  };

  // ── 2 · Understand ─────────────────────────────────────────────────────────
  const zones = Object.values(todayZones(evals, defs)).filter((z) => z !== 'none') as Status[];
  const losing = readiness.projections
    .map((p) => ({ p, rate: monthlyLoss(p, ctx) }))
    .filter((x) => x.rate >= 0.05)
    .sort((a, b) => b.rate - a.rate);
  // Lead with the zone that is furthest from OK at arrival; ties go to the fastest loss.
  const lead = [...losing].sort((a, b) => SEVERITY[b.p.status === 'stale' ? 'green' : b.p.status] - SEVERITY[a.p.status === 'stale' ? 'green' : a.p.status] || b.rate - a.rate)[0];
  const understand: Station = {
    id: 'understand', step: 2, href: '/', stage: S.understand.stage, name: S.understand.name,
    status: lead ? lead.p.status : worstFresh(zones),
    progress: zones.length ? zones.filter((z) => z === 'green').length / zones.length : 0,
    datum: lead ? fill(S.understand.trend, { metric: metricShort(lead.p.metric), rate: lead.rate.toFixed(1) }) : S.understand.steady,
  };

  // ── 3 · Act ────────────────────────────────────────────────────────────────
  const acted = (f: Finding) =>
    pending?.ruleId === f.ruleId || f.actions.some((a) => a.recheckIndicatorId && verifications.some((v) => v.indicatorId === a.recheckIndicatorId));
  const openFindings = findings.filter((f) => !acted(f));
  const target = plan.exerciseMinPerDay ?? 90;
  const gap = exerciseGap(readings, today, target);
  const gain = readiness.scoreIfPlanFollowed - readiness.score;
  const improvable = readiness.projections.filter((p) => p.atArrivalIfPlanFollowed - p.atArrival >= 0.1);
  const counter = !planAccepted && gain > 0;
  const counterStatus = worstFresh(improvable.map((p) => p.status));
  const openCount = openFindings.reduce((n, f) => n + f.actions.length, 0) + (counter ? 1 : 0);
  const act: Station = {
    id: 'act', step: 3, href: '/loop', stage: S.act.stage, name: S.act.name,
    status: openCount ? worstFresh([...openFindings.map((f) => f.status as Status), ...(counter ? [counterStatus] : [])]) : 'green',
    // Ring: how much of the daily exercise target the last 7 days covered.
    progress: clamp01(1 - gap.missingMinPerDay / target),
    datum: openCount === 0 ? S.act.none : openCount === 1 ? S.act.one : fill(S.act.many, { n: openCount }),
  };

  // ── 4 · Verify ─────────────────────────────────────────────────────────────
  const lastCheck = verifications[verifications.length - 1];
  const OUTCOME: Record<VerificationResult['outcome'], Status> = { improved: 'green', unchanged: 'yellow', worse: 'red' };
  const pendingFinding = pending ? findings.find((f) => f.ruleId === pending.ruleId) : undefined;
  const verify: Station = {
    id: 'verify', step: 4, href: '/loop', stage: S.verify.stage, name: S.verify.name,
    status: pending ? (pendingFinding?.status ?? 'stale') : lastCheck ? OUTCOME[lastCheck.outcome] : 'stale',
    progress: verifications.length ? verifications.filter((v) => v.outcome === 'improved').length / verifications.length : pending ? 0.5 : 0,
    datum: pending ? fill(S.verify.due, { time: clock(pending.dueTs) }) : lastCheck ? S.verify[lastCheck.outcome] : S.verify.none,
  };

  // ── 5 · Escalate ───────────────────────────────────────────────────────────
  const solsSince = briefQueuedTs === null ? null : Math.max(0, Math.floor((nowTs - briefQueuedTs) / DAY_MS));
  const briefToday = solsSince === 0;
  const escalate: Station = {
    id: 'escalate', step: 5, href: '/brief', stage: S.escalate.stage, name: S.escalate.name,
    // A brief older than a sol no longer describes today: shown as stale, never green.
    status: briefToday ? 'green' : 'stale',
    progress: solsSince === null ? 0 : clamp01(1 - solsSince / 5),
    datum: solsSince === null ? S.escalate.none : solsSince === 0 ? S.escalate.today : solsSince === 1 ? S.escalate.one : fill(S.escalate.many, { n: solsSince }),
  };

  // ── 6 · Environment ────────────────────────────────────────────────────────
  const envDefs = defs.filter((d) => d.hazards.includes('environment') && d.cadence === 'daily');
  const co2 = [...readings].reverse().find((r) => r.indicatorId === 'cabin_co2');
  const environment: Station = {
    id: 'environment', step: 6, href: '/environment', stage: S.environment.stage, name: S.environment.name,
    status: evalById.get('cabin_co2')?.status ?? 'stale',
    progress: envDefs.length ? envDefs.filter((d) => evalById.get(d.id)?.status === 'green').length / envDefs.length : 0,
    datum: co2 ? fill(S.environment.co2, { value: r1(co2.value) }) : S.environment.none,
  };

  // ── Today's loop ───────────────────────────────────────────────────────────
  const done: Record<LoopStepId, boolean> = {
    measure: checkedIn,
    understand: checkedIn,                       // the engine evaluates and projects as soon as there is a check-in
    act: checkedIn && openCount === 0,
    verify: !pending && verifications.length > 0,
    escalate: briefToday,
  };
  const current = LOOP_STEPS.find((s) => !done[s]) ?? null;
  const stageOf: Record<LoopStepId, string> = {
    measure: S.measure.stage, understand: S.understand.stage, act: S.act.stage, verify: S.verify.stage, escalate: S.escalate.stage,
  };
  const loop = {
    steps: LOOP_STEPS.map((id) => ({ id, label: stageOf[id], state: done[id] ? ('done' as const) : id === current ? ('current' as const) : ('todo' as const) })),
    done: LOOP_STEPS.filter((s) => done[s]).length,
  };

  // ── Right now: the one thing to do, for the current step ───────────────────
  const R = copy.rightNow;
  const stepLabel = current ? fill(R.step, { n: LOOP_STEPS.indexOf(current) + 1, stage: stageOf[current] }) : R.allDone;
  const sourceChip = (official: boolean): Chip => (official ? { kind: 'official', label: R.chipOfficial } : { kind: 'prototype', label: R.chipPrototype });
  let rightNow: RightNow;
  if (current === 'measure') {
    rightNow = { step: current, stepLabel, status: measure.status, title: R.measure.title, why: R.measure.why, chips: [{ kind: 'time', label: fill(R.chipMinutes, { n: 2 }) }], cta: { label: R.measure.cta, href: '/check' }, whyHref: '/' };
  } else if (current === 'act' && openFindings.length) {
    const f = openFindings[0];
    const a = f.actions[0];
    rightNow = {
      step: current, stepLabel, status: f.status, title: a?.text ?? f.title, why: f.because.join(' '),
      chips: [...(a?.recheckInMin ? [{ kind: 'time' as const, label: fill(R.chipRecheck, { n: a.recheckInMin }) }] : []), sourceChip(f.sources.every((s) => s.official))],
      cta: { label: R.finding.cta, href: '/loop' }, whyHref: '/loop',
    };
  } else if (current === 'act') {
    const chips: Chip[] = [{ kind: 'gain', label: fill(R.chipReadiness, { n: gain }) }];
    const scores = { score: readiness.score, planScore: readiness.scoreIfPlanFollowed };
    // The projections mix NASA rates with prototype effect sizes: always labelled as prototype.
    const proto = sourceChip(improvable.every((p) => p.sources.every((s) => s.official)));
    const bone = improvable.find((p) => p.zone === 'bones') ?? improvable[0];
    if (gap.missingMinPerDay > 0 && bone) {
      const min = Math.max(5, Math.round(gap.missingMinPerDay / 5) * 5);
      rightNow = {
        step: current, stepLabel, status: counterStatus,
        title: fill(R.exercise.title, { min }),
        why: fill(R.exercise.why, { metric: metricLong(bone.metric), rate: monthlyLoss(bone, ctx).toFixed(1), ...scores }),
        chips: [...chips, { kind: 'time', label: fill(R.chipMinutes, { n: min }) }, proto],
        cta: { label: R.exercise.cta, href: '/loop' }, whyHref: '/',
      };
    } else {
      rightNow = { step: current, stepLabel, status: counterStatus, title: R.plan.title, why: fill(R.plan.why, scores), chips: [...chips, proto], cta: { label: R.plan.cta, href: '/' }, whyHref: '/' };
    }
  } else if (current === 'verify' && pending) {
    rightNow = {
      step: current, stepLabel, status: verify.status,
      title: fill(R.verify.title, { indicator: defById.get(pending.indicatorId)?.name ?? pending.indicatorId }),
      why: fill(R.verify.why, { time: clock(pending.dueTs) }), chips: [],
      cta: { label: R.verify.cta, href: '/loop' }, whyHref: '/loop',
    };
  } else if (current === 'verify' || current === 'escalate') {
    // Nothing waiting to be re-checked: the next thing the crew member can do is tell Earth.
    const linked = Number.isFinite(ctx.commDelayMin);
    rightNow = {
      step: current, stepLabel, status: escalate.status, title: R.escalate.title, why: linked ? R.escalate.why : R.escalate.whyNoLink,
      chips: linked && ctx.commDelayMin >= 1 ? [{ kind: 'time', label: fill(R.chipDelay, { n: Math.round(ctx.commDelayMin) }) }] : [],
      cta: { label: R.escalate.cta, href: '/brief' }, whyHref: '/brief',
    };
  } else {
    rightNow = { step: null, stepLabel, status: 'green', title: R.done.title, why: R.done.why, chips: [], cta: { label: R.done.cta, href: '/' }, whyHref: '/' };
  }

  const active: StationId | null = rightNow.step === 'verify' && !pending ? 'escalate' : rightNow.step;

  return {
    stations: [measure, understand, act, verify, escalate, environment],
    active,
    // Landing readiness takes the status of the weakest landing-day task (decided by the engine).
    core: { score: readiness.score, status: worstFresh(readiness.tasks.map((t) => t.status)) },
    rightNow,
    loop,
    stats: { streak, solsToLanding: Math.max(0, ctx.arrivalDay - today) },
  };
}
