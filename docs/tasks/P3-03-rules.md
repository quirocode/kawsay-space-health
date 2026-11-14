# P3-03 · Compound rules → `src/domain/rules.ts`

> **Para P3:** pega `AGENTS.md` y luego todo este archivo. Rama `p3/rules`. Necesita `SRC` de P3-01: si aún no está, DeepSeek puede importarlo igual (`import { SRC } from './indicators'`). Entrega: **Sáb 18:00**.

---

You are writing ONE pure TypeScript module and its unit tests for KAWSAY (astronaut health copilot, NASA Space Apps 2026). NASA says the five spaceflight hazards **potentiate each other**, so a single indicator is not enough: these rules cross indicators and return explainable findings.

- Output exactly two files: `src/domain/rules.ts` and `src/domain/rules.test.ts`.
- Pure TypeScript (strict). No React, no browser APIs, no network, no `Math.random`, no `Date.now()`.
- Vitest. Every `Finding` carries `sources`; never invent a NASA figure (official facts are listed below).
- Deterministic: same input → same output, same order.

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
`SRC` with keys: `hazards, risks, bone, fitness, sans, cardio, sensorimotor, hypoxia, immune, microbes, nutrition, sleep, behavioral, dcs, eva, radiation_cancer, radiation, isolation, distance, gravity, environment, co2, prototype`.

Indicator ids (values: booleans 0/1, `headache_score` and `mood` 1–5):
`bp_systolic, bp_diastolic, heart_rate, glucose, body_temp, sleep_hours, mood, headache_score, symptom_dizziness, symptom_vision, symptom_confusion, symptom_joint_pain, symptom_skin, spo2, cabin_co2, exercise_min, water_ml, strength_self_pct`.

## Official facts you may cite
- Cabin CO₂ limit 3 mmHg (1-hour average); headaches reported from ~2.8–4.5 mmHg → `SRC.co2`.
- Hypoxia signs: confusion, headache, visual changes, trouble sleeping → `SRC.hypoxia`.
- Kidney stones from dehydration + calcium released from bone → `SRC.gravity`, `SRC.bone`.
- Low blood pressure → fainting on landing; countermeasures: compression garments and plenty of fluids before landing → `SRC.cardio`. Adaptation time is needed before critical tasks after a gravity transition → `SRC.gravity`.
- Exercise target 1.5 h/day → `SRC.fitness`.
- Sleep loss, circadian misalignment and workload worsen behavioral risk; journaling and light therapy are NASA tools → `SRC.isolation`, `SRC.sleep`.
- Decompression: joint pain, breathing problems, stroke-like symptoms → end the EVA and return to pressure → `SRC.dcs`.
Any other cut-off is ours: add `SRC.prototype` to the finding's sources.

## What to build

```ts
import type { Finding, MissionContext, Reading } from './types';

export interface RuleDef {
  id: string;
  check(readings: Reading[], ctx: MissionContext): Finding | null;
}
export const RULES: RuleDef[];

/** Runs every rule, drops nulls, sorts red before yellow, then by rule order. */
export function findCompound(readings: Reading[], ctx: MissionContext): Finding[];
```

Helper semantics (implement as internal functions and test them):
- `latest(readings, id)` → reading with max `ts`, or undefined.
- `lastNDaysAvg(readings, id, n, ctx)` → average of the **latest reading per mission day** over days `ctx.missionDay − n + 1 … ctx.missionDay`; undefined if no data.
- "Recent" = `missionDay === ctx.missionDay` (today).

## The rules (implement exactly these six, in this order)

