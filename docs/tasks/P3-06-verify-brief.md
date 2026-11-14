# P3-06 · Verification and Flight Surgeon Brief → `src/domain/loop.ts`

> **Para P3:** pega `AGENTS.md` y luego todo este archivo. Rama `p3/loop`. Es corto. Entrega: **Sáb 21:00**.

---

You are writing ONE pure TypeScript module and its unit tests for KAWSAY (astronaut health copilot, NASA Space Apps 2026). It closes the loop **Act → Verify → Escalate**: after an action, a new measurement says whether it worked; if needed, a one-screen brief goes to the flight surgeon on Earth, aware of the communication delay.

- Output exactly two files: `src/domain/loop.ts` and `src/domain/loop.test.ts`.
- Pure TypeScript (strict). No React, no browser APIs, no network, no `Math.random`, no `Date.now()` (time comes as `nowTs`).
- Vitest. No NASA figures are needed here except the delay facts below.

## The contract (`src/domain/types.ts`, do not modify)

```ts
/**
 * KAWSAY — domain contract (v1, frozen Sat 12:00 Lima).
 * Single source of truth shared by the science engine (P3) and the UI (P1/P2).
 * Only P1 edits this file. Everything in src/domain must stay pure TypeScript:
 * no React, no browser APIs, no network, no unseeded randomness.
 */

// ── NASA HRP map: Hazard → Risk → Indicator → Action → Source ────────────────
export type HazardId = 'radiation' | 'isolation' | 'distance' | 'gravity' | 'environment';

export type RiskId =
  | 'immune' | 'sensorimotor' | 'cardio' | 'dcs' | 'microbes' | 'hypoxia'
  | 'nutrition' | 'eva' | 'fitness' | 'sans' | 'bone'
  | 'behavioral' | 'sleep' | 'radiation_cancer';

export type BodyZone =
  | 'eyes' | 'brain' | 'inner_ear' | 'heart' | 'lungs'
  | 'bones' | 'muscles' | 'kidneys' | 'skin_immune' | 'gut';

export const BODY_ZONES: readonly BodyZone[] = [
  'eyes', 'brain', 'inner_ear', 'heart', 'lungs',
  'bones', 'muscles', 'kidneys', 'skin_immune', 'gut',
] as const;

export type Environment = 'iss' | 'orion' | 'moon' | 'mars_transit' | 'mars_surface';
export type MissionPhase = 'cruise' | 'pre_eva' | 'eva' | 'pre_landing' | 'surface' | 'conjunction';

/** 'stale' = reading too old to trust (NASA-STD-3001: show missing/stale data). Never render stale as green. */
export type Status = 'green' | 'yellow' | 'red' | 'stale';

/** official=true → value published by NASA/CSA. false → prototype value, shown as "prototype value" in the UI. */
export interface Source {
  label: string;
  url: string;
  official: boolean;
}

// ── Indicators and readings ──────────────────────────────────────────────────

/**
 * One band of an indicator's traffic light. A reading falls in the band when
 * min <= value < max (absolute), or when |z-score vs personal baseline| >= sdFromBaseline.
 * Bands are checked red first, then yellow; anything else is green.
 */
export interface Threshold {
  status: Exclude<Status, 'green' | 'stale'>;
  min?: number;
  max?: number;
  sdFromBaseline?: number;
  /** Plain-language band, shown under "Why?". e.g. "Below 6 h of sleep". */
  label: string;
  source: Source;
}

export interface IndicatorDef {
  id: string;                       // e.g. 'bp_systolic', 'sleep_hours', 'mood'
  name: string;
  unit: string;
  zone: BodyZone;
  risks: RiskId[];
  hazards: HazardId[];
  input: 'number' | 'scale_1_5' | 'boolean' | 'checklist' | 'test';
  cadence: 'daily' | 'weekly' | 'per_event';
  staleAfterHours: number;
  thresholds: Threshold[];
  howToMeasure: string;             // plain-language steps (content/ owns the final copy)
  whyItMatters: string;
  sources: Source[];
}

export interface Reading {
  indicatorId: string;
  value: number;                    // booleans as 0/1, scales as 1..5
  ts: number;                       // epoch ms
  missionDay: number;
  phase: MissionPhase;
  origin: 'manual' | 'sensor_sim' | 'camera';
}

export interface Baseline {
  indicatorId: string;
  mean: number;
  sd: number;
  windowDays: number;
}

export interface Evaluation {
  indicatorId: string;
  status: Status;
  reason: string;                   // one sentence, shown to the crew member
  sources: Source[];
}

// ── Compound rules (hazards potentiate each other) ───────────────────────────
export interface Action {
  id: string;
  text: string;                     // imperative, one step
  recheckIndicatorId?: string;      // closed loop: what to measure again
  recheckInMin?: number;
  escalate: boolean;                // true → goes into the Flight Surgeon Brief
}

export interface Finding {
  ruleId: string;
  title: string;
  status: Exclude<Status, 'stale'>;
  because: string[];                // the readings that triggered it, in plain language
  risks: RiskId[];
  hazards: HazardId[];
  zones: BodyZone[];
  actions: Action[];
  sources: Source[];
}

// ── Closed loop: Act → Verify ────────────────────────────────────────────────
export interface VerificationResult {
  indicatorId: string;
  before: number;
  after: number;
  outcome: 'improved' | 'unchanged' | 'worse';
  /** true → the finding should go into the Flight Surgeon Brief. */
  escalate: boolean;
  reason: string;                   // one sentence, shown to the crew member
}

// ── Future Self (trajectory, not status) ─────────────────────────────────────
export interface MissionContext {
  environment: Environment;
  phase: MissionPhase;
  missionDay: number;
  arrivalDay: number;               // day of landing / gravity transition
  commDelayMin: number;             // one-way; Infinity during conjunction
}

/** Countermeasures the crew member commits to from today on. Omitted fields = keep current habits. */
export interface CountermeasurePlan {
  exerciseMinPerDay?: number;       // NASA target: 90 min/day, 6–7 days/week
  exerciseDaysPerWeek?: number;
  waterMlPerDay?: number;
  sleepHours?: number;
}

export interface TrajectoryPoint {
  day: number;                      // mission day
  value: number;                    // % of pre-flight baseline, current habits
  valueIfPlan: number;              // % of pre-flight baseline, plan followed
}

export interface Projection {
  zone: BodyZone;
  metric: string;                   // e.g. 'bone_density_pct', 'leg_strength_pct'
  today: number;                    // % of pre-flight baseline
  atArrival: number;                // projected with current habits
  atArrivalIfPlanFollowed: number;  // projected if countermeasures are met from today
  status: Status;                   // status at arrival with current habits
  series: TrajectoryPoint[];        // from day 0 to arrivalDay, one point per day (or per week)
  model: string;                    // human-readable formula, shown under "Why?"
  sources: Source[];
}

/** The four things a crew member must be able to do on landing day. */
export type LandingTaskId = 'stand' | 'see' | 'move' | 'think';

export interface LandingTask {
  id: LandingTaskId;
  label: string;                    // e.g. "Stand up without fainting"
  status: Status;                   // at arrival, current habits
  statusIfPlan: Status;             // at arrival, plan followed
  zones: BodyZone[];                // which projections drive it
  why: string;                      // one sentence
  sources: Source[];
}

export interface LandingReadiness {
  score: number;                    // 0..100 at arrivalDay, current habits
  scoreIfPlanFollowed: number;
  tasks: LandingTask[];             // always the 4 LandingTaskIds, in order stand, see, move, think
  projections: Projection[];
}

// ── Escalation: one-screen brief for the flight surgeon ──────────────────────
export interface FlightSurgeonBrief {
  generatedTs: number;
  missionDay: number;
  environment: Environment;
  commDelayMin: number;
  arrivesAtTs: number | null;       // null during conjunction (no contact)
  headline: string;                 // one sentence
  changed: string[];                // what changed since the last brief
  actionsTaken: string[];           // what the crew member already did, with verification outcome
  decisionRequested: string;        // the one question for the ground
  findings: Finding[];
  readiness: Pick<LandingReadiness, 'score' | 'scoreIfPlanFollowed'>;
}

// ── Engine surface (implemented by P3 in src/domain) ─────────────────────────
export interface Engine {
  indicators(): IndicatorDef[];
  evaluate(readings: Reading[], baselines: Baseline[], ctx: MissionContext, nowTs: number): Evaluation[];
  findCompound(readings: Reading[], ctx: MissionContext): Finding[];
  project(history: Reading[], ctx: MissionContext, plan?: CountermeasurePlan): LandingReadiness;
  verify(before: Reading, after: Reading): VerificationResult;
  brief(input: {
    findings: Finding[];
    verifications: VerificationResult[];
    readiness: LandingReadiness;
    ctx: MissionContext;
    nowTs: number;
  }): FlightSurgeonBrief;
}
```

