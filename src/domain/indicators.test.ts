// src/domain/indicators.test.ts
import { describe, expect, it } from 'vitest';
import { BODY_ZONES } from './types';
import { INDICATORS, INDICATOR_IDS, getIndicator } from './indicators';

const EXPECTED = [
  'bp_systolic', 'bp_diastolic', 'heart_rate', 'glucose', 'body_temp', 'sleep_hours', 'mood',
  'headache_score', 'symptom_dizziness', 'symptom_vision', 'symptom_confusion', 'symptom_joint_pain', 'symptom_skin',
  'spo2', 'cabin_co2', 'exercise_min', 'water_ml', 'strength_self_pct',
];

describe('indicator catalog (P3-01)', () => {
  it('has exactly the 18 ids, in order, no duplicates', () => {
    expect(INDICATOR_IDS).toEqual(EXPECTED);
    expect(new Set(INDICATOR_IDS).size).toBe(EXPECTED.length);
  });

  it('every indicator has sources, risks and hazards; every threshold has a source with a URL', () => {
    for (const d of INDICATORS) {
      expect(d.sources.length).toBeGreaterThan(0);
      expect(d.risks.length).toBeGreaterThan(0);
      expect(d.hazards.length).toBeGreaterThan(0);
      for (const s of d.sources) expect(s.url).toMatch(/^https:\/\//);
      for (const t of d.thresholds) expect(t.source.url).toMatch(/^https:\/\//);
    }
  });

  it('cabin CO₂: yellow at the official 3 mmHg, red is a prototype value', () => {
    const co2 = getIndicator('cabin_co2')!;
    const y = co2.thresholds.find((t) => t.status === 'yellow')!;
    const r = co2.thresholds.find((t) => t.status === 'red')!;
    expect(y.min).toBe(3);
    expect(y.source.official).toBe(true);
    expect(r.source.official).toBe(false);
  });

  it('every zone is a BodyZone', () => {
    for (const d of INDICATORS) expect(BODY_ZONES).toContain(d.zone);
  });

  it('official thresholds exist only for CO₂ (min 3) and exercise (max 90), never baseline-based', () => {
    const official = INDICATORS.flatMap((d) => d.thresholds.filter((t) => t.source.official).map((t) => ({ id: d.id, t })));
    expect(official.map((o) => o.id).sort()).toEqual(['cabin_co2', 'exercise_min']);
    for (const { id, t } of official) {
      expect(t.sdFromBaseline).toBeUndefined();
      if (id === 'cabin_co2') expect([t.min, t.max]).toEqual([3, undefined]);
      if (id === 'exercise_min') expect([t.min, t.max]).toEqual([undefined, 90]);
    }
  });

  it('lookup helper', () => {
    expect(getIndicator('mood')?.input).toBe('scale_1_5');
    expect(getIndicator('nope')).toBeUndefined();
  });
});
