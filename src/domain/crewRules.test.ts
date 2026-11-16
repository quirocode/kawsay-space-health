import { describe, expect, it } from 'vitest';
import { crewFindings } from './crewRules';
import { findCompound } from './rules';
import type { MissionContext, Reading } from './types';

const ctx: MissionContext = { environment: 'mars_transit', phase: 'cruise', missionDay: 142, arrivalDay: 180, commDelayMin: 12.67 };
const r = (indicatorId: string, value: number): Reading => ({ indicatorId, value, ts: 142 * 86_400_000, missionDay: 142, phase: 'cruise', origin: 'manual' });
const names = { a: 'A', b: 'B', c: 'C', d: 'D' };

describe('new compound rules', () => {
  it('flags neck fullness with headache as red and escalates', () => {
    const [f] = findCompound([r('symptom_neck', 1), r('headache_score', 3)], ctx);
    expect(f.ruleId).toBe('jugular_stasis');
    expect(f.status).toBe('red');
    expect(f.actions[0].escalate).toBe(true);
  });
  it('flags flank pain as a possible kidney stone', () => {
    expect(findCompound([r('symptom_flank_pain', 1)], ctx).map((f) => f.ruleId)).toContain('kidney_stone_pain');
  });
  it('sends the crew to the shelter at 10 mSv in a day, not at 2', () => {
    expect(findCompound([r('radiation_msv', 12)], ctx)[0].ruleId).toBe('radiation_storm');
    expect(findCompound([r('radiation_msv', 2)], ctx)).toEqual([]);
  });
  it('grades slow reactions', () => {
    expect(findCompound([r('pvt_ms', 400)], ctx)[0].status).toBe('yellow');
    expect(findCompound([r('pvt_ms', 480)], ctx)[0].status).toBe('red');
  });
});

describe('crewFindings', () => {
  it('sees a shared cause when several people have a headache', () => {
    const f = crewFindings({ a: [r('headache_score', 3)], b: [r('headache_score', 4)], c: [r('headache_score', 3)], d: [] }, names, ctx);
    expect(f[0].ruleId).toBe('crew_shared_headache');
    expect(f[0].status).toBe('red');
    expect(f[0].crew).toEqual(['a', 'b', 'c']);
  });
  it('one headache is personal: no crew finding', () => {
    expect(crewFindings({ a: [r('headache_score', 4)], b: [], c: [], d: [] }, names, ctx)).toEqual([]);
  });
  it('a fever on board protects the others, and radiation shelters everyone', () => {
    const f = crewFindings({ a: [r('body_temp', 38), r('radiation_msv', 25)], b: [], c: [], d: [] }, names, ctx);
    expect(f.map((x) => x.ruleId)).toEqual(['crew_radiation_shelter', 'crew_infection_watch']);
    expect(f[0].crew).toEqual(['a', 'b', 'c', 'd']);
  });
});
