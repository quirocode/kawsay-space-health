/**
 * Suit & flight-phase check-up: what the body needs watching for when the crew member is
 * strapped in for launch, inside an EVA suit, coming home through entry, and standing up
 * again in gravity. The wrist band covers cruise; this covers the moments it cannot.
 *
 * Pure and deterministic: the "simulated measurement" uses a seeded generator, so the same
 * phase + scenario + run always gives the same numbers (demo mode must replay exactly).
 *
 * Every cut-off carries its sources. Only the EMU operating pressure (4.3 psi) and the
 * countermeasures (prebreathe, fluid loading, compression garments, end the EVA on DCS
 * symptoms) are NASA facts; every numeric band is a PROTOTYPE value and says so.
 * Copy (names, explanations, steps) lives in content/suit.json, keyed by the ids below.
 */
import { SRC } from './indicators';
import type { RiskId, Source, Status } from './types';

export type FlightPhase = 'launch' | 'cruise' | 'eva' | 'entry' | 'post_landing';
export const FLIGHT_PHASES: readonly FlightPhase[] = ['launch', 'cruise', 'eva', 'entry', 'post_landing'] as const;

export type Scenario = 'nominal' | 'watch' | 'act';
export const SCENARIOS: readonly Scenario[] = ['nominal', 'watch', 'act'] as const;

export type SuitSignalId =
  | 'heart_rate' | 'spo2' | 'skin_temp_delta' | 'g_load' | 'metabolic_rate' | 'suit_co2'
  | 'suit_pressure' | 'o2_remaining' | 'core_temp' | 'prebreathe_done' | 'dcs_symptoms'
  | 'fluid_loading_done' | 'compression_on' | 'standing_hr_rise' | 'systolic_drop'
  | 'dizziness' | 'balance_passed';

type Direction = 'high' | 'low' | 'yes_needed' | 'no_wanted';

export interface SuitSignalDef {
  id: SuitSignalId;
  unit: string;
  /** high: bad when value >= band. low: bad when value <= band. yes_needed: 0 is bad. no_wanted: 1 is bad. */
  direction: Direction;
  watchAt?: number;
  actAt?: number;
  /** For yes/no signals: which status a bad answer gives. */
  badStatus?: Exclude<Status, 'green' | 'stale'>;
  /** Usual value, drawn as a reference in the UI. */
  nominal: number;
  decimals: number;
  risks: RiskId[];
  /** Where the number comes from: the device that measures it in that phase. */
  sensor: 'chest_ecg' | 'pulse_ox' | 'band' | 'accelerometer' | 'suit_telemetry' | 'checklist' | 'self_report' | 'stand_test' | 'cuff';
  sources: Source[];
}

const proto = (label: string): Source => ({ label: `UPRIGHT prototype value — ${label}`, url: SRC.prototype.url, official: false });
const EMU_PRESSURE: Source = {
  label: 'NASA — EMU nominal operating pressure 30 kPa (4.3 psia)',
  url: 'https://ntrs.nasa.gov/api/citations/20120003917/downloads/20120003917.pdf',
  official: true,
};
const SUITED_HR: Source = {
  label: 'NASA JSC suited testing keeps heart rate under 85 % of age-predicted max (NTRS)',
  url: 'https://ntrs.nasa.gov/api/citations/20120003917/downloads/20120003917.pdf',
  official: false, // a test-operations cut-off, not a flight limit
};
const SUIT_CO2: Source = {
  label: 'NASA NTRS — CO₂ washout in pressurized suits',
  url: 'https://ntrs.nasa.gov/api/citations/20120003917/downloads/20120003917.pdf',
  official: false,
};
const METABOLIC: Source = {
  label: 'NASA NTRS — real-time metabolic rate monitoring during EVA',
  url: 'https://ntrs.nasa.gov/api/citations/20140004412/downloads/20140004412.pdf',
  official: false,
};
const ORTHO: Source = {
  label: 'NASA — fluid loading and compression garments against fainting at landing',
  url: 'https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/',
  official: true,
};

