/**
 * "Why?" explanations (P1). Turns what the rules engine already decided into plain words:
 * what it means, why in your case, what to do now, and when we check again.
 *
 * Pure and deterministic: no clock, no network, no model. It never decides a status; it only
 * explains the Evaluation, Finding or WatchAlert it receives. Copy lives in content/why.json.
 * This is the rules-based text that the optional local AI may rephrase (src/app/ai/).
 */
import whyCopy from '../../../content/why.json';
import { statusOf } from '../../domain/evaluate';
import type { Evaluation, Finding, IndicatorDef, Reading, Source, Status, Threshold, WatchAlert } from '../../domain/types';
import { ago, dec, fill, type Lang } from '../format';

export type WhyCopy = typeof whyCopy.en;
export const WHY_COPY: Record<Lang, WhyCopy> = { en: whyCopy.en, es: whyCopy.es as WhyCopy };

export interface Why {
  status: Status;
  meaning: string;
  yourCase: string[];
  doNow?: string;
  recheck?: string;
  escalate?: string;
  sources: Source[];
}

/** Translates engine sentences (i18n.tr); identity in English. */
export type Translate = (text: string) => string;

export type Direction = 'high' | 'low' | 'reported';

type IndicatorCopy = Partial<Record<Direction, { meaning: string; red?: string; yellow?: string; doNow?: string }>>;

/**
 * When to measure again after a Watch/Act reading, in minutes. PROTOTYPE values, kept short
 * for vital signs. 'next' = tomorrow's daily check, 'week' = next weekly test.
 */
export const RECHECK: Record<string, { red: number | 'next' | 'week'; yellow: number | 'next' | 'week' }> = {
  bp_systolic: { red: 5, yellow: 60 },
  bp_diastolic: { red: 5, yellow: 60 },
  heart_rate: { red: 5, yellow: 10 },
  glucose: { red: 15, yellow: 'next' },
  body_temp: { red: 60, yellow: 120 },
  spo2: { red: 5, yellow: 5 },
  cabin_co2: { red: 30, yellow: 60 },
  headache_score: { red: 30, yellow: 30 },
  symptom_dizziness: { red: 10, yellow: 10 },
  symptom_vision: { red: 60, yellow: 60 },
  symptom_confusion: { red: 10, yellow: 10 },
  symptom_joint_pain: { red: 30, yellow: 30 },
  symptom_skin: { red: 'next', yellow: 'next' },
  sleep_hours: { red: 'next', yellow: 'next' },
  mood: { red: 'next', yellow: 'next' },
  exercise_min: { red: 'next', yellow: 'next' },
  water_ml: { red: 'next', yellow: 'next' },
  strength_self_pct: { red: 'week', yellow: 'week' },
};

/** Which compound rule looks at which indicators, so a reading can point to its finding. */
const RULE_INDICATORS: Record<string, string[]> = {
  co2_headache: ['headache_score', 'cabin_co2', 'sleep_hours', 'symptom_confusion'],
  hypoxia_signs: ['spo2', 'headache_score', 'symptom_confusion', 'symptom_vision'],
  dcs_eva: ['symptom_joint_pain'],
  kidney_stone: ['water_ml'],
  orthostatic_landing: ['symptom_dizziness', 'exercise_min', 'water_ml'],
  sleep_mood: ['sleep_hours', 'mood'],
};

const USUAL_DAYS = 7;

/**
 * Is a threshold band about a value that is too high or too low? A band open on one side says
 * so itself; a closed band (e.g. 140–159) belongs to the red band it touches.
 */
export function bandDirection(def: IndicatorDef, band: Threshold): Exclude<Direction, 'reported'> {
  if (band.min !== undefined && band.max === undefined) return 'high';
  if (band.max !== undefined && band.min === undefined) return 'low';
  const highRed = def.thresholds.find((t) => t.status === 'red' && t.min !== undefined && t.max === undefined)?.min;
  const lowRed = def.thresholds.find((t) => t.status === 'red' && t.max !== undefined && t.min === undefined)?.max;
  const toHigh = highRed === undefined || band.max === undefined ? Infinity : Math.abs(highRed - band.max);
  const toLow = lowRed === undefined || band.min === undefined ? Infinity : Math.abs(band.min - lowRed);
  return toLow < toHigh ? 'low' : 'high';
}

