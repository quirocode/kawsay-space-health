/**
 * Watch rules: what a wrist watch can catch on its own, while nobody is looking at the app.
 * Every rule is tied to an activity context: 130 bpm on the bike is normal, 130 bpm after
 * twenty minutes at rest is not. Pure and deterministic.
 *
 * All cut-offs here are PROTOTYPE values (general adult references, not NASA figures).
 * The NASA sources say which official risk each rule belongs to, not where the line is.
 */
import { SRC } from './indicators';
import { fmt } from './evaluate';
import { lastNDaysAvg, latest } from './rules';
import type { AlertLevel, Finding, MissionContext, ProtocolStep, Reading, Source, WatchAlert, WatchEngine, WatchSample } from './types';

const P = SRC.prototype;

/** Prototype cut-offs. `forSec` = how long the condition must hold without a break. */
export const WATCH_PARAMS = {
  restingTachy: { caution: { bpm: 110, forSec: 60 }, warning: { bpm: 110, forSec: 300 }, emergency: { bpm: 130, forSec: 120 } },
  restingBrady: { bpm: 40, forSec: 300 },
  lowSpo2: { warning: { pct: 92, forSec: 180 }, emergency: { pct: 88, forSec: 60 } },
  staleAfterSec: 300,
} as const;

const LEVEL_ORDER: Record<AlertLevel, number> = { emergency: 0, warning: 1, caution: 2 };

/**
 * How many seconds, counting back from the newest sample, `ok` has held without a break.
 * Samples with unusable quality break the run: missing data never counts as evidence.
 */
export function heldForSec(window: WatchSample[], ok: (s: WatchSample) => boolean): number {
  if (window.length === 0) return 0;
  const end = window[window.length - 1].ts;
  let start = end;
  for (let i = window.length - 1; i >= 0; i--) {
    const s = window[i];
    if (s.quality === 'off_wrist' || !ok(s)) break;
    start = s.ts;
  }
  const newest = window[window.length - 1];
  return newest.quality !== 'off_wrist' && ok(newest) ? (end - start) / 1000 : 0;
}

const atRest = (s: WatchSample) => s.activity === 'rest';

function restingTachycardia(window: WatchSample[]): WatchAlert | null {
  const now = window[window.length - 1];
  const p = WATCH_PARAMS.restingTachy;
  const over = (bpm: number) => heldForSec(window, (s) => atRest(s) && s.heartRate >= bpm);
  const level: AlertLevel | null =
    over(p.emergency.bpm) >= p.emergency.forSec ? 'emergency'
    : over(p.warning.bpm) >= p.warning.forSec ? 'warning'
    : over(p.caution.bpm) >= p.caution.forSec ? 'caution'
    : null;
  if (!level) return null;
  const bpm = level === 'emergency' ? p.emergency.bpm : p.warning.bpm;
  const minutes = Math.max(1, Math.floor(over(bpm) / 60));
  return {
    ruleId: 'resting_tachycardia', level,
    title: level === 'caution' ? 'Your heart rate is rising while you rest' : 'Heart rate high while resting',
    detectedTs: now.ts, activity: now.activity, signal: 'heartRate', value: now.heartRate,
    because: [`Heart rate ${fmt(now.heartRate)} bpm while resting.`, `At or above ${bpm} for ${minutes} min.`],
    firstStep: 'Stop what you are doing. Hold on to a handrail.',
    recheckInMin: 10,
    zones: ['heart'], risks: ['cardio'], hazards: ['gravity'], sources: [SRC.cardio, P],
  };
}

function restingBradycardia(window: WatchSample[]): WatchAlert | null {
  const now = window[window.length - 1];
  const p = WATCH_PARAMS.restingBrady;
  if (heldForSec(window, (s) => atRest(s) && s.heartRate < p.bpm) < p.forSec) return null;
  return {
    ruleId: 'resting_bradycardia', level: 'warning', title: 'Heart rate very low',
    detectedTs: now.ts, activity: now.activity, signal: 'heartRate', value: now.heartRate,
    because: [`Heart rate ${fmt(now.heartRate)} bpm while awake and resting.`, `Below ${p.bpm} for ${p.forSec / 60} min.`],
    firstStep: 'Stay still and call a crewmate.',
    recheckInMin: 10,
    zones: ['heart'], risks: ['cardio'], hazards: ['gravity'], sources: [SRC.cardio, P],
  };
}