## Facts you may use
- Communication delay to Mars: **up to 20 min one way** (`SRC.distance`, from `./indicators`). During solar conjunction there is no contact (`commDelayMin = Infinity`).

## What to build

```ts
import type { Environment, FlightSurgeonBrief, Finding, LandingReadiness, MissionContext, Reading, VerificationResult } from './types';

/** Which direction is "better" for each indicator. */
export const BETTER: Record<string, 'lower' | 'higher' | 'in_range'>;
export function verify(before: Reading, after: Reading): VerificationResult;

/** Typical one-way delay per environment, in minutes (prototype values except Mars ≤ 20, official). */
export const DELAY_MIN: Record<Environment, number>;

export function brief(input: {
  findings: Finding[];
  verifications: VerificationResult[];
  readiness: LandingReadiness;
  ctx: MissionContext;
  nowTs: number;
}): FlightSurgeonBrief;
```

### `BETTER`
- lower is better: `headache_score`, `cabin_co2`, `symptom_dizziness`, `symptom_vision`, `symptom_confusion`, `symptom_joint_pain`, `symptom_skin`, `bp_systolic`, `bp_diastolic`, `heart_rate`, `body_temp`.
- higher is better: `spo2`, `mood`, `sleep_hours`, `water_ml`, `exercise_min`, `strength_self_pct`.
- in_range: `glucose` (treat as lower-is-better when > 100, higher-is-better when < 70).

