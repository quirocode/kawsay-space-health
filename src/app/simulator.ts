/**
 * Mission simulator (P1): one click makes a crew member fall ill with one of NASA's five
 * hazards. Pure: it only builds the readings to inject; the rules engine decides what they mean.
 * Every value here is SIMULATED and marked as such.
 */
import { CREW_IDS, type CrewId } from '../data/crew';
import type { Environment, MissionContext, Reading } from '../domain/types';

export type HazardScenario = 'cardio' | 'bone' | 'radiation' | 'co2' | 'isolation';
export const SCENARIOS: readonly HazardScenario[] = ['cardio', 'bone', 'radiation', 'co2', 'isolation'];

/** Who it happens to when the judge does not choose. */
export const DEFAULT_PATIENT: Record<HazardScenario, CrewId> = {
  cardio: 'elena', bone: 'amara', radiation: 'kenji', co2: 'mateo', isolation: 'kenji',
};

/** One-way delay in minutes per environment (the header shows < 1 min as "seconds"). */
export const SIM_DELAY_MIN: Record<Environment, number> = {
  iss: 0.02, orion: 0.03, moon: 0.022, mars_transit: 12.67, mars_surface: 22,
};

const MIN = 60_000;
const DAY = 86_400_000;

export function scenarioReadings(scenario: HazardScenario, patient: CrewId, ctx: MissionContext, nowTs: number): Partial<Record<CrewId, Reading[]>> {
  const r = (indicatorId: string, value: number, ago = 0, dayOffset = 0): Reading => ({
    indicatorId, value, ts: nowTs - ago * MIN - dayOffset * DAY, missionDay: ctx.missionDay - dayOffset,
    phase: ctx.phase, origin: 'manual', simulated: true,
  });
  const cabin = (mmHg: number): Reading[] =>
    Array.from({ length: 13 }, (_, i) => ({ ...r('cabin_co2', mmHg, 60 - i * 5), origin: 'sensor_sim' as const }));
  const add: Partial<Record<CrewId, Reading[]>> = {};
  const push = (id: CrewId, rs: Reading[]) => { add[id] = [...(add[id] ?? []), ...rs]; };

  switch (scenario) {
    case 'cardio':
      push(patient, [r('symptom_neck', 1, 5), r('headache_score', 3, 5), r('heart_rate', 84, 5)]);
      break;
    case 'bone':
      push(patient, [r('water_ml', 1100, 0, 2), r('water_ml', 1200, 0, 1), r('water_ml', 1000, 5), r('symptom_flank_pain', 1, 5), r('body_temp', 37.4, 5)]);
      break;
    case 'radiation':
      CREW_IDS.forEach((id, i) => push(id, [{ ...r('radiation_msv', 24 + i * 2, 10), origin: 'sensor_sim' }]));
      push(patient, [r('symptom_skin', 1, 5), r('body_temp', 37.9, 5)]);
      break;
    case 'co2':
      for (const id of CREW_IDS) push(id, cabin(5.4));
      for (const id of CREW_IDS.filter((id) => id !== patient).slice(0, 2)) push(id, [r('headache_score', 3, 15)]);
      push(patient, [r('headache_score', 4, 5), r('symptom_vision', 1, 5)]);
      break;
    case 'isolation':
      push(patient, [r('sleep_hours', 4.1, 0, 2), r('sleep_hours', 4.3, 0, 1), r('sleep_hours', 3.9, 30), r('mood', 2, 20), r('pvt_ms', 480, 10)]);
      break;
  }
  return add;
}
