/**
 * Simulated wrist watch for the demo (origin 'sensor_sim'). Every sample is a pure function
 * of its timestamp, so the same moment always reads the same: no randomness, no clock.
 *
 * The story on Sol 142: at 14:28, while the crew member rests after lunch, the heart rate
 * climbs and stays high. It only comes down once they act (recoveryStartTs).
 * A real watch replaces this module behind the same WatchSample shape.
 */
import type { ActivityState, WatchSample } from '../domain/types';
import { shipTime, tsOf } from './sol142';

/** Seconds between two samples. */
export const SAMPLE_STEP_SEC = 5;

export interface WatchScenario {
  /** When the crew member finished the guided response; the heart rate recovers from here. */
  recoveryStartTs: number | null;
}

export const EPISODE_DAY = 142;
export const EPISODE_START_TS = tsOf(EPISODE_DAY, 14, 28);
const EPISODE_END_TS = tsOf(EPISODE_DAY, 15, 30);
const PLATEAU_BPM = 134;
const RECOVERED_BPM = 88;

const h = (hh: number, mm = 0) => hh * 3600 + mm * 60;

/** The crew member's day. On the busy week (Sol 136 on) the exercise block is cut short. */
function activityAt(day: number, sec: number): ActivityState {
  if (sec < h(6) || sec >= h(23)) return 'sleep';
  if (sec < h(6, 30)) return 'active';
  if (sec < h(8, 30)) return 'rest';
  if (sec < h(12, 30)) return 'active';
  if (sec < h(13, 30)) return 'rest';
  if (sec < h(14, 10)) return 'active';
  if (sec < h(15)) return 'rest';
  if (sec < h(18)) return 'active';
  if (sec < (day >= 136 ? h(18, 52) : h(19, 25))) return 'exercise';
  return 'rest';
}

const BASE: Record<ActivityState, { hr: number; resp: number; hrv: number; spo2: number }> = {
  sleep: { hr: 52, resp: 12, hrv: 55, spo2: 96 },
  rest: { hr: 62, resp: 14, hrv: 42, spo2: 97 },
  active: { hr: 78, resp: 17, hrv: 30, spo2: 97 },
  exercise: { hr: 132, resp: 28, hrv: 12, spo2: 96 },
  eva: { hr: 110, resp: 22, hrv: 18, spo2: 97 },
};

/** Slow, small, deterministic variation in [-1, 1]. */
const wobble = (ts: number, period: number, phase: number) => Math.sin(ts / period + phase);
const lerp = (a: number, b: number, k: number) => a + (b - a) * Math.min(1, Math.max(0, k));

export function sampleAt(ts: number, scenario: WatchScenario = { recoveryStartTs: null }): WatchSample {
  const { day, secOfDay } = shipTime(ts);
  const activity = activityAt(day, secOfDay);
  const base = BASE[activity];
  let hr = base.hr + 2 * wobble(ts, 37_000, day) + 1.5 * wobble(ts, 9_100, day * 3);
  let resp = base.resp + 0.8 * wobble(ts, 53_000, 1);
  let hrv = base.hrv + 3 * wobble(ts, 61_000, 2);
  let skin = 0.1 * wobble(ts, 900_000, 0);

  if (ts >= EPISODE_START_TS && ts < EPISODE_END_TS) {
    const sinceSec = (ts - EPISODE_START_TS) / 1000;
    const plateau = PLATEAU_BPM + wobble(ts, 9_100, 0);
    const rising = sinceSec < 30 ? lerp(base.hr, 112, sinceSec / 30) : sinceSec < 120 ? lerp(112, 131, (sinceSec - 30) / 90) : plateau;
    const recovery = scenario.recoveryStartTs;
    if (recovery !== null && ts >= recovery) {
      const k = Math.exp(-(ts - recovery) / 180_000); // most of the way back in about nine minutes
      hr = RECOVERED_BPM + (plateau - RECOVERED_BPM) * k;
      resp = 15 + 4 * k;
      hrv = 36 - 18 * k;
    } else {
      hr = rising;
      resp = lerp(base.resp, 19, sinceSec / 120);
      hrv = lerp(base.hrv, 18, sinceSec / 120);
    }
    skin = 0.2;
  }

  return {
    ts, activity, quality: 'good',
    heartRate: Math.round(hr),
    spo2: Math.round(base.spo2 + 0.6 * wobble(ts, 71_000, 4) - (ts >= EPISODE_START_TS && ts < EPISODE_END_TS ? 1 : 0)),
    respRate: Math.round(resp),
    skinTempDelta: Math.round(skin * 10) / 10,
    hrv: Math.round(hrv),
  };
}

/** Samples from (toTs − seconds) to toTs, oldest first, aligned to the sample grid. */
export function windowOf(toTs: number, seconds: number, scenario?: WatchScenario, stepSec = SAMPLE_STEP_SEC): WatchSample[] {
  const step = stepSec * 1000;
  const end = Math.floor(toTs / step) * step;
  const out: WatchSample[] = [];
  for (let ts = end - Math.floor(seconds / stepSec) * step; ts <= end; ts += step) out.push(sampleAt(ts, scenario));
  return out;
}
