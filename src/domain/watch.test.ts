import { describe, expect, it } from 'vitest';
import { detect, heldForSec, likely, protocol, toFinding, WATCH_PARAMS } from './watch';
import type { ActivityState, MissionContext, Reading, WatchSample } from './types';

const ctx: MissionContext = { environment: 'mars_transit', phase: 'cruise', missionDay: 142, arrivalDay: 180, commDelayMin: 14 };
const STEP = 5_000;
const sample = (i: number, over: Partial<WatchSample> = {}): WatchSample => ({
  ts: i * STEP, activity: 'rest', quality: 'good', heartRate: 62, spo2: 97, respRate: 14, skinTempDelta: 0, hrv: 42, ...over,
});
/** `seconds` of samples, oldest first, the last one at t = seconds. */
const run = (seconds: number, over: Partial<WatchSample> = {}) => Array.from({ length: seconds / 5 + 1 }, (_, i) => sample(i, over));
const end = (w: WatchSample[]) => w[w.length - 1].ts;
const levels = (w: WatchSample[]) => detect(w, ctx, end(w)).map((a) => `${a.ruleId}:${a.level}`);

describe('heldForSec', () => {
  it('counts back from the newest sample until the condition breaks', () => {
    const w = [...run(60, { heartRate: 70 }), ...run(120, { heartRate: 140 }).map((s) => ({ ...s, ts: s.ts + 65_000 }))];
    expect(heldForSec(w, (s) => s.heartRate >= 130)).toBe(120);
    expect(heldForSec(w, (s) => s.heartRate >= 200)).toBe(0);
    expect(heldForSec([], () => true)).toBe(0);
  });
});

describe('watch rules', () => {
  it('a calm resting body raises nothing', () => {
    expect(levels(run(360))).toEqual([]);
  });

  it('resting tachycardia climbs through the three levels', () => {
    expect(levels(run(55, { heartRate: 115 }))).toEqual([]);
    expect(levels(run(60, { heartRate: 115 }))).toEqual(['resting_tachycardia:caution']);
    expect(levels(run(300, { heartRate: 115 }))).toEqual(['resting_tachycardia:warning']);
    expect(levels(run(115, { heartRate: 134 }))).toEqual(['resting_tachycardia:caution']);
    expect(levels(run(120, { heartRate: 134 }))).toEqual(['resting_tachycardia:emergency']);
  });

  it('the same heart rate during exercise is not an alert', () => {
    for (const activity of ['exercise', 'active', 'sleep', 'eva'] as ActivityState[]) {
      expect(levels(run(360, { heartRate: 140, activity }))).toEqual([]);
    }
  });

  it('the alert explains itself and carries a prototype source', () => {
    const [a] = detect(run(120, { heartRate: 134 }), ctx, 120_000);
    expect(a.because).toEqual(['Heart rate 134 bpm while resting.', 'At or above 130 for 2 min.']);
    expect(a.firstStep).toBe('Stop what you are doing. Hold on to a handrail.');
    expect(a.sources.some((s) => s.official)).toBe(true);
    expect(a.sources.some((s) => !s.official)).toBe(true);
  });

  it('low heart rate while awake and resting', () => {
    expect(levels(run(300, { heartRate: 38 }))).toEqual(['resting_bradycardia:warning']);
    expect(levels(run(300, { heartRate: 38, activity: 'sleep' }))).toEqual([]);
  });

  it('low oxygen in any activity; the more severe alert comes first', () => {
    expect(levels(run(180, { spo2: 90 }))).toEqual(['low_spo2:warning']);
    expect(levels(run(60, { spo2: 86, activity: 'sleep' }))).toEqual(['low_spo2:emergency']);
    expect(levels(run(300, { spo2: 86, heartRate: 115 }))).toEqual(['low_spo2:emergency', 'resting_tachycardia:warning']);
  });

  it('with no usable data it says so and nothing else', () => {
    const w = run(WATCH_PARAMS.staleAfterSec, { quality: 'off_wrist', heartRate: 150 });
    expect(levels(w)).toEqual(['watch_stale:caution']);
    expect(detect([], ctx, 0).map((a) => a.ruleId)).toEqual(['watch_stale']);
  });

  it('off-wrist samples never count as evidence', () => {
    const w = run(120, { heartRate: 134 });
    w[12] = { ...w[12], quality: 'off_wrist' };
    expect(levels(w)).toEqual([]);
  });
});

describe('response', () => {
  const [alert] = detect(run(120, { heartRate: 134 }), ctx, 120_000);
  const r = (indicatorId: string, value: number, missionDay = 142): Reading => ({ indicatorId, value, ts: missionDay, missionDay, phase: 'cruise', origin: 'manual' });

  it('the protocol starts by asking about red-flag symptoms', () => {
    const steps = protocol(alert);
    expect(steps.map((s) => s.kind)).toEqual(['question', 'measure', 'timer', 'action']);
    expect(steps[0].options!.filter((o) => o.escalate).map((o) => o.id)).toEqual(['chest_pain', 'breathless', 'faint']);
  });

  it('likely causes come from the readings, each with a source', () => {
    const readings = [r('water_ml', 1100), r('sleep_hours', 4.6, 140), r('sleep_hours', 4.6, 141), r('sleep_hours', 6.4)];
    const out = likely(alert, readings, sample(0, { heartRate: 134 }), ctx);
    expect(out.headline).toBe('Likely: dehydration and fatigue.');
    expect(out.reasons.map((x) => x.text)).toEqual(['Low water today: 1.1 L of 2.5 L.', 'Short sleep: 5.2 h average over 3 nights.', 'No fever, oxygen normal.']);
    expect(likely(alert, [], sample(0), ctx).headline).toMatch(/No clear cause/);
    expect(likely(alert, [], sample(0, { spo2: 89 }), ctx).headline).toBe('Likely: low oxygen.');
  });

  it('becomes a finding for the brief', () => {
    expect(toFinding(alert)).toMatchObject({ ruleId: 'watch.resting_tachycardia', status: 'red', zones: ['heart'] });
    expect(toFinding(alert).actions[0]).toMatchObject({ recheckIndicatorId: 'heart_rate', escalate: true });
  });
});
