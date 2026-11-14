# P3-01 · Indicator catalog → `src/domain/indicators.ts`

> **Para P3:** pega primero `AGENTS.md` en DeepSeek y luego **todo** este archivo. Cuando te entregue los dos archivos, súbelos a tu rama `p3/indicators` en las rutas exactas y avisa a P1. Entrega esperada: **Sáb 15:00**.

---

You are writing ONE pure TypeScript module and its unit tests for KAWSAY, a health copilot for astronauts (NASA Space Apps 2026). Follow these rules strictly:

- Output exactly two files: `src/domain/indicators.ts` and `src/domain/indicators.test.ts`.
- Pure TypeScript (strict mode). No React, no browser APIs, no network, no `Math.random`. Import types only from `./types`.
- Tests use **Vitest** (`import { describe, it, expect } from 'vitest'`).
- **Never invent a NASA figure.** The only official numbers you may use are in the "Official figures" table below. Every other threshold is a prototype value and must use `SRC.prototype` (`official: false`).
- All text in English, short and plain (the reader is a tired engineer, not a doctor).

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

## Official figures you may cite (and only these)

| Fact | Value | Source key |
|---|---|---|
| Bone mineral density loss | 1–1.5 % per month | `bone` |
| Fitness loss | −10 to −12 % on average; 12–38 % of crew lose more than 20 % | `fitness` |
| Exercise countermeasure | 1.5 h/day, 6–7 days/week, resistive + aerobic | `fitness` |
| SANS | ~70 % of ISS astronauts show some eye swelling | `sans` |
| Cabin CO2 limit | ≤ 3 mmHg, 1-hour average (NASA-STD-3001 V2 6004); headaches reported from ~2.8–4.5 mmHg | `co2` |
| Hypoxia symptoms | confusion, headache, visual changes, trouble sleeping | `hypoxia` |
| Kidney stones | dehydration + calcium released from bone | `gravity` |
| Pre-landing countermeasures | compression garments and plenty of fluids before landing | `cardio` |
| Immune signs | cold sores, rash, atypical allergies, infections | `immune` |
| Decompression signs | joint pain, breathing problems, stroke-like symptoms | `dcs` |

## What to build

### 1. `SRC` — the source registry (copy exactly)

```ts
import type { IndicatorDef, Source } from './types';

const nasa = (label: string, url: string): Source => ({ label, url, official: true });

export const SRC = {
  hazards: nasa('NASA HRP — Hazards of Human Spaceflight', 'https://www.nasa.gov/hrp/hazards/'),
  risks: nasa('NASA HRP — Human System Risks', 'https://www.nasa.gov/hrp/risks/'),
  bone: nasa('NASA — Risk of Spaceflight-Induced Bone Changes', 'https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/'),
  fitness: nasa('NASA — Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness', 'https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/'),
  sans: nasa('NASA — Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)', 'https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/'),
  cardio: nasa('NASA — Risk of Cardiovascular Adaptations', 'https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/'),
  sensorimotor: nasa('NASA — Risk of Altered Sensorimotor and Vestibular Function', 'https://www.nasa.gov/reference/risk-of-altered-sensorimotor-and-vestibular-function/'),
  hypoxia: nasa('NASA — Risk of Hypoxia', 'https://www.nasa.gov/reference/risk-of-hypoxia/'),
  immune: nasa('NASA — Risk of Altered Immune System Responses', 'https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/'),
  microbes: nasa('NASA — Risk of Host-Microorganism Interactions', 'https://www.nasa.gov/reference/risk-of-host-microorganism-interactions/'),
  nutrition: nasa('NASA — Risk of Inadequate Food and Nutrition', 'https://www.nasa.gov/reference/risk-of-inadequate-food-and-nutrition/'),
  sleep: nasa('NASA — Risk of Inadequate Sleep and Irregular Schedules', 'https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/'),
  behavioral: nasa('NASA — Risk of Behavioral Conditions and Psychiatric Disorders', 'https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/'),
  dcs: nasa('NASA — Risk of Decompression Sickness', 'https://www.nasa.gov/reference/risk-of-decompression-sickness/'),
  eva: nasa('NASA — Risk of Injury and Compromised Performance from EVA', 'https://www.nasa.gov/reference/risk-of-injury-and-compromised-performance-from-extravehicular-activity-eva/'),
  radiation_cancer: nasa('NASA — Risk of Radiation-Induced Cancers', 'https://www.nasa.gov/reference/risk-of-radiation-induced-cancers/'),
  radiation: nasa('NASA HRP — Hazard: Space Radiation', 'https://www.nasa.gov/hrp/hazard-space-radiation/'),
  isolation: nasa('NASA HRP — Hazard: Isolation and Confinement', 'https://www.nasa.gov/hrp/hazard-isolation-and-confinement/'),
  distance: nasa('NASA HRP — Hazard: Distance from Earth', 'https://www.nasa.gov/hrp/hazard-distance-from-earth/'),
  gravity: nasa('NASA HRP — Hazard: Gravity Fields', 'https://www.nasa.gov/hrp/hazard-gravity-fields/'),
  environment: nasa('NASA HRP — Hazard: Hostile and Closed Environments', 'https://www.nasa.gov/hrp/hazard-hostile-closed-environments/'),
  co2: nasa('NASA-STD-3001 Technical Brief OCHMO-TB-004 — Carbon Dioxide', 'https://www.nasa.gov/ochmo-tb-004-carbon-dioxide-2/'),
  prototype: {
    label: 'KAWSAY prototype value (general adult reference, not a NASA figure)',
    url: 'https://github.com/quirocode/kawsay-space-health/blob/main/docs/04-recursos-nasa.md',
    official: false,
  },
} as const satisfies Record<string, Source>;
```

