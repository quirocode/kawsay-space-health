/**
 * Compound rules (P3-03). NASA: the five spaceflight hazards potentiate each other, so one
 * indicator is not enough. Each rule crosses indicators and returns an explainable Finding.
 * Deterministic. Official facts come from SRC; every other cut-off is a prototype value.
 */
import { SRC } from './indicators';
import { fmt } from './evaluate';
import type { Action, Finding, MissionContext, Reading } from './types';

export interface RuleDef {
  id: string;
  check(readings: Reading[], ctx: MissionContext): Finding | null;
}

export function latest(readings: Reading[], id: string): Reading | undefined {
  let best: Reading | undefined;
  for (const r of readings) if (r.indicatorId === id && (!best || r.ts > best.ts)) best = r;
  return best;
}

/** Average of the latest reading per mission day over the last n days, today included. */
export function lastNDaysAvg(readings: Reading[], id: string, n: number, ctx: MissionContext): number | undefined {
  const perDay = new Map<number, Reading>();
  for (const r of readings) {
    if (r.indicatorId !== id || r.missionDay > ctx.missionDay || r.missionDay < ctx.missionDay - n + 1) continue;
    const cur = perDay.get(r.missionDay);
    if (!cur || r.ts > cur.ts) perDay.set(r.missionDay, r);
  }
  if (perDay.size === 0) return undefined;
  let sum = 0;
  for (const r of perDay.values()) sum += r.value;
  return sum / perDay.size;
}

/** Today's latest value for an indicator, or undefined. */
function today(readings: Reading[], id: string, ctx: MissionContext): number | undefined {
  return latest(readings.filter((r) => r.missionDay === ctx.missionDay), id)?.value;
}

const P = SRC.prototype;
const primary = (ruleId: string, text: string, recheckIndicatorId: string, recheckInMin: number, escalate: boolean): Action => ({
  id: `${ruleId}.primary`, text, recheckIndicatorId, recheckInMin, escalate,
});