| id | fires when | status | title |
|---|---|---|---|
| `co2_headache` | today `headache_score ≥ 3` AND (`cabin_co2` latest ≥ 3 OR 3-night avg `sleep_hours` < 6) | yellow; **red** if also `symptom_confusion` = 1 today | "Headache + short sleep + high cabin CO₂" (adapt the title to the conditions that actually matched, e.g. "Headache + high cabin CO₂") |
| `hypoxia_signs` | latest `spo2` < 92 AND today (`headache_score ≥ 3` OR `symptom_confusion` = 1 OR `symptom_vision` = 1) | red | "Low oxygen with symptoms" |
| `dcs_eva` | `ctx.phase` is `pre_eva` or `eva` AND today `symptom_joint_pain` = 1 | red | "Possible decompression sickness" |
| `kidney_stone` | `ctx.missionDay ≥ 30` AND 3-day avg `water_ml` < 2000 | yellow | "Low water + bone loss: kidney stone risk" |
| `orthostatic_landing` | (`ctx.phase === 'pre_landing'` OR `ctx.arrivalDay − ctx.missionDay ≤ 7`) AND (today `symptom_dizziness` = 1 OR 7-day avg `exercise_min` < 60 OR 3-day avg `water_ml` < 2000) | yellow | "Fainting risk at landing" |
| `sleep_mood` | 3-night avg `sleep_hours` < 6 AND latest `mood` ≤ 2 | yellow | "Short sleep is pulling your mood down" |

### `because` (plain sentences built from the actual values)
Examples: `"Headache reported (4 of 5)."`, `"Cabin CO₂ 4.1 mmHg — NASA limit is 3 mmHg."`, `"Sleep averaged 5.2 h over 3 nights."`, `"Water averaged 1.6 L over 3 days."`. Only include the conditions that matched.

### Actions (one primary action each; text is imperative, one step)
| rule | action text | recheck | escalate |
|---|---|---|---|
| co2_headache | "Move to a well-ventilated module, drink 250 ml of water, and ask the crew to check the CO₂ scrubber." | `headache_score` in 30 min | false (true when red) |
| hypoxia_signs | "Put on the oxygen mask now and tell the crew." | `spo2` in 10 min | true |
| dcs_eva | "End the EVA and return to pressure now." | `symptom_joint_pain` in 30 min | true |
| kidney_stone | "Drink to 2.5 L today — keep a bottle in sight." | `water_ml` in 1440 min | false |
| orthostatic_landing | "Start fluid loading and wear your compression garment. No critical tasks until you pass the balance test." | `symptom_dizziness` in 60 min | false |
| sleep_mood | "Use the light-therapy schedule tonight and write 3 lines in your journal." | `mood` in 1440 min | false |

Action `id` = `${ruleId}.primary`.

### risks / hazards / zones per rule
| rule | risks | hazards | zones |
|---|---|---|---|
| co2_headache | hypoxia, sleep | environment, isolation | brain, lungs |
| hypoxia_signs | hypoxia | environment | lungs, brain |
| dcs_eva | dcs, eva | environment | bones |
| kidney_stone | bone, nutrition | gravity | kidneys, bones |
| orthostatic_landing | cardio, sensorimotor | gravity | heart, inner_ear |
| sleep_mood | sleep, behavioral | isolation | brain |

## Example — the demo scene "Sol 142" (must be a test)
ctx = `{ environment: 'mars_transit', phase: 'cruise', missionDay: 142, arrivalDay: 180, commDelayMin: 14 }`.
Readings: `sleep_hours` day 140 = 4.6, day 141 = 4.6, day 142 = 6.4; `headache_score` day 142 = 4; `cabin_co2` day 142 = 4.1; `mood` day 142 = 4; `water_ml` days 140–142 = 2400.
Expected: exactly one finding, `co2_headache`, **yellow**, `because` has 3 items (headache, CO₂, sleep 5.2 h), one action with `recheckIndicatorId: 'headache_score'`, `recheckInMin: 30`, `escalate: false`, sources include `SRC.co2` and `SRC.hypoxia`.

## Tests (`src/domain/rules.test.ts`)
- The Sol 142 example above.
- Each rule: one case that fires and one that does not.
- `co2_headache` turns red with confusion.
- `findCompound` puts red findings first.
- `dcs_eva` never fires in phase `cruise`.
- Determinism: calling twice returns deep-equal results.

Return only the two files, each in its own code block with its path as the first comment line.
