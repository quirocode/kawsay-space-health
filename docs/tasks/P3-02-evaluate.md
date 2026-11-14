# P3-02 · Evaluation by threshold and personal baseline → `src/domain/evaluate.ts`

> **Para P3:** pega `AGENTS.md` y luego todo este archivo. Rama `p3/evaluate`. Depende de P3-01 (`indicators.ts`), pero puedes hacerlo en paralelo: solo usa sus tipos. Entrega: **Sáb 16:00**.

---

You are writing ONE pure TypeScript module and its unit tests for KAWSAY (astronaut health copilot, NASA Space Apps 2026).

- Output exactly two files: `src/domain/evaluate.ts` and `src/domain/evaluate.test.ts`.
- Pure TypeScript (strict). No React, no browser APIs, no network, no `Math.random`, no `Date.now()` (time always comes in as `nowTs`).
- Vitest for tests. Never invent NASA figures; this module has no figures of its own, it only applies the thresholds it receives.

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

## What to build

```ts
import type { Baseline, Evaluation, IndicatorDef, MissionContext, Reading, Source, Status } from './types';

/** Status of a single value against an indicator's thresholds and optional personal baseline. */
export function statusOf(def: IndicatorDef, value: number, baseline?: Baseline): { status: Exclude<Status, 'stale'>; label: string | null; source: Source | null };

/** Mean and sample SD per indicator over the last `windowDays` mission days (only indicators with ≥ 5 readings). */
export function computeBaselines(readings: Reading[], windowDays: number, untilMissionDay: number): Baseline[];

/** Latest reading per indicator → Evaluation. One Evaluation per indicator in `defs`, in the same order. */
export function evaluate(
  defs: IndicatorDef[],
  readings: Reading[],
  baselines: Baseline[],
  ctx: MissionContext,
  nowTs: number,
): Evaluation[];
```

### Rules
1. **Band matching.** A threshold matches when all of the present conditions hold: `min` present → `value >= min`; `max` present → `value < max`. A threshold with `sdFromBaseline` (and no min/max) matches when a baseline exists, `sd > 0`, and `|value − mean| / sd >= sdFromBaseline`. Check all `red` thresholds first, then all `yellow`. No match → `green`.
2. **Stale.** For each indicator, take the reading with the highest `ts`. If none exists → `status: 'stale'`, reason `"No reading yet."`. If `nowTs − ts > staleAfterHours × 3 600 000` → `status: 'stale'`, reason `"Last reading is N h old."` (or `"N days old"` when ≥ 48 h; integers). **Stale is never green.**
3. **Reason** (one plain sentence, shown to the crew member):
   - green: `"<Name> is in the expected range."`
   - yellow/red from an absolute band: `"<Name> <value> <unit>: <threshold label>."`
   - yellow from baseline: `"<Name> is unusual for you (more than 2 SD from your last <windowDays> days)."`
   Format values with at most 1 decimal; booleans as "reported" instead of the value.
4. **Sources** of each Evaluation = the matched threshold's source first (if any), followed by the indicator's `sources`, de-duplicated by `url`.
5. `ctx` is accepted for future use (e.g. per-environment thresholds); do not branch on it now.

## Examples (use these as tests)

Given `def = cabin_co2` with thresholds red `min 6` (prototype) and yellow `min 3` (official), `staleAfterHours 2`:
| value | age | expected |
|---|---|---|
| 2.6 | 10 min | green, "Cabin CO₂ is in the expected range." |
| 4.1 | 10 min | yellow, reason contains "4.1 mmHg", first source official |
| 6.0 | 10 min | red |
| 2.6 | 3 h | stale, "Last reading is 3 h old." |
| — | — | stale, "No reading yet." |

Given `def = sleep_hours` with red `max 4`, yellow `min 4, max 6`, plus yellow `sdFromBaseline 2`, baseline mean 7.0, sd 0.4:
| value | expected |
|---|---|
| 6.4 | yellow from baseline (|6.4−7|/0.4 = 1.5 → no) → **green** |
| 6.1 | |6.1−7|/0.4 = 2.25 → **yellow**, baseline reason |
| 5.0 | yellow (absolute band) |
| 3.5 | red |

`computeBaselines`: readings of `heart_rate` on days 1..10 with values 60..69, `windowDays 7`, `untilMissionDay 10` → mean 66, sd ≈ 2.16 (sample SD of 63..69), windowDays 7.

## Tests (`src/domain/evaluate.test.ts`)
Build tiny inline `IndicatorDef` fixtures (do not import `indicators.ts`). Cover every row above, plus:
- the latest reading wins over older ones;
- output order equals `defs` order and length;
- a stale indicator never returns `green`;
- sources are de-duplicated.

Return only the two files, each in its own code block with its path as the first comment line.
