import { describe, expect, it } from 'vitest';
import { scenarioReadings, SCENARIOS, DEFAULT_PATIENT } from './simulator';
import { findCompound } from '../domain/rules';
import { crewFindings } from '../domain/crewRules';
import { crewSeed } from './store';
import { CREW_IDS } from '../data/crew';
import type { MissionContext } from '../domain/types';
import { tsOf } from '../data/sol142';

const ctx: MissionContext = { environment: 'mars_transit', phase: 'cruise', missionDay: 142, arrivalDay: 180, commDelayMin: 12.67 };
const nowTs = tsOf(142, 15, 0);

describe('mission simulator', () => {
  it.each(SCENARIOS)('%s makes the rules fire for the patient', (s) => {
    const patient = DEFAULT_PATIENT[s];
    const add = scenarioReadings(s, patient, ctx, nowTs);
    const readings = [...crewSeed(patient), ...(add[patient] ?? [])];
    const fired = findCompound(readings, ctx, nowTs).filter((f) => f.ruleId !== 'kidney_stone' || s === 'bone');
    // CO₂ is yellow for one person; it turns red at crew level (next test).
    expect(fired.some((f) => f.status === (s === 'co2' ? 'yellow' : 'red')), s).toBe(true);
    expect(add[patient]!.every((r) => r.simulated)).toBe(true);
  });

  it('CO₂ build-up shows as a crew-wide problem', () => {
    const add = scenarioReadings('co2', 'mateo', ctx, nowTs);
    const byCrew = Object.fromEntries(CREW_IDS.map((id) => [id, [...crewSeed(id), ...(add[id] ?? [])]]));
    expect(crewFindings(byCrew, {}, ctx).map((f) => f.ruleId)).toContain('crew_shared_headache');
  });

  it('each crew member has a personal baseline', () => {
    const hr = (id: (typeof CREW_IDS)[number]) => crewSeed(id).find((r) => r.indicatorId === 'heart_rate' && r.missionDay === 100)!.value;
    expect(new Set(CREW_IDS.map(hr)).size).toBe(4);
  });
});