export const RULES: RuleDef[] = [
  {
    id: 'co2_headache',
    check(readings, ctx) {
      const headache = today(readings, 'headache_score', ctx) ?? 1;
      if (headache < 3) return null;
      const co2 = latest(readings, 'cabin_co2')?.value;
      const sleep3 = lastNDaysAvg(readings, 'sleep_hours', 3, ctx);
      const highCo2 = co2 !== undefined && co2 >= 3;
      const shortSleep = sleep3 !== undefined && sleep3 < 6;
      if (!highCo2 && !shortSleep) return null;
      const confused = today(readings, 'symptom_confusion', ctx) === 1;
      const because = [`Headache reported (${fmt(headache)} of 5).`];
      if (highCo2) because.push(`Cabin CO₂ ${fmt(co2)} mmHg — NASA limit is 3 mmHg.`);
      if (shortSleep) because.push(`Sleep averaged ${fmt(sleep3)} h over 3 nights.`);
      if (confused) because.push('Confusion reported.');
      const parts = ['Headache', shortSleep && 'short sleep', highCo2 && 'high cabin CO₂'].filter(Boolean);
      return {
        ruleId: 'co2_headache', title: parts.join(' + '), status: confused ? 'red' : 'yellow', because,
        risks: ['hypoxia', 'sleep'], hazards: ['environment', 'isolation'], zones: ['brain', 'lungs'],
        actions: [primary('co2_headache', 'Move to a well-ventilated module, drink 250 ml of water, and ask the crew to check the CO₂ scrubber.', 'headache_score', 30, confused)],
        sources: [SRC.co2, SRC.hypoxia, SRC.sleep, P],
      };
    },
  },
  {
    id: 'hypoxia_signs',
    check(readings, ctx) {
      const spo2 = latest(readings, 'spo2')?.value;
      if (spo2 === undefined || spo2 >= 92) return null;
      const headache = (today(readings, 'headache_score', ctx) ?? 1) >= 3;
      const confused = today(readings, 'symptom_confusion', ctx) === 1;
      const vision = today(readings, 'symptom_vision', ctx) === 1;
      if (!headache && !confused && !vision) return null;
      const because = [`Blood oxygen ${fmt(spo2)} %.`];
      if (headache) because.push('Headache reported.');
      if (confused) because.push('Confusion reported.');
      if (vision) because.push('Blurred vision reported.');
      return {
        ruleId: 'hypoxia_signs', title: 'Low oxygen with symptoms', status: 'red', because,
        risks: ['hypoxia'], hazards: ['environment'], zones: ['lungs', 'brain'],
        actions: [primary('hypoxia_signs', 'Put on the oxygen mask now and tell the crew.', 'spo2', 10, true)],
        sources: [SRC.hypoxia, P],
      };
    },
  },
  {
    id: 'dcs_eva',
    check(readings, ctx) {
      if (ctx.phase !== 'pre_eva' && ctx.phase !== 'eva') return null;
      if (today(readings, 'symptom_joint_pain', ctx) !== 1) return null;
      return {
        ruleId: 'dcs_eva', title: 'Possible decompression sickness', status: 'red',
        because: ['Joint pain reported around an EVA.'],
        risks: ['dcs', 'eva'], hazards: ['environment'], zones: ['bones'],
        actions: [primary('dcs_eva', 'End the EVA and return to pressure now.', 'symptom_joint_pain', 30, true)],
        sources: [SRC.dcs, SRC.eva],
      };
    },
  },
  {
    id: 'kidney_stone',
    check(readings, ctx) {
      if (ctx.missionDay < 30) return null;
      const water3 = lastNDaysAvg(readings, 'water_ml', 3, ctx);
      if (water3 === undefined || water3 >= 2000) return null;
      return {
        ruleId: 'kidney_stone', title: 'Low water + bone loss: kidney stone risk', status: 'yellow',
        because: [`Water averaged ${fmt(water3 / 1000)} L over 3 days.`, `Mission day ${ctx.missionDay}: bone has been releasing calcium for weeks.`],
        risks: ['bone', 'nutrition'], hazards: ['gravity'], zones: ['kidneys', 'bones'],
        actions: [primary('kidney_stone', 'Drink to 2.5 L today — keep a bottle in sight.', 'water_ml', 1440, false)],
        sources: [SRC.gravity, SRC.bone, P],
      };
    },
  },
  {
    id: 'orthostatic_landing',
    check(readings, ctx) {
      const near = ctx.phase === 'pre_landing' || ctx.arrivalDay - ctx.missionDay <= 7;
      if (!near) return null;
      const dizzy = today(readings, 'symptom_dizziness', ctx) === 1;
      const ex7 = lastNDaysAvg(readings, 'exercise_min', 7, ctx);
      const water3 = lastNDaysAvg(readings, 'water_ml', 3, ctx);
      const lowEx = ex7 !== undefined && ex7 < 60;
      const lowWater = water3 !== undefined && water3 < 2000;
      if (!dizzy && !lowEx && !lowWater) return null;
      const because: string[] = [];
      if (dizzy) because.push('Dizziness reported.');
      if (lowEx) because.push(`Exercise averaged ${fmt(ex7)} min over 7 days — NASA target is 90.`);
      if (lowWater) because.push(`Water averaged ${fmt(water3 / 1000)} L over 3 days.`);
      return {
        ruleId: 'orthostatic_landing', title: 'Fainting risk at landing', status: 'yellow', because,
        risks: ['cardio', 'sensorimotor'], hazards: ['gravity'], zones: ['heart', 'inner_ear'],
        actions: [primary('orthostatic_landing', 'Start fluid loading and wear your compression garment. No critical tasks until you pass the balance test.', 'symptom_dizziness', 60, false)],
        sources: [SRC.cardio, SRC.gravity, SRC.fitness, P],
      };
    },
  },
  {
    id: 'sleep_mood',
    check(readings, ctx) {
      const sleep3 = lastNDaysAvg(readings, 'sleep_hours', 3, ctx);
      const mood = latest(readings, 'mood')?.value;
      if (sleep3 === undefined || sleep3 >= 6 || mood === undefined || mood > 2) return null;
      return {
        ruleId: 'sleep_mood', title: 'Short sleep is pulling your mood down', status: 'yellow',
        because: [`Sleep averaged ${fmt(sleep3)} h over 3 nights.`, `Mood ${fmt(mood)} of 5.`],
        risks: ['sleep', 'behavioral'], hazards: ['isolation'], zones: ['brain'],
        actions: [primary('sleep_mood', 'Use the light-therapy schedule tonight and write 3 lines in your journal.', 'mood', 1440, false)],
        sources: [SRC.isolation, SRC.sleep, P],
      };
    },
  },
];

/** Runs every rule, drops nulls, sorts red before yellow, then by rule order. */
export function findCompound(readings: Reading[], ctx: MissionContext): Finding[] {
  const found = RULES.map((r) => r.check(readings, ctx)).filter((f): f is Finding => f !== null);
  return [...found.filter((f) => f.status === 'red'), ...found.filter((f) => f.status !== 'red')];
}
