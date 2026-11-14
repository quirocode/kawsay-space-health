# P3-04 · Future Self projection and Landing Readiness → `src/domain/projection.ts`

> **Para P3:** pega `AGENTS.md` y luego todo este archivo. Rama `p3/projection`. Es el encargo más importante: alimenta la pantalla principal. Entrega: **Sáb 19:00**.

---

You are writing ONE pure TypeScript module and its unit tests for KAWSAY (astronaut health copilot, NASA Space Apps 2026). The main screen shows the crew member **today** next to their **projected self on arrival day**. This module computes that projection and a 0–100 **Landing Readiness** score built from four landing-day tasks: stand, see, move, think.

- Output exactly two files: `src/domain/projection.ts` and `src/domain/projection.test.ts`.
- Pure TypeScript (strict). No React, no browser APIs, no network, no `Math.random`, no `Date.now()`.
- Vitest. The models are **illustrative**: they use NASA's published rates as anchors and our own interpolation in between. Every projection's `sources` must include the NASA page **and** `SRC.prototype`. Never invent a NASA figure.
- **All tunable numbers live in one exported `PARAMS` object** so P1 can calibrate the demo without touching logic.

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

## Available from `./indicators` (P3-01)
`SRC` (keys: `bone, fitness, cardio, sans, sleep, gravity, sensorimotor, prototype`, …). Indicator ids used here: `exercise_min`, `water_ml`, `sleep_hours`, `symptom_vision`, `strength_self_pct`.

## Official anchors (the only NASA numbers here)
- Bone mineral density: **−1 % to −1.5 % per month** in microgravity → `SRC.bone`.
- Fitness: **−10 to −12 % on average** over a ~6-month mission; **12–38 % of crew lose more than 20 %** → `SRC.fitness`.
- Exercise target: **1.5 h/day (90 min), 6–7 days/week** → `SRC.fitness`.
- Fluids and compression garments before landing reduce fainting → `SRC.cardio` (qualitative: the size of the effect is ours).
- SANS affects ~70 % of ISS astronauts → `SRC.sans`.

## PARAMS (export exactly this shape; values are defaults)

```ts
export const PARAMS = {
  exerciseTargetMin: 90,            // official (SRC.fitness)
  missingDayAdherence: 0.5,         // prototype: day with no exercise reading
  recentWindowDays: 7,              // "current habits" = average of the last 7 days
  partialGravityFactor: 0.5,        // prototype: moon / mars_surface lose half as fast
  bone: { lossPerMonthAtFullAdherence: 1.0, lossPerMonthAtZeroAdherence: 1.5, green: 94, red: 91 },   // rates official, interpolation + cut-offs prototype
  muscle: { lossAt180dFullAdherence: 10, lossAt180dZeroAdherence: 22, green: 88, red: 82 },           // 10 % and >20 % anchored on SRC.fitness
  heart: { lossAt180dFullAdherence: 8, lossAt180dZeroAdherence: 18, fluidBonus: 6, dryPenalty: 4, fluidGoodMl: 2500, fluidLowMl: 2000, green: 90, red: 82 },
  eyes: { penaltyPerVisionDay: 4, maxPenalty: 12, lookbackDays: 14, green: 96, red: 90 },
  brain: { targetSleepH: 7, penaltyPerMissingHour: 8, green: 92, red: 84 },
  score: { atRed: 30, atGreen: 90 },
} as const;
```

## What to build

```ts
import type { CountermeasurePlan, LandingReadiness, MissionContext, Reading } from './types';

export function adherenceByDay(history: Reading[], fromDay: number, toDay: number): number[]; // index 0 = fromDay
export function project(history: Reading[], ctx: MissionContext, plan?: CountermeasurePlan): LandingReadiness;
```

### Definitions
- **Adherence of a day** `a_d = clamp(exercise_min_d / 90, 0, 1)` using the latest `exercise_min` reading of that mission day; no reading → `PARAMS.missingDayAdherence`.
- **Current habits** `a_now` = mean of `a_d` over the last 7 mission days up to `ctx.missionDay`. Same idea for `water_now` (mean `water_ml`, last 3 days) and `sleep_now` (mean `sleep_hours`, last 7 days).
- **Plan values**: `a_plan = clamp(plan.exerciseMinPerDay / 90, 0, 1) × (plan.exerciseDaysPerWeek ?? 7) / 7`; `water_plan = plan.waterMlPerDay`; `sleep_plan = plan.sleepHours`. Any field missing in `plan` (or no plan) → use the current value.
- **Gravity factor** `g = 1` for `iss`, `orion`, `mars_transit`; `g = PARAMS.partialGravityFactor` for `moon`, `mars_surface`.
- Days run from 0 to `ctx.arrivalDay`. Days ≤ `ctx.missionDay` use each day's own `a_d` (history); days after use `a_now` (series `value`) or `a_plan` (series `valueIfPlan`).

