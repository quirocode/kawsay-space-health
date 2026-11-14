/**
 * KAWSAY — domain contract.
 * Single source of truth shared by the science engine (P3) and the UI (P1/P2).
 * Only P1 edits this file. Everything in src/domain must stay pure TypeScript:
 * no React, no browser APIs, no network.
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

export type Environment = 'iss' | 'orion' | 'moon' | 'mars_transit' | 'mars_surface';
export type MissionPhase = 'cruise' | 'pre_eva' | 'eva' | 'pre_landing' | 'surface' | 'conjunction';

/** 'stale' = reading too old to trust (NASA-STD-3001: show missing/stale data). */
export type Status = 'green' | 'yellow' | 'red' | 'stale';

/** official=true → value published by NASA/CSA. false → prototype value, shown as such in the UI. */
export interface Source {
  label: string;
  url: string;
  official: boolean;
}

// ── Indicators and readings ──────────────────────────────────────────────────
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
  howToMeasure: string;             // plain-language steps (content/ owns the copy)
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

// ── Future Self (trajectory, not status) ─────────────────────────────────────
export interface MissionContext {
  environment: Environment;
  phase: MissionPhase;
  missionDay: number;
  arrivalDay: number;               // day of landing / gravity transition
  commDelayMin: number;             // one-way; Infinity during conjunction
}

export interface Projection {
  zone: BodyZone;
  metric: string;                   // e.g. 'bone_density_pct', 'leg_strength_pct'
  today: number;                    // % of pre-flight baseline
  atArrival: number;                // projected with current habits
  atArrivalIfPlanFollowed: number;  // projected if countermeasures are met from today
  status: Status;
  model: string;                    // human-readable formula, shown under "Why?"
  sources: Source[];
}

export interface LandingReadiness {
  score: number;                    // 0..100 at arrivalDay
  scoreIfPlanFollowed: number;
  canStand: Status;                 // cardiovascular / orthostatic
  canSee: Status;                   // SANS
  canMove: Status;                  // bone, muscle, sensorimotor
  canThink: Status;                 // sleep, behavioral, radiation CNS
  projections: Projection[];
}

// ── Engine surface (implemented by P3 in src/domain) ─────────────────────────
export interface Engine {
  evaluate(readings: Reading[], baselines: Baseline[], ctx: MissionContext): Evaluation[];
  findCompound(readings: Reading[], ctx: MissionContext): Finding[];
  project(history: Reading[], ctx: MissionContext): LandingReadiness;
}