### 2. `INDICATORS: IndicatorDef[]` — exactly these ids, in this order

The first 7 are the challenge's six required indicators (blood pressure is split in two). Use these ids exactly: other modules depend on them.

| id | name | unit | zone | risks | hazards | input | cadence | staleAfterHours |
|---|---|---|---|---|---|---|---|---|
| `bp_systolic` | Blood pressure (systolic) | mmHg | heart | cardio | gravity | number | daily | 36 |
| `bp_diastolic` | Blood pressure (diastolic) | mmHg | heart | cardio | gravity | number | daily | 36 |
| `heart_rate` | Resting heart rate | bpm | heart | cardio, fitness | gravity | number | daily | 36 |
| `glucose` | Blood glucose | mg/dL | gut | nutrition | distance | number | daily | 36 |
| `body_temp` | Body temperature | °C | skin_immune | immune, microbes | environment | number | daily | 36 |
| `sleep_hours` | Sleep last night | h | brain | sleep, behavioral | isolation | number | daily | 36 |
| `mood` | Mood | 1–5 | brain | behavioral | isolation | scale_1_5 | daily | 36 |
| `headache_score` | Headache | 1–5 | brain | hypoxia, behavioral | environment | scale_1_5 | per_event | 12 |
| `symptom_dizziness` | Dizziness | yes/no | inner_ear | sensorimotor, cardio | gravity | boolean | per_event | 24 |
| `symptom_vision` | Blurred vision | yes/no | eyes | sans, hypoxia | gravity | boolean | per_event | 24 |
| `symptom_confusion` | Confusion | yes/no | brain | hypoxia | environment | boolean | per_event | 12 |
| `symptom_joint_pain` | Joint pain | yes/no | bones | dcs, eva | environment | boolean | per_event | 12 |
| `symptom_skin` | Rash or cold sore | yes/no | skin_immune | immune, microbes | environment | boolean | per_event | 48 |
| `spo2` | Blood oxygen (SpO₂) | % | lungs | hypoxia | environment | number | daily | 48 |
| `cabin_co2` | Cabin CO₂ | mmHg | lungs | hypoxia | environment | number | daily | 2 |
| `exercise_min` | Exercise today | min | muscles | fitness, bone | gravity | number | daily | 36 |
| `water_ml` | Water today | mL | kidneys | nutrition, bone | gravity | number | daily | 36 |
| `strength_self_pct` | Strength self-test | % of pre-flight | muscles | fitness | gravity | test | weekly | 24 * 8 |

