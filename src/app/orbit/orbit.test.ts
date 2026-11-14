import { describe, expect, it } from 'vitest';
import { engine, loadDemoMission } from '../engine';
import { buildOrbit, checkInStreak, worstFresh, type OrbitInput } from './orbit';

function sol142(over: Partial<OrbitInput> = {}): OrbitInput {
  const demo = loadDemoMission();
  return {
    readings: demo.history, ctx: demo.context, nowTs: demo.nowTs, plan: demo.defaultPlan,
    planAccepted: false, pending: null, verifications: [], briefQueuedTs: null, ...over,
  };
}

describe('Services Orbit view model', () => {
  it('shows six stations in loop order with the engine readiness at the core', () => {
    const input = sol142();
    const m = buildOrbit(input, engine);
    expect(m.stations.map((s) => s.id)).toEqual(['measure', 'understand', 'act', 'verify', 'escalate', 'environment']);
    expect(m.core.score).toBe(engine.project(input.readings, input.ctx, input.plan).score);
    for (const s of m.stations) {
      expect(s.progress).toBeGreaterThanOrEqual(0);
      expect(s.progress).toBeLessThanOrEqual(1);
      expect(s.datum).not.toMatch(/\{\w+\}/);
    }
  });

  it('opens Sol 142 on step 3: measured, understood, one action waiting', () => {
    const m = buildOrbit(sol142(), engine);
    expect(m.loop.done).toBe(2);
    expect(m.loop.steps.map((s) => s.state)).toEqual(['done', 'done', 'current', 'todo', 'todo']);
    expect(m.active).toBe('act');
    expect(m.rightNow.step).toBe('act');
    expect(m.rightNow.title).toMatch(/resistance session/);
    expect(m.rightNow.chips.some((c) => c.kind === 'prototype')).toBe(true);
    expect(m.stats.solsToLanding).toBe(38);
  });

  it('never shows missing data as green', () => {
    const m = buildOrbit(sol142(), engine);
    const by = Object.fromEntries(m.stations.map((s) => [s.id, s]));
    expect(by.verify.status).toBe('stale');     // nothing verified yet
    expect(by.escalate.status).toBe('stale');   // no brief sent
    const empty = buildOrbit(sol142({ readings: [] }), engine);
    expect(empty.stations.find((s) => s.id === 'measure')!.status).toBe('stale');
    expect(empty.stations.find((s) => s.id === 'environment')!.status).toBe('stale');
    expect(empty.rightNow.step).toBe('measure');
  });

  it('moves on to the brief once the plan is accepted, and closes when it is sent', () => {
    const input = sol142({ planAccepted: true });
    const acted = buildOrbit(input, engine);
    expect(acted.loop.steps[2].state).toBe('done');
    expect(acted.rightNow.cta.href).toBe('/brief');
    expect(acted.active).toBe('escalate');
    const sent = buildOrbit({ ...input, briefQueuedTs: input.nowTs }, engine);
    expect(sent.stations.find((s) => s.id === 'escalate')!.status).toBe('green');
  });

  it('puts an engine finding ahead of the plan', () => {
    const demo = loadDemoMission();
    const m = buildOrbit(sol142({ readings: [...demo.history, ...demo.beats.headache], nowTs: demo.beats.headache[0].ts }), engine);
    expect(m.rightNow.cta.href).toBe('/loop');
    expect(m.rightNow.why).toMatch(/Headache/);
    expect(m.stations.find((s) => s.id === 'act')!.datum).toMatch(/2 actions/);
  });

  it('helpers', () => {
    expect(worstFresh(['green', 'stale', 'yellow'])).toBe('yellow');
    expect(worstFresh(['stale'])).toBe('stale');
    expect(worstFresh([])).toBe('stale');
    const r = (d: number) => ({ indicatorId: 'mood', value: 4, ts: d, missionDay: d, phase: 'cruise' as const, origin: 'manual' as const });
    expect(checkInStreak([r(1), r(3), r(4), r(5)], 5)).toBe(3);
    expect(checkInStreak([r(3), r(4)], 5)).toBe(2);
    expect(checkInStreak([], 5)).toBe(0);
  });
});
