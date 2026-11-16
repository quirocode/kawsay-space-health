import { describe, expect, it } from 'vitest';
import { ADVANCED_SPACE_INDICATORS, analyzeCrewCohort, buildCrewReadings, CREW_ROSTER, evaluateSilentSpaceRisks, getCrewMember } from './crew';
import { explainWithLocalAi } from './localAi';
import { SRC } from './indicators';
import type { MissionContext, Reading } from './types';

const ctx: MissionContext = { environment: 'mars_transit', phase: 'cruise', missionDay: 142, arrivalDay: 180, commDelayMin: 14 };
const baseReadings: Reading[] = [
  { indicatorId: 'heart_rate', value: 64, ts: 1000, missionDay: 142, phase: 'cruise', origin: 'sensor_sim' },
  { indicatorId: 'cabin_co2', value: 4.1, ts: 1000, missionDay: 142, phase: 'cruise', origin: 'sensor_sim' },
  { indicatorId: 'water_ml', value: 1650, ts: 1000, missionDay: 142, phase: 'cruise', origin: 'manual' },
];

describe('4-astronaut crew profiles & silent risk surveillance', () => {
  it('defines 4 distinct crew profiles (CDR, PLT, CMO, MS) with pre-flight baselines and pre-existing conditions', () => {
    expect(CREW_ROSTER).toHaveLength(4);
    expect(CREW_ROSTER.map((c) => c.role)).toEqual(['CDR', 'PLT', 'CMO', 'MS']);
    for (const member of CREW_ROSTER) {
      expect(member.preExisting.length).toBeGreaterThan(0);
      expect(member.baseline.restingHrBpm).toBeGreaterThan(40);
    }
    expect(ADVANCED_SPACE_INDICATORS).toHaveLength(5);
  });

  it('builds isolated physiological reading histories per crew member', () => {
    const vance = getCrewMember('vance');
    const vanceReadings = buildCrewReadings(baseReadings, vance);
    expect(vanceReadings.find((r) => r.indicatorId === 'heart_rate')?.value).toBe(70);
  });

  it('detects silent in-flight and pre-existing complications across the 4 crew members', () => {
    const quispeAlerts = evaluateSilentSpaceRisks(getCrewMember('quispe'), baseReadings, ctx);
    expect(quispeAlerts.some((a) => a.id.includes('hrv_autonomic'))).toBe(true);

    const okaforAlerts = evaluateSilentSpaceRisks(getCrewMember('okafor'), baseReadings, ctx);
    expect(okaforAlerts.some((a) => a.id.includes('ijv_thrombus'))).toBe(true);

    const linAlerts = evaluateSilentSpaceRisks(getCrewMember('lin'), baseReadings, ctx);
    expect(linAlerts.some((a) => a.id.includes('renal_crystalluria'))).toBe(true);

    const vanceAlerts = evaluateSilentSpaceRisks(getCrewMember('vance'), baseReadings, ctx);
    expect(vanceAlerts.some((a) => a.id.includes('sans_co2_pvt'))).toBe(true);
  });

  it('correlates shared habitat CO2 across all 4 astronauts in cohort triage', () => {
    const cohort = analyzeCrewCohort(baseReadings, ctx);
    expect(cohort.status).toBe('yellow');
    expect(cohort.affectedCrew).toHaveLength(4);
  });

  it('generates an offline physiological explanation in Spanish and English for Why? instead of raw links', () => {
    const esExplain = explainWithLocalAi({
      sources: [SRC.co2],
      crewName: 'A. Quispe',
      readings: baseReadings,
      context: ctx,
      lang: 'es',
    });
    expect(esExplain.headline).toContain('Hipercapnia');
    expect(esExplain.mechanism).toContain('vasodilatación');
    expect(esExplain.personalContext).toContain('CDR A. Quispe');

    const enExplain = explainWithLocalAi({
      sources: [SRC.sans],
      crewName: 'M. Vance',
      readings: baseReadings,
      context: ctx,
      lang: 'en',
    });
    expect(enExplain.headline).toContain('SANS');
    expect(enExplain.personalContext).toContain('PLT M. Vance');
  });
});
