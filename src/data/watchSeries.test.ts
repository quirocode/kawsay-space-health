import { describe, expect, it } from 'vitest';
import { detect } from '../domain/watch';
import { SOL142_CONTEXT, tsOf } from './sol142';
import { EPISODE_START_TS, sampleAt, windowOf } from './watchSeries';

const at = (hh: number, mm: number, ss = 0) => tsOf(142, hh, mm) + ss * 1000;
const levelAt = (ts: number, recoveryStartTs: number | null = null) =>
  detect(windowOf(ts, 360, { recoveryStartTs }), SOL142_CONTEXT, ts).find((a) => a.ruleId === 'resting_tachycardia')?.level ?? null;

describe('simulated watch on Sol 142', () => {
  it('is a pure function of time', () => {
    expect(sampleAt(at(14, 31))).toEqual(sampleAt(at(14, 31)));
    expect(windowOf(at(9, 0), 300)).toEqual(windowOf(at(9, 0), 300));
  });

  it('reads a calm resting body in the morning', () => {
    const s = sampleAt(at(7, 45));
    expect(s.activity).toBe('rest');
    expect(s.heartRate).toBeGreaterThanOrEqual(56);
    expect(s.heartRate).toBeLessThanOrEqual(68);
    expect(detect(windowOf(at(7, 45), 360), SOL142_CONTEXT, at(7, 45))).toEqual([]);
  });

  it('exercise is not an alert: high heart rate with the right context is normal', () => {
    const ts = tsOf(120, 18, 30);
    expect(sampleAt(ts).activity).toBe('exercise');
    expect(sampleAt(ts).heartRate).toBeGreaterThan(120);
    expect(detect(windowOf(ts, 360), SOL142_CONTEXT, ts)).toEqual([]);
  });

  it('the 14:28 episode: quiet, then caution, then the alarm at 14:32', () => {
    expect(EPISODE_START_TS).toBe(at(14, 28));
    expect(levelAt(at(14, 27, 55))).toBeNull();
    expect(levelAt(at(14, 29, 40))).toBe('caution');
    expect(levelAt(at(14, 31, 30))).toBe('caution');
    expect(levelAt(at(14, 32, 0))).toBe('emergency');
    expect(sampleAt(at(14, 32)).heartRate).toBeGreaterThanOrEqual(132);
  });

  it('stays high until the crew member acts, then recovers within ten minutes', () => {
    expect(sampleAt(at(14, 45)).heartRate).toBeGreaterThanOrEqual(130);
    const recovery = at(14, 36);
    const after = sampleAt(at(14, 46), { recoveryStartTs: recovery });
    expect(after.heartRate).toBeLessThan(95);
    expect(levelAt(at(14, 46), recovery)).toBeNull();
  });
});