### The five projections (all values are % of pre-flight, start at 100 on day 0)
| zone | metric | daily change | notes |
|---|---|---|---|
| bones | `bone_density_pct` | `−g × lerp(1.5, 1.0, a) / 30` | lerp(x0, x1, a) = x0 + (x1 − x0)·a |
| muscles | `leg_strength_pct` | `−g × lerp(22, 10, a) / 180` | If a `strength_self_pct` reading exists, **today** = latest measured value and the future is projected from it. |
| heart | `orthostatic_tolerance_pct` | `−g × lerp(18, 8, a) / 180` | At arrival only: `+fluidBonus` if water ≥ 2500 mL, `−dryPenalty` if water < 2000 mL (current or plan water respectively). |
| eyes | `vision_pct` | — | `100 − min(maxPenalty, penaltyPerVisionDay × days with symptom_vision = 1 in the last 14 days)`. Same for plan. |
| brain | `alertness_pct` | — | `100 − penaltyPerMissingHour × max(0, 7 − sleep)` with sleep = `sleep_now` or `sleep_plan`. |

Round all values to 1 decimal. `series` has one point per day (day 0 … arrivalDay).

**Status** of each projection at arrival (current habits): `green` if ≥ green line, `red` if < red line, else `yellow`. **Stale rule:** if the inputs of that projection have no reading in the last 3 mission days (exercise for bones/muscles/heart, sleep for brain), `status = 'stale'`.

**`model`** (shown under "Why?"), e.g. `"Bone loses 1.0–1.5 % per month in microgravity (NASA). We interpolate by your exercise vs the 90 min/day target (prototype)."`

### Landing tasks (always 4, in this order)
| id | label | zones | why | sources |
|---|---|---|---|---|
| stand | Stand up without fainting | heart | "Blood pressure can drop when gravity returns; fluids and compression help." | cardio, prototype |
| see | Read the displays | eyes | "Fluid shifts can press on the eyes (SANS)." | sans, prototype |
| move | Climb out and walk | bones, muscles | "Weaker bones and legs raise the risk of falls during the gravity transition." | bone, fitness, gravity, prototype |
| think | Run the landing checklist | brain | "Short sleep slows decisions on the most demanding day." | sleep, prototype |

Task `status` = worst status of its zones' projections (order: stale > red > yellow > green — stale wins so old data never looks fine). `statusIfPlan` = same using the plan values.

### Landing Readiness score
For each projection: `s = clamp(atRed + (atGreen − atRed) × (value − red) / (green − red), 0, 100)` with value = `atArrival` (or `atArrivalIfPlanFollowed`). Task score = min of its zones. `score` = round(mean of the 4 task scores). `scoreIfPlanFollowed` = same with plan values. A stale projection scores 50.

## Example (must be a test, check properties, not exact numbers)
ctx `{ environment: 'mars_transit', phase: 'cruise', missionDay: 142, arrivalDay: 180, commDelayMin: 14 }`.
History: `exercise_min` = 80 every day for days 1–135, then 40 for days 136–142; `water_ml` = 1600 days 140–142; `sleep_hours` = 4.6, 4.6, 6.4 for days 140–142 and 7 before; plan `{ exerciseMinPerDay: 90, waterMlPerDay: 2500, sleepHours: 7 }`.
Expect:
- `tasks.map(t => t.id)` = `['stand','see','move','think']`;
- `scoreIfPlanFollowed > score` by at least 10 points;
- bones `today` between 93 and 96; `atArrivalIfPlanFollowed ≥ atArrival`;
- `series.length === 181` and `series[142].value === series[142].valueIfPlan`;
- stand task: `status` worse than `statusIfPlan`.

## Tests (`src/domain/projection.test.ts`)
The example above, plus:
- Perfect adherence for 180 days → bone loss at arrival ≈ 6 % (1.0 %/month × 6) ± 0.2.
- Zero exercise for 180 days → muscle loss ≈ 22 % ± 0.5.
- `partialGravityFactor` halves the bone loss on `mars_surface`.
- No exercise readings in the last 3 days → bones/muscles/heart `stale`, and the move task is `stale`.
- More planned exercise never lowers `scoreIfPlanFollowed` (monotonicity).
- Every projection's `sources` contains one official and one non-official source.

Return only the two files, each in its own code block with its path as the first comment line.
