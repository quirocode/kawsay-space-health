import { describe, expect, it } from 'vitest';
import { brief, DELAY_MIN, verify } from './loop';
import type { Finding, LandingReadiness, MissionContext, Reading } from './types';

const ctx: MissionContext = { environment: 'mars_transit', phase: 'cruise', missionDay: 142, arrivalDay: 180, commDelayMin: 14 };
const r = (indicatorId: string, value: number): Reading => ({ indicatorId, value, ts: 0, missionDay: 142, phase: 'cruise', origin: 'manual' });
const readiness: LandingReadiness = { score: 66, scoreIfPlanFollowed: 89, tasks: [], projections: [] };
const finding: Finding = {
  ruleId: 'co2_headache', title: 'Headache + short sleep + high cabin CO₂', status: 'yellow',
  because: ['Headache reported (4 of 5).'], risks: ['hypoxia'], hazards: ['environment'], zones: ['brain'],
  actions: [{ id: 'co2_headache.primary', text: 'Move to a well-ventilated module.', recheckIndicatorId: 'headache_score', recheckInMin: 30, escalate: false }],
  sources: [],
};

describe('verify (P3-06)', () => {
  it('headache 4 → 2 improved', () => {
    expect(verify(r('headache_score', 4), r('headache_score', 2))).toMatchObject({ outcome: 'improved', escalate: false, reason: 'Headache went from 4 to 2 — improved.' });
  });
  it('a change under the threshold is unchanged and escalates', () => {
    expect(verify(r('cabin_co2', 4.1), r('cabin_co2', 4.0))).toMatchObject({ outcome: 'unchanged', escalate: true });
  });
  it('oxygen falling is worse', () => {
    expect(verify(r('spo2', 95), r('spo2', 89)).outcome).toBe('worse');
  });
  it('a symptom that clears is improved', () => {
    expect(verify(r('symptom_dizziness', 1), r('symptom_dizziness', 0)).outcome).toBe('improved');
  });
  it('heart rate coming down is improved', () => {
    expect(verify(r('heart_rate', 134), r('heart_rate', 88)).outcome).toBe('improved');
    expect(verify(r('heart_rate', 134), r('heart_rate', 130)).outcome).toBe('unchanged');
  });
  it('glucose is judged against its range', () => {
    expect(verify(r('glucose', 180), r('glucose', 120)).outcome).toBe('improved');
    expect(verify(r('glucose', 60), r('glucose', 85)).outcome).toBe('improved');
  });
  it('refuses to compare two different indicators', () => {
    expect(() => verify(r('spo2', 95), r('mood', 3))).toThrow();
  });
});

describe('brief (P3-06)', () => {
  const T = 1_000_000;
  it('arrives after the one-way delay; never during conjunction', () => {
    expect(brief({ findings: [], verifications: [], readiness, ctx, nowTs: T }).arrivesAtTs).toBe(T + 840_000);
    expect(brief({ findings: [], verifications: [], readiness, ctx: { ...ctx, commDelayMin: Infinity }, nowTs: T }).arrivesAtTs).toBeNull();
  });
  it('Sol 142: handled on board, no decision needed', () => {
    const v = verify(r('headache_score', 4), r('headache_score', 2));
    const b = brief({ findings: [finding], verifications: [v], readiness, ctx, nowTs: T });
    expect(b.headline).toContain('improved');
    expect(b.decisionRequested).toBe('No decision needed. For your awareness.');
    expect(b.actionsTaken).toEqual(['Move to a well-ventilated module. → improved']);
    expect(b.readiness).toEqual({ score: 66, scoreIfPlanFollowed: 89 });
  });
  it('asks for a decision when the action did not work', () => {
    const v = verify(r('headache_score', 4), r('headache_score', 4));
    const b = brief({ findings: [finding], verifications: [v], readiness, ctx, nowTs: T });
    expect(b.decisionRequested).toBe('Please review: Headache + short sleep + high cabin CO₂. Advise on next step.');
    expect(b.findings).toEqual([finding]);
  });
  it('a routine brief when nothing was found', () => {
    expect(brief({ findings: [], verifications: [], readiness, ctx, nowTs: T }).headline).toBe('No new findings. Routine brief.');
  });
  it('Mars delays stay within NASA’s 20 minutes', () => {
    expect(DELAY_MIN.mars_transit).toBeLessThanOrEqual(20);
    expect(DELAY_MIN.mars_surface).toBeLessThanOrEqual(20);
  });
});