`headache_score`: 1 = none, 5 = severe. Booleans: 1 = yes (symptom present), 0 = no.

### 3. Thresholds (red band first, then yellow; anything else is green)

Use `SRC.prototype` unless the table says otherwise. Each `label` is a short English phrase shown to the crew member.

| id | red | yellow | source |
|---|---|---|---|
| bp_systolic | ≥ 160 or < 85 | 140–159 or 85–94 | prototype |
| bp_diastolic | ≥ 100 or < 50 | 90–99 or 50–59 | prototype |
| heart_rate | ≥ 120 or < 40 | 100–119 or 40–49 | prototype |
| glucose | ≥ 250 or < 60 | 140–249 or 60–69 | prototype |
| body_temp | ≥ 39.0 or < 35.0 | 37.8–38.9 or 35.0–35.9 | prototype |
| sleep_hours | < 4 | 4–5.99 | prototype (link `SRC.sleep` in `sources`) |
| mood | 1 | 2 | prototype |
| headache_score | 5 | 3–4 | prototype |
| each `symptom_*` | — | 1 | prototype |
| spo2 | < 88 | 88–91.99 | prototype |
| cabin_co2 | ≥ 6 (prototype) | ≥ 3 (**`SRC.co2`, official**) | see column |
| exercise_min | < 45 (`max: 45`, prototype) | < 90 (`max: 90` only; **the 90 min line is official: `SRC.fitness`**) | see column |
| water_ml | < 1500 | 1500–1999 | prototype |
| strength_self_pct | < 80 (**>20 % loss, aligned with `SRC.fitness`**, but the cut-off is ours → prototype) | 80–89.99 | prototype |

Add `sdFromBaseline: 2` as an extra yellow threshold (prototype) for `bp_systolic`, `heart_rate`, `body_temp`, `sleep_hours`.

### 4. Copy fields
- `howToMeasure`: max 4 short steps separated by " · ". Example for heart_rate: "Rest seated for 2 min · Put the sensor on your finger · Wait for a steady number · Enter it".
- `whyItMatters`: max 2 sentences. Only use the official figures above; otherwise speak qualitatively.
- `sources`: the relevant NASA risk/hazard keys plus `SRC.prototype` when any threshold is a prototype.

### 5. Helpers
```ts
export function getIndicator(id: string): IndicatorDef | undefined;
export const INDICATOR_IDS: readonly string[]; // ids in table order
```

## Tests (`src/domain/indicators.test.ts`)
1. Exactly the 18 ids above, in order, no duplicates.
2. Every indicator has ≥ 1 source and every threshold has a `source`.
3. The `cabin_co2` yellow threshold has `min: 3` and `source.official === true`; its red threshold has `official === false`.
4. Every `zone` is one of the 10 `BodyZone` values.
5. Thresholds with an official source exist only on `cabin_co2` (`min: 3`, no `max`) and `exercise_min` (`max: 90`, no `min`), and never use `sdFromBaseline`. (Guards against invented NASA numbers.)
6. `getIndicator('mood')?.input === 'scale_1_5'` and `getIndicator('nope') === undefined`.

## Example (shape only)
```ts
{
  id: 'cabin_co2', name: 'Cabin CO₂', unit: 'mmHg', zone: 'lungs',
  risks: ['hypoxia'], hazards: ['environment'], input: 'number', cadence: 'daily', staleAfterHours: 2,
  thresholds: [
    { status: 'red', min: 6, label: '6 mmHg or more', source: SRC.prototype },
    { status: 'yellow', min: 3, label: 'Above the NASA limit of 3 mmHg (1-hour average)', source: SRC.co2 },
  ],
  howToMeasure: 'Open the cabin air panel · Read the CO₂ value · Enter it',
  whyItMatters: 'High CO₂ can cause headaches and poor focus. NASA limits it to 3 mmHg as a 1-hour average.',
  sources: [SRC.co2, SRC.environment, SRC.prototype],
}
```

Return only the two files, each in its own code block with its path as the first comment line.
