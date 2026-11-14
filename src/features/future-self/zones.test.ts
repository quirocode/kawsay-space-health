import { describe, expect, it } from 'vitest';
import { stubEngine as engine } from '../../app/engine/stubEngine';
import { generateStubSol142 } from '../../app/engine/stubData';
import { arrivalZones, biggestDrops, exerciseGap, todayZones } from './zones';

const demo = generateStubSol142();

describe('Future Self zone mapping', () => {
  it('today: Sol 142 morning has no red zone and every measured zone is coloured', () => {
    const z = todayZones(engine.evaluate(demo.history, [], demo.context, demo.nowTs), engine.indicators());
    expect(Object.values(z)).not.toContain('red');
    expect(z.lungs).toBe('green');
  });

  it('today: zones whose readings are all old show as stale, never green', () => {
    const later = demo.nowTs + 10 * 86_400_000;
    const z = todayZones(engine.evaluate(demo.history, [], demo.context, later), engine.indicators());
    expect(z.heart).toBe('stale');
    expect(Object.values(z)).not.toContain('green');
  });

  it('arrival: bones are Watch with current habits; heart turns OK with the plan', () => {
    const r = engine.project(demo.history, demo.context, demo.defaultPlan);
    expect(arrivalZones(r, false).bones).toBe('yellow');
    expect(arrivalZones(r, true).heart).toBe('green');
    expect(arrivalZones(r, true).muscles).toBe('green'); // not dragged down by bones sharing the "move" task
    expect(arrivalZones(r, true).bones).toBe('yellow');
    expect(arrivalZones(r, false).lungs).toBe('none');
  });

  it('drops are sorted and capped', () => {
    const r = engine.project(demo.history, demo.context, demo.defaultPlan);
    const d = biggestDrops(r.projections, false);
    expect(d.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < d.length; i++) expect(d[i - 1].from - d[i - 1].to).toBeGreaterThanOrEqual(d[i].from - d[i].to);
  });

  it('exercise gap: six short days in the last week', () => {
    const g = exerciseGap(demo.history, demo.context.missionDay);
    expect(g.shortDays).toBe(6);
    expect(g.missingMinPerDay).toBeGreaterThan(25);
  });
});