function lowSpo2(window: WatchSample[]): WatchAlert | null {
  const now = window[window.length - 1];
  const p = WATCH_PARAMS.lowSpo2;
  const under = (pct: number) => heldForSec(window, (s) => s.spo2 < pct);
  const level: AlertLevel | null = under(p.emergency.pct) >= p.emergency.forSec ? 'emergency' : under(p.warning.pct) >= p.warning.forSec ? 'warning' : null;
  if (!level) return null;
  const pct = level === 'emergency' ? p.emergency.pct : p.warning.pct;
  return {
    ruleId: 'low_spo2', level, title: 'Blood oxygen is low',
    detectedTs: now.ts, activity: now.activity, signal: 'spo2', value: now.spo2,
    because: [`Blood oxygen ${fmt(now.spo2)} %.`, `Below ${pct} % for ${Math.max(1, Math.floor(under(pct) / 60))} min.`],
    firstStep: 'Check the cabin air reading. Put on the oxygen mask if it is low too.',
    recheckInMin: 5,
    zones: ['lungs', 'brain'], risks: ['hypoxia'], hazards: ['environment'], sources: [SRC.hypoxia, P],
  };
}

function watchStale(window: WatchSample[], nowTs: number): WatchAlert | null {
  const lastGood = [...window].reverse().find((s) => s.quality !== 'off_wrist');
  const silentSec = lastGood ? (nowTs - lastGood.ts) / 1000 : Infinity;
  if (silentSec < WATCH_PARAMS.staleAfterSec) return null;
  const now = window[window.length - 1];
  return {
    ruleId: 'watch_stale', level: 'caution', title: 'No data from your watch',
    detectedTs: now?.ts ?? nowTs, activity: now?.activity ?? 'rest', signal: 'quality', value: 0,
    because: [Number.isFinite(silentSec) ? `No usable reading for ${Math.floor(silentSec / 60)} min.` : 'No reading yet.'],
    firstStep: 'Check the strap, then the battery.',
    recheckInMin: 5,
    zones: [], risks: [], hazards: [], sources: [P],
  };
}

/** A window of samples (oldest first) in, alerts out, most severe first. */
export function detect(window: WatchSample[], _ctx: MissionContext, nowTs: number): WatchAlert[] {
  const stale = watchStale(window, nowTs);
  if (stale) return [stale]; // with no data there is nothing else we can honestly say
  const found = [restingTachycardia(window), restingBradycardia(window), lowSpo2(window)].filter((a): a is WatchAlert => a !== null);
  return found.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}

const SYMPTOMS: ProtocolStep = {
  id: 'symptoms', kind: 'question',
  title: 'Do you have any of these right now?',
  detail: 'Choose all that apply.',
  options: [
    { id: 'chest_pain', label: 'Chest pain or pressure', escalate: true },
    { id: 'breathless', label: 'Trouble breathing', escalate: true },
    { id: 'faint', label: 'Dizzy or about to faint', escalate: true },
    { id: 'pounding', label: 'Heart pounding or skipping', escalate: false },
    { id: 'none', label: 'None of these', escalate: false },
  ],
};

