import { describe, expect, it } from 'vitest';
import { getIndicator, INDICATORS } from '../../domain/indicators';
import { evaluate } from '../../domain/evaluate';
import { findCompound } from '../../domain/rules';
import type { MissionContext, Reading, WatchAlert } from '../../domain/types';
import { bandDirection, explainAlert, explainEvaluation, explainFinding, usualRange, whyToText, WHY_COPY } from './explain';
import { tr } from '../i18n';

const DAY = 86_400_000;
const ctx: MissionContext = { environment: 'mars_transit', phase: 'cruise', missionDay: 142, arrivalDay: 180, commDelayMin: 14 };
const levelNames = { green: 'OK', yellow: 'Watch', red: 'Act', stale: 'Old data' };
const id = (s: string) => s;

const at = (day: number, h = 8) => day * DAY + h * 3_600_000;
const reading = (indicatorId: string, value: number, day: number, h = 8): Reading =>
  ({ indicatorId, value, ts: at(day, h), missionDay: day, phase: 'cruise', origin: 'manual' });

/** Seven ordinary days of systolic pressure around 118, then today's value. */
function bpHistory(today: number): Reading[] {
  const past = [116, 118, 120, 117, 119, 121, 118].map((v, i) => reading('bp_systolic', v, 135 + i));
  return [...past, reading('bp_systolic', today, 142)];
}

function explainBp(today: number, lang: 'en' | 'es' = 'en') {
  const readings = bpHistory(today);
  const def = getIndicator('bp_systolic')!;
  const nowTs = at(142, 12);
  const evaluation = evaluate([def], readings, [], ctx, nowTs)[0];
  return explainEvaluation({
    def, evaluation, reading: readings[readings.length - 1], readings, findings: [], nowTs, lang,
    levelNames, translate: lang === 'es' ? (t) => tr(t, 'es') : id,
  });
}

describe('bandDirection', () => {
  it('reads open bands and closed bands next to a red band', () => {
    const bp = getIndicator('bp_systolic')!;
    const [, , high, low] = bp.thresholds;
    expect(bandDirection(bp, high)).toBe('high'); // 140–159
    expect(bandDirection(bp, low)).toBe('low'); // 85–94
    const sleep = getIndicator('sleep_hours')!;
    expect(bandDirection(sleep, sleep.thresholds[1])).toBe('low'); // 4 to 6 h
  });

  it('gives every numeric band of the catalog a direction that has copy', () => {
    for (const def of INDICATORS.filter((d) => d.input !== 'boolean')) {
      for (const band of def.thresholds.filter((t) => t.min !== undefined || t.max !== undefined)) {
        const dir = bandDirection(def, band);
        const copy = (WHY_COPY.en.indicators as Record<string, Record<string, unknown>>)[def.id]?.[dir];
        expect(copy, `${def.id} ${band.label} → ${dir}`).toBeDefined();
      }
    }
  });
});

describe('usualRange', () => {
  it('uses the latest reading of each of the 7 days before today', () => {
    expect(usualRange(bpHistory(200), 'bp_systolic', 142)).toEqual({ low: 116, high: 121, mean: 829 / 7, days: 7 });
  });
  it('needs at least 3 days', () => {
    expect(usualRange([reading('bp_systolic', 120, 141)], 'bp_systolic', 142)).toBeNull();
  });
});

