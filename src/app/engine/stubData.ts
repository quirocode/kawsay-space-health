/**
 * PROVISIONAL demo data for "Sol 142" (P1). Replaced by src/data/sol142.ts (P3-05) when it lands.
 * Deterministic: no randomness, no clock. Same story as docs/tasks/P3-05-sol142.md.
 */
import type { CountermeasurePlan, MissionContext, Reading } from '../../domain/types';

export const MISSION_START_TS = Date.UTC(2026, 5, 25, 12, 0, 0);
export const DAY_MS = 86_400_000;

export const SOL142_CONTEXT: MissionContext = {
  environment: 'mars_transit',
  phase: 'cruise',
  missionDay: 142,
  arrivalDay: 180,
  commDelayMin: 14,
};

export function tsOf(day: number, hh: number, mm: number): number {
  return MISSION_START_TS + day * DAY_MS + (hh * 60 + mm) * 60_000;
}

/** Small deterministic wobble in [-1, 1]. */
function wobble(day: number, k: number): number {
  return Math.sin(day * 12.9898 + k * 78.233) * 0.999;
}

const r1 = (v: number) => Math.round(v * 10) / 10;

export interface DemoMission {
  context: MissionContext;
  nowTs: number;
  history: Reading[];
  beats: { headache: Reading[]; verification: Reading[] };
  defaultPlan: Required<CountermeasurePlan>;
}

export function generateStubSol142(): DemoMission {
  const history: Reading[] = [];
  const push = (indicatorId: string, value: number, day: number, hh: number, mm: number, origin: Reading['origin'] = 'manual') =>
    history.push({ indicatorId, value, ts: tsOf(day, hh, mm), missionDay: day, phase: 'cruise', origin });

  for (let d = 1; d <= 142; d++) {
    const today = d === 142;
    push('bp_systolic', today ? 118 : Math.round(117 + 4 * wobble(d, 1)), d, 7, 40);
    push('bp_diastolic', today ? 76 : Math.round(76 + 3 * wobble(d, 2)), d, 7, 40);
    push('heart_rate', today ? 64 : Math.round(63 + 3 * wobble(d, 3)), d, 7, 40, 'sensor_sim');
    push('glucose', today ? 92 : Math.round(92 + 6 * wobble(d, 4)), d, 7, 40);
    push('body_temp', today ? 36.7 : r1(36.7 + 0.15 * wobble(d, 5)), d, 7, 40);
    // Busy week (days 136–141): exercise and sleep both slip; two very short nights.
    const sleep = d === 140 || d === 141 ? 4.6 : today ? 6.4 : d >= 136 ? 5.6 : r1(7.1 + 0.3 * wobble(d, 6));
    push('sleep_hours', sleep, d, 7, 40);
    push('mood', today ? 4 : Math.max(3, Math.min(5, Math.round(4 + wobble(d, 7)))), d, 7, 40);
    push('spo2', today ? 97 : Math.round(97 + 0.7 * wobble(d, 8)), d, 7, 40, 'sensor_sim');
    push('cabin_co2', today ? 2.4 : r1(2.3 + 0.3 * wobble(d, 9)), d, 7, 40, 'sensor_sim');
    push('headache_score', 1, d, 7, 40);
    for (const s of ['symptom_dizziness', 'symptom_vision', 'symptom_confusion', 'symptom_joint_pain', 'symptom_skin']) {
      push(s, d === 3 && s === 'symptom_dizziness' ? 1 : 0, d, 7, 40);
    }
    if (!today) {
      const lazy = d >= 136;
      push('exercise_min', lazy ? 50 + 5 * Math.round(wobble(d, 10)) : 85 + 5 * Math.round(wobble(d, 11)), d, 21, 0);
      push('water_ml', lazy ? 1700 + 50 * Math.round(2 * wobble(d, 12)) : 2500 + 50 * Math.round(3 * wobble(d, 13)), d, 21, 0);
    }
    if (d % 7 === 0) push('strength_self_pct', r1(99 - (8 * d) / 140), d, 8, 0);
  }
  history.sort((a, b) => a.ts - b.ts);

  const beat = (indicatorId: string, value: number, hh: number, mm: number, origin: Reading['origin'] = 'manual'): Reading => ({
    indicatorId, value, ts: tsOf(142, hh, mm), missionDay: 142, phase: 'cruise', origin,
  });

  return {
    context: SOL142_CONTEXT,
    nowTs: tsOf(142, 7, 45),
    history,
    beats: {
      headache: [beat('headache_score', 4, 13, 10), beat('cabin_co2', 4.1, 13, 10, 'sensor_sim')],
      verification: [beat('headache_score', 2, 13, 45), beat('cabin_co2', 2.6, 13, 45, 'sensor_sim')],
    },
    defaultPlan: { exerciseMinPerDay: 90, exerciseDaysPerWeek: 7, waterMlPerDay: 2500, sleepHours: 7 },
  };
}