export const SUIT_SIGNALS: Record<SuitSignalId, SuitSignalDef> = {
  heart_rate: { id: 'heart_rate', unit: 'bpm', direction: 'high', watchAt: 150, actAt: 170, nominal: 95, decimals: 0, risks: ['cardio', 'eva'], sensor: 'chest_ecg', sources: [SUITED_HR, SRC.cardio, proto('heart-rate bands')] },
  spo2: { id: 'spo2', unit: '%', direction: 'low', watchAt: 92, actAt: 88, nominal: 98, decimals: 0, risks: ['hypoxia'], sensor: 'pulse_ox', sources: [SRC.hypoxia, proto('same bands as the wrist band')] },
  skin_temp_delta: { id: 'skin_temp_delta', unit: '°C', direction: 'high', watchAt: 1, actAt: 1.8, nominal: 0.1, decimals: 1, risks: ['immune'], sensor: 'band', sources: [SRC.immune, proto('skin temperature vs your baseline')] },
  g_load: { id: 'g_load', unit: 'g', direction: 'high', watchAt: 4, actAt: 6, nominal: 3.2, decimals: 1, risks: ['cardio', 'sensorimotor'], sensor: 'accelerometer', sources: [SRC.cardio, proto('sustained g bands')] },
  metabolic_rate: { id: 'metabolic_rate', unit: 'kcal/h', direction: 'high', watchAt: 500, actAt: 700, nominal: 260, decimals: 0, risks: ['eva', 'fitness'], sensor: 'suit_telemetry', sources: [METABOLIC, SRC.eva, proto('metabolic-rate bands')] },
  suit_co2: { id: 'suit_co2', unit: 'mmHg', direction: 'high', watchAt: 8, actAt: 15, nominal: 3, decimals: 1, risks: ['eva', 'hypoxia'], sensor: 'suit_telemetry', sources: [SUIT_CO2, SRC.eva, proto('helmet CO₂ bands')] },
  suit_pressure: { id: 'suit_pressure', unit: 'psi', direction: 'low', watchAt: 4.0, actAt: 3.6, nominal: 4.3, decimals: 2, risks: ['eva', 'dcs', 'hypoxia'], sensor: 'suit_telemetry', sources: [EMU_PRESSURE, SRC.dcs, proto('pressure-drop bands')] },
  o2_remaining: { id: 'o2_remaining', unit: '%', direction: 'low', watchAt: 30, actAt: 15, nominal: 70, decimals: 0, risks: ['eva', 'hypoxia'], sensor: 'suit_telemetry', sources: [SRC.eva, proto('consumables reserve bands')] },
  core_temp: { id: 'core_temp', unit: '°C', direction: 'high', watchAt: 38, actAt: 38.6, nominal: 37.1, decimals: 1, risks: ['eva'], sensor: 'suit_telemetry', sources: [SRC.eva, proto('heat-strain bands')] },
  prebreathe_done: { id: 'prebreathe_done', unit: '', direction: 'yes_needed', badStatus: 'red', nominal: 1, decimals: 0, risks: ['dcs'], sensor: 'checklist', sources: [SRC.dcs] },
  dcs_symptoms: { id: 'dcs_symptoms', unit: '', direction: 'no_wanted', badStatus: 'red', nominal: 0, decimals: 0, risks: ['dcs'], sensor: 'self_report', sources: [SRC.dcs] },
  fluid_loading_done: { id: 'fluid_loading_done', unit: '', direction: 'yes_needed', badStatus: 'yellow', nominal: 1, decimals: 0, risks: ['cardio'], sensor: 'checklist', sources: [ORTHO] },
  compression_on: { id: 'compression_on', unit: '', direction: 'yes_needed', badStatus: 'yellow', nominal: 1, decimals: 0, risks: ['cardio'], sensor: 'checklist', sources: [ORTHO] },
  standing_hr_rise: { id: 'standing_hr_rise', unit: 'bpm', direction: 'high', watchAt: 30, actAt: 40, nominal: 14, decimals: 0, risks: ['cardio'], sensor: 'stand_test', sources: [ORTHO, proto('general clinical stand-test bands')] },
  systolic_drop: { id: 'systolic_drop', unit: 'mmHg', direction: 'high', watchAt: 20, actAt: 30, nominal: 6, decimals: 0, risks: ['cardio'], sensor: 'cuff', sources: [ORTHO, proto('general clinical orthostatic bands')] },
  dizziness: { id: 'dizziness', unit: 'of 5', direction: 'high', watchAt: 3, actAt: 4, nominal: 1, decimals: 0, risks: ['sensorimotor', 'cardio'], sensor: 'self_report', sources: [SRC.sensorimotor, proto('symptom scale bands')] },
  balance_passed: { id: 'balance_passed', unit: '', direction: 'yes_needed', badStatus: 'yellow', nominal: 1, decimals: 0, risks: ['sensorimotor'], sensor: 'stand_test', sources: [SRC.sensorimotor] },
};