export function protocol(alert: WatchAlert): ProtocolStep[] {
  switch (alert.ruleId) {
    case 'resting_tachycardia':
    case 'resting_bradycardia':
      return [
        SYMPTOMS,
        { id: 'bp', kind: 'measure', title: 'Measure your blood pressure', detail: 'Sit still for one minute · Cuff on the upper arm, at heart level · Press start', indicatorIds: ['bp_systolic', 'bp_diastolic'] },
        { id: 'breathe', kind: 'timer', title: 'Breathe slowly for 2 minutes', detail: 'In for 4 seconds, out for 6. Keep the watch on.', durationSec: 120 },
        { id: 'water', kind: 'action', title: 'Drink 250 ml of water', detail: 'Small sips. Stay where you are.', logs: { indicatorId: 'water_ml', add: 250 } },
      ];
    case 'low_spo2':
      return [
        SYMPTOMS,
        { id: 'mask', kind: 'action', title: 'Put on the oxygen mask', detail: 'Check the cabin air reading on the way. Tell a crewmate.' },
        { id: 'breathe', kind: 'timer', title: 'Sit upright and breathe steadily for 2 minutes', detail: 'Keep the watch on so we can see the change.', durationSec: 120 },
      ];
    default:
      return [{ id: 'strap', kind: 'action', title: 'Check the strap, then the battery', detail: 'Snug, one finger above the wrist bone.' }];
  }
}

/** Likely contributors, crossing the alert with the manual readings: explainable, never a diagnosis. */
export function likely(alert: WatchAlert, readings: Reading[], sample: WatchSample, ctx: MissionContext): { headline: string; reasons: { text: string; source: Source }[] } {
  const reasons: { text: string; source: Source }[] = [];
  const causes: string[] = [];
  const todays = readings.filter((r) => r.missionDay === ctx.missionDay && r.indicatorId === 'water_ml');
  const waterToday = todays.length ? Math.max(...todays.map((r) => r.value)) : undefined;
  const water3 = lastNDaysAvg(readings, 'water_ml', 3, ctx);
  const sleep3 = lastNDaysAvg(readings, 'sleep_hours', 3, ctx);
  const co2 = latest(readings, 'cabin_co2')?.value;

  const water = waterToday ?? water3;
  if (water !== undefined && water < 2000) {
    causes.push('dehydration');
    reasons.push({ text: `Low water ${waterToday !== undefined ? 'today' : 'over 3 days'}: ${fmt(water / 1000)} L of 2.5 L.`, source: P });
  }
  if (sleep3 !== undefined && sleep3 < 6) {
    causes.push('fatigue');
    reasons.push({ text: `Short sleep: ${fmt(sleep3)} h average over 3 nights.`, source: SRC.sleep });
  }
  if (sample.spo2 < 92 || (co2 !== undefined && co2 >= 3)) {
    causes.unshift('low oxygen');
    reasons.unshift({ text: sample.spo2 < 92 ? `Blood oxygen ${fmt(sample.spo2)} %.` : `Cabin CO₂ ${fmt(co2!)} mmHg — NASA limit is 3 mmHg.`, source: sample.spo2 < 92 ? SRC.hypoxia : SRC.co2 });
  }
  if (sample.skinTempDelta >= 1.5) {
    causes.unshift('fever');
    reasons.unshift({ text: `Skin temperature ${fmt(sample.skinTempDelta)} °C above your usual.`, source: SRC.immune });
  }
  if (alert.signal === 'heartRate' && sample.spo2 >= 92 && sample.skinTempDelta < 1.5) {
    reasons.push({ text: 'No fever, oxygen normal.', source: P });
  }
  const headline = causes.length ? `Likely: ${causes.join(' and ')}.` : 'No clear cause yet. That is why we check step by step.';
  return { headline, reasons };
}

/** A watch alert as a Finding, so it travels in the flight surgeon brief like any other. */
export function toFinding(alert: WatchAlert): Finding {
  const indicator = alert.signal === 'spo2' ? 'spo2' : 'heart_rate';
  return {
    ruleId: `watch.${alert.ruleId}`,
    title: alert.title,
    status: alert.level === 'caution' ? 'yellow' : 'red',
    because: alert.because,
    risks: alert.risks, hazards: alert.hazards, zones: alert.zones,
    actions: [{ id: `watch.${alert.ruleId}.primary`, text: alert.firstStep, recheckIndicatorId: indicator, recheckInMin: alert.recheckInMin, escalate: alert.level === 'emergency' }],
    sources: alert.sources,
  };
}

export const watchEngine: WatchEngine = { detect, protocol, likely, toFinding };
