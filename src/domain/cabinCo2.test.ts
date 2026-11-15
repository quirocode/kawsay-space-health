import { describe, expect, it } from 'vitest';
import { cabinCo2 } from './cabinCo2';
import type { Reading } from './types';

const now = 6_000_000;
const sample = (minAgo: number, value: number): Reading => ({
  indicatorId: 'cabin_co2', value, ts: now - minAgo * 60_000, missionDay: 142, phase: 'cruise', origin: 'sensor_sim',
});

describe('rolling cabin CO₂', () => {
  it('weights by time, ignores future readings and does not count duplicate timestamps twice', () => {
    const data = [sample(60, 2), sample(50, 2), sample(40, 4), sample(30, 4), sample(20, 4), sample(10, 4), sample(-1, 99), sample(30, 4)];
    expect(cabinCo2(data, now)).toMatchObject({ value: 3.333333333, count: 6, coveredMinutes: 60, origins: ['sensor_sim'] });
  });

  it('refuses to classify an incomplete window even when the last reading is fresh', () => {
    expect(cabinCo2([sample(60, 4), sample(30, 4), sample(15, 4), sample(1, 4)], now))
      .toMatchObject({ value: null, coveredMinutes: 45, latest: sample(1, 4) });
    expect(cabinCo2([sample(1, 0)], now)).toMatchObject({ value: null, coveredMinutes: 1 });
  });
});