/** Which signals each phase watches, in display order. */
export const PHASE_SIGNALS: Record<FlightPhase, SuitSignalId[]> = {
  launch: ['heart_rate', 'g_load', 'spo2', 'core_temp'],
  cruise: ['heart_rate', 'spo2', 'skin_temp_delta'],
  eva: ['prebreathe_done', 'heart_rate', 'metabolic_rate', 'suit_co2', 'suit_pressure', 'o2_remaining', 'core_temp', 'dcs_symptoms'],
  entry: ['fluid_loading_done', 'compression_on', 'g_load', 'heart_rate', 'core_temp'],
  post_landing: ['standing_hr_rise', 'systolic_drop', 'dizziness', 'balance_passed'],
};

/** Phase-specific resting values that differ from the generic nominal. */
const PHASE_NOMINAL: Partial<Record<FlightPhase, Partial<Record<SuitSignalId, number>>>> = {
  launch: { heart_rate: 105, g_load: 3.0, core_temp: 37.2 },
  cruise: { heart_rate: 64 },
  eva: { heart_rate: 112, core_temp: 37.3 },
  entry: { heart_rate: 98, g_load: 3.6, core_temp: 37.4 },
};

/**
 * The scripted story for each scenario: which signals go off and to what value.
 * 'watch' nudges one or two signals into the yellow band; 'act' puts the phase's
 * signature problem in the red.
 */
const SCRIPT: Record<FlightPhase, Record<Exclude<Scenario, 'nominal'>, Partial<Record<SuitSignalId, number>>>> = {
  launch: { watch: { heart_rate: 152, g_load: 4.3 }, act: { heart_rate: 172, spo2: 87, g_load: 4.6 } },
  cruise: { watch: { skin_temp_delta: 1.2, heart_rate: 88 }, act: { spo2: 87, heart_rate: 118 } },
  eva: { watch: { metabolic_rate: 540, suit_co2: 9.5, heart_rate: 151 }, act: { suit_co2: 16, heart_rate: 171, core_temp: 38.7 } },
  entry: { watch: { fluid_loading_done: 0, heart_rate: 120 }, act: { fluid_loading_done: 0, compression_on: 0, g_load: 6.3, heart_rate: 158 } },
  post_landing: { watch: { standing_hr_rise: 33, dizziness: 3 }, act: { standing_hr_rise: 44, systolic_drop: 32, dizziness: 4, balance_passed: 0 } },
};