/** Latest reading per mission day, for the days before `day` (at most USUAL_DAYS of them). */
export function usualRange(readings: Reading[], indicatorId: string, day: number): { low: number; high: number; mean: number; days: number } | null {
  const perDay = new Map<number, Reading>();
  for (const r of readings) {
    if (r.indicatorId !== indicatorId || r.missionDay >= day || r.missionDay < day - USUAL_DAYS) continue;
    const cur = perDay.get(r.missionDay);
    if (!cur || r.ts > cur.ts) perDay.set(r.missionDay, r);
  }
  if (perDay.size < 3) return null;
  const values = [...perDay.values()].map((r) => r.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  return { low, high, mean: values.reduce((a, b) => a + b, 0) / values.length, days: perDay.size };
}

function round(v: number): number {
  return Math.round(v * 10) / 10;
}

function valueText(def: IndicatorDef, value: number, lang: Lang): string {
  if (def.input === 'scale_1_5') return `${dec(round(value), lang)}/5`;
  return `${dec(round(value), lang)} ${def.unit}`;
}

function recheckText(c: WhyCopy, when: number | 'next' | 'week'): string {
  if (when === 'next') return c.recheck.nextCheck;
  if (when === 'week') return c.recheck.nextWeek;
  return when >= 120 ? fill(c.recheck.hours, { n: Math.round(when / 60) }) : fill(c.recheck.minutes, { n: when });
}

function dedupe(sources: Source[]): Source[] {
  const seen = new Set<string>();
  return sources.filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true)));
}

export interface EvaluationInput {
  def: IndicatorDef;
  evaluation: Evaluation;
  /** The latest reading behind the evaluation, if any. */
  reading?: Reading;
  /** The value the rules judged when it is not the raw reading (cabin CO₂: 1-hour average). */
  value?: number | null;
  /** All readings, for "your usual". */
  readings: Reading[];
  findings: Finding[];
  nowTs: number;
  lang: Lang;
  /** Status names shown on the badges ("Watch", "Act"). */
  levelNames: Record<Status, string>;
  translate: Translate;
}

/** Explain one indicator's evaluation in plain words. */
export function explainEvaluation(input: EvaluationInput): Why {
  const { def, evaluation: e, reading, readings, findings, nowTs, lang, levelNames, translate } = input;
  const c = WHY_COPY[lang];
  const name = translate(def.name);
  const sources = dedupe(e.sources);

  if (e.status === 'stale' || !reading) {
    const yourCase = [reading ? fill(c.facts.stale, { age: ago(nowTs - reading.ts, lang) }) : c.facts.never];
    return { status: 'stale', meaning: c.generic.stale.meaning, yourCase, doNow: c.generic.stale.doNow, sources };
  }

  const value = input.value ?? reading.value;
  const yourCase: string[] = [];
  if (def.input === 'number' || def.input === 'test' || def.input === 'scale_1_5') {
    // No age here: the row shows it, and the text must stay the same from one second to the next.
    yourCase.push(fill(c.facts.readingNoAge, { value: valueText(def, value, lang) }));
  }

  if (e.status === 'green') {
    addUsual(yourCase, c, def, value, readings, reading.missionDay, lang, false);
    return { status: 'green', meaning: fill(c.generic.green.meaning, { name }), yourCase, doNow: c.generic.green.doNow, recheck: c.recheck.none, sources };
  }

  // The rules already decided red or yellow; find the band they used, to explain it.
  const hit = statusOf(def, value);
  const band = def.thresholds.find((t) => t.status === hit.status && t.label === hit.label);
  const level = e.status; // 'red' | 'yellow'

  if (!band) {
    // Only the personal-baseline band fired: unusual for this person.
    yourCase.push(c.facts.unusual);
    return { status: level, meaning: c.generic.unusual.meaning, yourCase, doNow: c.generic.unusual.doNow, recheck: recheckText(c, RECHECK[def.id]?.[level] ?? 'next'), sources };
  }

  const direction: Direction = def.input === 'boolean' ? 'reported' : bandDirection(def, band);
  const copy = (c.indicators as Record<string, IndicatorCopy>)[def.id]?.[direction];

  if (def.input !== 'boolean') {
    yourCase.push(fill(c.facts.band, {
      level: levelNames[level],
      band: translate(band.label),
      kind: band.source.official ? c.facts.kindNasa : c.facts.kindPrototype,
    }));
    addUsual(yourCase, c, def, value, readings, reading.missionDay, lang, true);
  }
  for (const f of findings) {
    if (RULE_INDICATORS[f.ruleId]?.includes(def.id)) yourCase.push(fill(c.facts.partOf, { title: translate(f.title) }));
  }

  const doNow = copy?.doNow ?? copy?.[level] ?? c.generic.stale.doNow;
  const when = RECHECK[def.id]?.[level] ?? 'next';
  const urgent = level === 'red' || direction === 'reported';
  return {
    status: level,
    meaning: copy?.meaning ?? translate(e.reason),
    yourCase,
    doNow,
    recheck: recheckText(c, when),
    escalate: urgent ? c.recheck.escalate : undefined,
    sources,
  };
}

