import { describe, expect, it } from 'vitest';
import { findCompound, lastNDaysAvg, latest, RULES } from './rules';
import type { MissionContext, Reading } from './types';

const ctx: MissionContext = { environment: 'mars_transit', phase: 'cruise', missionDay: 142, arrivalDay: 180, commDelayMin: 14 };
const r = (indicatorId: string, value: number, missionDay = 142, ts = missionDay * 1000): Reading => ({
  indicatorId, value, ts, missionDay, phase: 'cruise', origin: 'manual',
});
const rule = (id: string) => RULES.find((x) => x.id === id)!;
const sleepWeek = [r('sleep_hours', 4.6, 140), r('sleep_hours', 4.6, 141), r('sleep_hours', 6.4, 142)];

describe('helpers', () => {
  it('latest takes the highest ts', () => {
    expect(latest([r('mood', 2, 142, 1), r('mood', 4, 142, 5), r('mood', 3, 142, 3)], 'mood')?.value).toBe(4);
    expect(latest([], 'mood')).toBeUndefined();
  });

  it('lastNDaysAvg averages the latest reading per day', () => {
    const rs = [r('water_ml', 1000, 141, 1), r('water_ml', 1800, 141, 2), r('water_ml', 1400, 142)];
    expect(lastNDaysAvg(rs, 'water_ml', 3, ctx)).toBe(1600);
    expect(lastNDaysAvg(rs, 'water_ml', 1, ctx)).toBe(1400);
    expect(lastNDaysAvg([], 'water_ml', 3, ctx)).toBeUndefined();
  });
});

describe('compound rules (P3-03)', () => {
  it('Sol 142: headache + short sleep + high cabin CO₂', () => {
    const [f] = findCompound([...sleepWeek, r('headache_score', 4), r('cabin_co2', 4.1)], ctx);
    expect(f).toMatchObject({ ruleId: 'co2_headache', status: 'yellow', title: 'Headache + short sleep + high cabin CO₂' });
    expect(f.because).toEqual(['Headache reported (4 of 5).', 'Cabin CO₂ 4.1 mmHg — NASA limit is 3 mmHg.', 'Sleep averaged 5.2 h over 3 nights.']);
    expect(f.actions[0]).toMatchObject({ id: 'co2_headache.primary', recheckIndicatorId: 'headache_score', recheckInMin: 30, escalate: false });
    expect(f.sources.some((s) => s.official)).toBe(true);
  });

  it('co2_headache: title follows what matched; red with confusion; silent without a cause', () => {
    expect(rule('co2_headache').check([r('headache_score', 3), r('cabin_co2', 3.2)], ctx)?.title).toBe('Headache + high cabin CO₂');
    const red = rule('co2_headache').check([r('headache_score', 4), r('cabin_co2', 4), r('symptom_confusion', 1)], ctx)!;
    expect(red.status).toBe('red');
    expect(red.actions[0].escalate).toBe(true);
    expect(rule('co2_headache').check([r('headache_score', 4), r('cabin_co2', 2.4)], ctx)).toBeNull();
    expect(rule('co2_headache').check([r('headache_score', 2), r('cabin_co2', 5)], ctx)).toBeNull();
  });

  it('hypoxia_signs needs low oxygen and a symptom', () => {
    expect(rule('hypoxia_signs').check([r('spo2', 90), r('symptom_vision', 1)], ctx)?.status).toBe('red');
    expect(rule('hypoxia_signs').check([r('spo2', 90)], ctx)).toBeNull();
    expect(rule('hypoxia_signs').check([r('spo2', 96), r('symptom_vision', 1)], ctx)).toBeNull();
  });

  it('dcs_eva never fires in cruise', () => {
    const pain = [r('symptom_joint_pain', 1)];
    expect(rule('dcs_eva').check(pain, ctx)).toBeNull();
    expect(rule('dcs_eva').check(pain, { ...ctx, phase: 'eva' })?.actions[0].text).toBe('End the EVA and return to pressure now.');
  });

  it('kidney_stone: low water after the first month', () => {
    const dry = [r('water_ml', 1600, 140), r('water_ml', 1700, 141)];
    expect(rule('kidney_stone').check(dry, ctx)?.because[0]).toBe('Water averaged 1.7 L over 3 days.');
    expect(rule('kidney_stone').check(dry.map((x) => ({ ...x, missionDay: x.missionDay - 120 })), { ...ctx, missionDay: 22 })).toBeNull();
    expect(rule('kidney_stone').check([r('water_ml', 2500, 141)], ctx)).toBeNull();
  });

  it('orthostatic_landing only near landing', () => {
    const dizzy = [r('symptom_dizziness', 1)];
    expect(rule('orthostatic_landing').check(dizzy, ctx)).toBeNull();
    expect(rule('orthostatic_landing').check(dizzy, { ...ctx, phase: 'pre_landing' })?.status).toBe('yellow');
    expect(rule('orthostatic_landing').check([r('symptom_dizziness', 1, 175)], { ...ctx, missionDay: 175 })).not.toBeNull();
  });

  it('sleep_mood needs both', () => {
    expect(rule('sleep_mood').check([...sleepWeek, r('mood', 2)], ctx)?.ruleId).toBe('sleep_mood');
    expect(rule('sleep_mood').check([...sleepWeek, r('mood', 4)], ctx)).toBeNull();
  });

  it('red findings come first, and the result is deterministic', () => {
    const rs = [r('water_ml', 1500, 141), r('spo2', 89), r('symptom_confusion', 1)];
    const out = findCompound(rs, ctx);
    expect(out.map((f) => f.ruleId)).toEqual(['hypoxia_signs', 'kidney_stone']);
    expect(findCompound(rs, ctx)).toEqual(out);
  });
});
