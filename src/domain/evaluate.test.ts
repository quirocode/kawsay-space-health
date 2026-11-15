import { describe, expect, it } from 'vitest';
import { computeBaselines, evaluate, statusOf } from './evaluate';
import type { Baseline, IndicatorDef, MissionContext, Reading, Source } from './types';

const NASA: Source = { label: 'NASA', url: 'https://www.nasa.gov/a', official: true };
const PROTO: Source = { label: 'Prototype', url: 'https://example.org/p', official: false };
const ctx: MissionContext = { environment: 'mars_transit', phase: 'cruise', missionDay: 10, arrivalDay: 180, commDelayMin: 14 };
const NOW = 1_000_000_000_000;
const MIN = 60_000;

const base: Pick<IndicatorDef, 'zone' | 'risks' | 'hazards' | 'input' | 'cadence' | 'howToMeasure' | 'whyItMatters'> = {
  zone: 'lungs', risks: ['hypoxia'], hazards: ['environment'], input: 'number', cadence: 'daily', howToMeasure: '', whyItMatters: '',
};
const co2: IndicatorDef = {
  ...base, id: 'cabin_co2', name: 'Cabin CO₂', unit: 'mmHg', staleAfterHours: 2, sources: [NASA, PROTO],
  thresholds: [
    { status: 'red', min: 6, label: '6 mmHg or more', source: PROTO },
    { status: 'yellow', min: 3, minExclusive: true, label: 'Above the NASA limit', source: NASA },
  ],
};
const sleep: IndicatorDef = {
  ...base, id: 'sleep_hours', name: 'Sleep', unit: 'h', zone: 'brain', staleAfterHours: 36, sources: [PROTO],
  thresholds: [
    { status: 'red', max: 4, label: 'Below 4 h', source: PROTO },
    { status: 'yellow', min: 4, max: 6, label: '4 to 6 h', source: PROTO },
    { status: 'yellow', sdFromBaseline: 2, label: 'Unusual for you', source: PROTO },
  ],
};
const reading = (indicatorId: string, value: number, ageMin: number, missionDay = 10): Reading => ({
  indicatorId, value, ts: NOW - ageMin * MIN, missionDay, phase: 'cruise', origin: 'manual',
});
const one = (def: IndicatorDef, rs: Reading[], baselines: Baseline[] = []) => evaluate([def], rs, baselines, ctx, NOW)[0];

const series = (value: number) => [60, 45, 30, 15, 0].map((age) => reading('cabin_co2', value, age));

describe('evaluate (P3-02)', () => {
  it('cabin CO₂: uses the hourly mean, treats equality as within limit, and distinguishes stale data', () => {
    expect(one(co2, series(3))).toMatchObject({ status: 'green', reason: 'Cabin CO₂ is in the expected range.' });
    const yellow = one(co2, series(4.1));
    expect(yellow.status).toBe('yellow');
    expect(yellow.reason).toContain('4.1 mmHg');
    expect(yellow.sources[0].official).toBe(true);
    expect(one(co2, series(6)).status).toBe('red');
    expect(one(co2, [reading('cabin_co2', 2.6, 180)])).toMatchObject({ status: 'stale', reason: 'Last reading is 3 h old.' });
    expect(one(co2, [reading('cabin_co2', 4.1, 1)])).toMatchObject({ status: 'stale', reason: 'Insufficient data for the 1-hour cabin CO₂ average.' });
    expect(one(co2, [])).toMatchObject({ status: 'stale', reason: 'No reading yet.' });
  });

  it('sleep: absolute bands win, then the personal baseline', () => {
    const b: Baseline[] = [{ indicatorId: 'sleep_hours', mean: 7, sd: 0.4, windowDays: 14 }];
    expect(one(sleep, [reading('sleep_hours', 6.4, 10)], b).status).toBe('green');
    const unusual = one(sleep, [reading('sleep_hours', 6.1, 10)], b);
    expect(unusual.status).toBe('yellow');
    expect(unusual.reason).toBe('Sleep is unusual for you (more than 2 SD from your last 14 days).');
    expect(one(sleep, [reading('sleep_hours', 5, 10)], b).reason).toBe('Sleep 5 h: 4 to 6 h.');
    expect(one(sleep, [reading('sleep_hours', 3.5, 10)], b).status).toBe('red');
    expect(one(sleep, [reading('sleep_hours', 6.1, 10)]).status).toBe('green'); // no baseline, no baseline band
  });

  it('reports days once a reading is two days old', () => {
    expect(one(sleep, [reading('sleep_hours', 7, 60 * 72)]).reason).toBe('Last reading is 3 days old.');
  });

  it('single fresh spike does not override a complete hourly mean; output follows defs order', () => {
    const rs = [...series(2.5), reading('cabin_co2', 7, 1), reading('sleep_hours', 7, 60 * 40)];
    const out = evaluate([sleep, co2], rs, [], ctx, NOW);
    expect(out.map((e) => e.indicatorId)).toEqual(['sleep_hours', 'cabin_co2']);
    expect(out[1].status).toBe('green');
    expect(out[0].status).toBe('stale');
  });

  it('de-duplicates sources by url', () => {
    const e = one(co2, series(4.1));
    expect(e.sources.map((s) => s.url)).toEqual([NASA.url, PROTO.url]);
  });

  it('statusOf returns the matched band', () => {
    expect(statusOf(co2, 4.1)).toMatchObject({ status: 'yellow', label: 'Above the NASA limit', fromBaseline: false });
    expect(statusOf(co2, 1)).toMatchObject({ status: 'green', label: null, source: null });
  });
});

describe('computeBaselines', () => {
  it('mean and sample SD over the window', () => {
    const rs = Array.from({ length: 10 }, (_, i) => reading('heart_rate', 60 + i, 0, i + 1));
    const [b] = computeBaselines(rs, 7, 10);
    expect(b.mean).toBe(66);
    expect(b.sd).toBeCloseTo(2.16, 2);
    expect(b.windowDays).toBe(7);
  });

  it('skips indicators with fewer than 5 readings', () => {
    const rs = [1, 2, 3, 4].map((d) => reading('mood', 4, 0, d));
    expect(computeBaselines(rs, 7, 10)).toEqual([]);
  });
});