/** mulberry32: tiny seeded PRNG, so the demo replays the same numbers. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

export interface SuitSample {
  id: SuitSignalId;
  value: number;
}

/** A simulated measurement. Same inputs, same numbers. `run` lets "measure again" vary a little. */
export function simulate(phase: FlightPhase, scenario: Scenario, run = 0): SuitSample[] {
  const rnd = seeded(hash(`${phase}|${scenario}|${run}`));
  const script = scenario === 'nominal' ? {} : SCRIPT[phase][scenario];
  return PHASE_SIGNALS[phase].map((id) => {
    const def = SUIT_SIGNALS[id];
    const base = script[id] ?? PHASE_NOMINAL[phase]?.[id] ?? def.nominal;
    if (def.direction === 'yes_needed' || def.direction === 'no_wanted') return { id, value: base };
    // Small jitter (±2 % of the value) that never crosses a band the script did not intend.
    const jitter = (rnd() - 0.5) * 0.04 * Math.abs(base || 1);
    let v = round(base + jitter, def.decimals);
    const intended = statusOf(def, base);
    if (statusOf(def, v) !== intended) v = round(base, def.decimals);
    return { id, value: v };
  });
}

export function statusOf(def: SuitSignalDef, value: number): Exclude<Status, 'stale'> {
  switch (def.direction) {
    case 'high':
      return def.actAt !== undefined && value >= def.actAt ? 'red' : def.watchAt !== undefined && value >= def.watchAt ? 'yellow' : 'green';
    case 'low':
      return def.actAt !== undefined && value <= def.actAt ? 'red' : def.watchAt !== undefined && value <= def.watchAt ? 'yellow' : 'green';
    case 'yes_needed':
      return value >= 1 ? 'green' : def.badStatus ?? 'yellow';
    case 'no_wanted':
      return value >= 1 ? def.badStatus ?? 'yellow' : 'green';
  }
}

/** The explanation trace for one signal: measured → compared to → therefore. */
export interface SuitEvaluation {
  id: SuitSignalId;
  value: number;
  unit: string;
  status: Exclude<Status, 'stale'>;
  /** Which band the value was compared against: 'act', 'watch' or 'ok'. */
  band: 'act' | 'watch' | 'ok';
  watchAt?: number;
  actAt?: number;
  direction: Direction;
  sensor: SuitSignalDef['sensor'];
  sources: Source[];
}

export function evaluateSuit(samples: SuitSample[]): SuitEvaluation[] {
  return samples.map(({ id, value }) => {
    const def = SUIT_SIGNALS[id];
    const status = statusOf(def, value);
    return {
      id, value, unit: def.unit, status, band: status === 'red' ? 'act' : status === 'yellow' ? 'watch' : 'ok',
      watchAt: def.watchAt, actAt: def.actAt, direction: def.direction, sensor: def.sensor, sources: def.sources,
    };
  });
}

/** One step to take now. `id` keys the copy in content/suit.json → steps. */
export interface SuitStep {
  id: string;
  /** Signals that made this step appear, so the UI can say "because …". */
  because: SuitSignalId[];
  urgent: boolean;
  sources: Source[];
}

export interface SuitVerdict {
  status: Exclude<Status, 'stale'>;
  /** true → tell a crewmate now and send it in the flight surgeon brief. */
  escalate: boolean;
  /** Keys content/suit.json → verdicts.<phase>.<status>. */
  headlineKey: string;
  steps: SuitStep[];
}

const RANK = { green: 0, yellow: 1, red: 2 } as const;

/**
 * Deterministic advice. Order: the phase's safety-critical step first (end EVA, oxygen),
 * then the specific fixes, then "tell someone". Never more than five steps.
 */