describe('explainEvaluation', () => {
  it('explains a 200 mmHg reading instead of listing sources', () => {
    const why = explainBp(200);
    expect(why.status).toBe('red');
    expect(why.meaning).toMatch(/above the safe range/);
    expect(why.yourCase).toEqual([
      'Your reading: 200 mmHg.',
      '“Act” range: 160 or more (prototype value).',
      'Your usual: 116–121 mmHg over the last 7 days.',
      'That is a sudden change from your usual. Measure again to rule out a measuring error.',
    ]);
    expect(why.doNow).toMatch(/measure again/);
    expect(why.recheck).toBe('Measure again in 5 minutes.');
    expect(why.escalate).toMatch(/crew medical officer/);
    expect(why.sources.length).toBeGreaterThan(0);
  });

  it('says a value is steady when it matches the recent days', () => {
    const readings = [140, 142, 141, 143].map((v, i) => reading('bp_systolic', v, 138 + i));
    const def = getIndicator('bp_systolic')!;
    const nowTs = at(141, 9);
    const evaluation = evaluate([def], readings, [], ctx, nowTs)[0];
    const why = explainEvaluation({ def, evaluation, reading: readings[3], readings, findings: [], nowTs, lang: 'en', levelNames, translate: id });
    expect(why.status).toBe('yellow');
    expect(why.yourCase).toContain('This is in line with your recent days, but it is still outside the safe range.');
    expect(why.escalate).toBeUndefined();
  });

  it('explains low values with the low copy', () => {
    const why = explainBp(80);
    expect(why.meaning).toMatch(/blood pressure is low/);
  });

  it('never shows stale data as OK', () => {
    const def = getIndicator('glucose')!;
    const old = reading('glucose', 92, 138);
    const nowTs = at(142, 12);
    const evaluation = evaluate([def], [old], [], ctx, nowTs)[0];
    const why = explainEvaluation({ def, evaluation, reading: old, readings: [old], findings: [], nowTs, lang: 'en', levelNames, translate: id });
    expect(why.status).toBe('stale');
    expect(why.meaning).toMatch(/never shown as OK/);
    expect(why.yourCase).toEqual(['Last reading: 4 days ago.']);
  });

  it('explains reported symptoms and links them to their finding', () => {
    const readings = [reading('headache_score', 4, 142), reading('symptom_confusion', 1, 142), reading('spo2', 89, 142)];
    const def = getIndicator('symptom_confusion')!;
    const nowTs = at(142, 9);
    const evaluation = evaluate([def], readings, [], ctx, nowTs)[0];
    const findings = findCompound(readings, ctx, nowTs);
    const why = explainEvaluation({ def, evaluation, reading: readings[1], readings, findings, nowTs, lang: 'en', levelNames, translate: id });
    expect(why.meaning).toMatch(/You feel confused/);
    expect(why.yourCase).toContain('It is also part of: Low oxygen with symptoms.');
    expect(why.escalate).toBeDefined();
  });

  it('speaks Spanish with Spanish decimals', () => {
    const why = explainBp(200, 'es');
    expect(why.meaning).toMatch(/Tu presión está por encima/);
    expect(why.yourCase[1]).toBe('Rango «Act»: 160 o más (valor de prototipo).');
    expect(why.recheck).toBe('Mide otra vez en 5 minutos.');
  });
});

describe('explainFinding and explainAlert', () => {
  it('adds why the readings matter together', () => {
    const readings = [140, 141, 142].flatMap((d) => [reading('water_ml', 1500, d)]);
    const [finding] = findCompound(readings, ctx, at(142, 12));
    const why = explainFinding(finding, 'en', id);
    expect(why.meaning).toMatch(/kidney stones/);
    expect(why.yourCase[0]).toMatch(/calcium into the urine/);
    expect(why.doNow).toBe(finding.actions[0].text);
    expect(why.recheck).toBe("In tomorrow's daily check.");
  });

  it('explains a watch alert in plain words', () => {
    const alert: WatchAlert = {
      ruleId: 'resting_tachycardia', level: 'emergency', title: 'Heart rate high while resting', detectedTs: 0,
      activity: 'rest', signal: 'heartRate', value: 135, because: ['Heart rate 135 bpm while resting.', 'At or above 130 for 2 min.'],
      firstStep: 'Stop what you are doing. Hold on to a handrail.', recheckInMin: 10,
      zones: ['heart'], risks: ['cardio'], hazards: ['gravity'], sources: [],
    };
    const why = explainAlert(alert, 'en', id);
    expect(why.meaning).toMatch(/beating fast while you rest/);
    expect(why.escalate).toMatch(/brief for the flight surgeon/);
    expect(whyToText(why, 'en')).toContain('Do this now: Stop what you are doing.');
  });
});