### `verify(before, after)`
- Throws if `indicatorId` differs.
- `delta = after.value − before.value`. A change is meaningful when `|delta| ≥ max(1, 10 % of |before.value|)` for scales/numbers, or any change for booleans (0/1).
- `outcome`: `improved` if the meaningful change goes in the better direction, `worse` if the opposite, otherwise `unchanged`.
- `escalate = outcome !== 'improved'`.
- `reason`: e.g. `"Headache went from 4 to 2 — improved."`, `"Cabin CO₂ stayed at 4.1 mmHg — no better, we'll tell Earth."`.

### `DELAY_MIN`
`iss: 0`, `orion: 0`, `moon: 0`, `mars_transit: 14`, `mars_surface: 20` (Mars values within NASA's "up to 20 min"; ISS/Moon delays are seconds → 0 for display).

### `brief(input)`
- `arrivesAtTs = nowTs + ctx.commDelayMin × 60 000`, or `null` if `commDelayMin` is not finite.
- `headline`: one sentence from the most severe finding + verification, e.g. `"Headache linked to high cabin CO₂ and short sleep; improved after action."`. No findings → `"No new findings. Routine brief."`.
- `changed`: each finding's `because` lines, flattened, max 5.
- `actionsTaken`: for each verification, `"<first action text of the matching finding> → <outcome>"` (match by the finding whose action `recheckIndicatorId` equals `verification.indicatorId`).
- `decisionRequested`: if any verification escalates or any finding is red → `"Please review: <finding title>. Advise on next step."`; else `"No decision needed. For your awareness."`.
- `findings`: only findings with an action `escalate: true`, or whose verification escalated, or all findings if none qualify (so the surgeon still sees context).
- `readiness`: `{ score, scoreIfPlanFollowed }`.

## Examples (must be tests)
1. before `headache_score` 4, after 2 → `improved`, `escalate: false`.
2. before `cabin_co2` 4.1, after 4.0 → `unchanged` (|−0.1| < 1), `escalate: true`.
3. before `spo2` 95, after 89 → `worse`.
4. before `symptom_dizziness` 1, after 0 → `improved`.
5. brief with ctx `commDelayMin: 14`, nowTs `T` → `arrivesAtTs = T + 840 000`.
6. brief with `commDelayMin: Infinity` → `arrivesAtTs: null`.
7. brief for the Sol 142 scene (one yellow `co2_headache` finding, one improved headache verification, readiness 66/89) → headline mentions "improved", `decisionRequested` = "No decision needed. For your awareness.", `readiness` = `{ score: 66, scoreIfPlanFollowed: 89 }`.

Build small inline fixtures for `Finding` and `LandingReadiness`.

Return only the two files, each in its own code block with its path as the first comment line.