export function adviseSuit(phase: FlightPhase, evals: SuitEvaluation[]): SuitVerdict {
  const st = (id: SuitSignalId) => evals.find((e) => e.id === id)?.status ?? 'green';
  const bad = (id: SuitSignalId) => st(id) !== 'green';
  const red = (id: SuitSignalId) => st(id) === 'red';
  const worst = evals.reduce<Exclude<Status, 'stale'>>((w, e) => (RANK[e.status] > RANK[w] ? e.status : w), 'green');
  const steps: SuitStep[] = [];
  const add = (id: string, because: SuitSignalId[], urgent: boolean, sources: Source[]) => {
    if (!steps.some((s) => s.id === id)) steps.push({ id, because, urgent, sources });
  };

  if (bad('spo2')) add('oxygen', ['spo2'], red('spo2'), [SRC.hypoxia]);

  if (phase === 'eva') {
    if (red('prebreathe_done')) add('no_egress', ['prebreathe_done'], true, [SRC.dcs]);
    if (red('dcs_symptoms') || red('suit_pressure')) add('end_eva_repress', ['dcs_symptoms', 'suit_pressure'].filter((i) => bad(i as SuitSignalId)) as SuitSignalId[], true, [SRC.dcs]);
    const heat = ['suit_co2', 'heart_rate', 'core_temp', 'metabolic_rate'].filter((i) => red(i as SuitSignalId)) as SuitSignalId[];
    if (heat.length) add('end_eva_return', heat, true, [SRC.eva]);
    if (bad('suit_co2')) add('co2_slow_down', ['suit_co2'], red('suit_co2'), [SUIT_CO2]);
    if (bad('heart_rate') || bad('metabolic_rate')) add('pace', ['heart_rate', 'metabolic_rate'].filter((i) => bad(i as SuitSignalId)) as SuitSignalId[], false, [METABOLIC]);
    if (bad('core_temp')) add('cooling_up', ['core_temp'], red('core_temp'), [SRC.eva]);
    if (bad('o2_remaining')) add('consumables', ['o2_remaining'], red('o2_remaining'), [SRC.eva]);
  }

  if (phase === 'launch') {
    if (bad('g_load')) add('g_strain', ['g_load'], red('g_load'), [SRC.cardio]);
    if (bad('heart_rate')) add('breathe_report', ['heart_rate'], red('heart_rate'), [SRC.cardio]);
    if (bad('core_temp')) add('suit_cooling', ['core_temp'], red('core_temp'), [SRC.eva]);
  }

  if (phase === 'entry') {
    if (bad('fluid_loading_done')) add('fluid_load', ['fluid_loading_done'], false, [ORTHO]);
    if (bad('compression_on')) add('compression', ['compression_on'], false, [ORTHO]);
    if (bad('g_load') || bad('heart_rate')) add('g_strain', ['g_load', 'heart_rate'].filter((i) => bad(i as SuitSignalId)) as SuitSignalId[], red('g_load'), [SRC.cardio]);
    if (bad('core_temp')) add('suit_cooling', ['core_temp'], red('core_temp'), [ORTHO]);
  }

  if (phase === 'post_landing') {
    const ortho = (['standing_hr_rise', 'systolic_drop', 'dizziness'] as SuitSignalId[]).filter(bad);
    if (ortho.some(red)) add('lie_down', ortho, true, [ORTHO]);
    if (ortho.length) add('fluids_compression', ortho, false, [ORTHO]);
    if (bad('balance_passed') || ortho.length) add('no_critical_tasks', (['balance_passed', ...ortho] as SuitSignalId[]).filter(bad), false, [SRC.sensorimotor]);
  }

  if (phase === 'cruise') {
    if (bad('heart_rate')) add('use_band_protocol', ['heart_rate'], red('heart_rate'), [SRC.cardio]);
    if (bad('skin_temp_delta')) add('fever_check', ['skin_temp_delta'], red('skin_temp_delta'), [SRC.immune]);
  }

  const escalate = worst === 'red';
  if (escalate) add('tell_crew', evals.filter((e) => e.status === 'red').map((e) => e.id), true, [SRC.risks]);
  if (worst === 'green') add(`keep_going_${phase}`, [], false, [SRC.risks]);

  // Urgent first, stable otherwise.
  const ordered = [...steps.filter((s) => s.urgent), ...steps.filter((s) => !s.urgent)].slice(0, 5);
  return { status: worst, escalate, headlineKey: `${phase}.${worst}`, steps: ordered };
}