function addUsual(out: string[], c: WhyCopy, def: IndicatorDef, value: number, readings: Reading[], day: number, lang: Lang, flagged: boolean) {
  if (def.input !== 'number' && def.input !== 'test') return;
  const usual = usualRange(readings, def.id, day);
  if (!usual) {
    if (flagged) out.push(c.facts.noUsual);
    return;
  }
  const unit = def.unit;
  out.push(usual.low === usual.high
    ? fill(c.facts.usualPoint, { value: dec(round(usual.low), lang), unit, days: usual.days })
    : fill(c.facts.usual, { low: dec(round(usual.low), lang), high: dec(round(usual.high), lang), unit, days: usual.days }));
  if (!flagged) return;
  const spread = Math.max(usual.high - usual.low, Math.abs(usual.mean) * 0.05);
  const sudden = value > usual.high + spread || value < usual.low - spread;
  out.push(sudden ? c.facts.sudden : c.facts.steady);
}

/**
 * Explain a compound finding: what it means and why these readings matter together.
 * `withBecause` = false when the screen already lists the readings that triggered it.
 */
export function explainFinding(finding: Finding, lang: Lang, translate: Translate, withBecause = true): Why {
  const c = WHY_COPY[lang];
  const copy = (c.findings as Record<string, { meaning: string; together: string }>)[finding.ruleId];
  const action = finding.actions[0];
  const when = action?.recheckInMin;
  return {
    status: finding.status,
    meaning: copy?.meaning ?? translate(finding.title),
    yourCase: [...(copy ? [copy.together] : []), ...(withBecause ? finding.because.map(translate) : [])],
    doNow: action ? translate(action.text) : undefined,
    recheck: when === undefined ? undefined : when >= 1440 ? c.recheck.nextCheck : recheckText(c, when),
    escalate: action?.escalate ? c.recheck.escalateNow : finding.status === 'red' ? c.recheck.escalate : undefined,
    sources: dedupe(finding.sources),
  };
}

/** Explain a watch alert. The alarm screen shows the first step itself, so doNow is optional there. */
export function explainAlert(alert: WatchAlert, lang: Lang, translate: Translate): Why {
  const c = WHY_COPY[lang];
  const meaning = (c.alerts as Record<string, string>)[alert.ruleId] ?? translate(alert.title);
  return {
    status: alert.level === 'caution' ? 'yellow' : 'red',
    meaning,
    yourCase: alert.because.map(translate),
    doNow: translate(alert.firstStep),
    recheck: recheckText(c, alert.recheckInMin),
    escalate: alert.level === 'emergency' ? c.recheck.escalateNow : c.recheck.escalate,
    sources: dedupe(alert.sources),
  };
}

/** The whole explanation as plain text: for reading aloud and as the local AI's only input. */
export function whyToText(why: Why, lang: Lang): string {
  const l = WHY_COPY[lang].labels;
  const parts = [`${l.meaning}: ${why.meaning}`];
  if (why.yourCase.length) parts.push(`${l.yourCase}: ${why.yourCase.join(' ')}`);
  if (why.doNow) parts.push(`${l.doNow}: ${why.doNow}`);
  const check = [why.recheck, why.escalate].filter(Boolean).join(' ');
  if (check) parts.push(`${l.recheck}: ${check}`);
  return parts.join('\n');
}
