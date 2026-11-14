import { describe, expect, it } from 'vitest';
import { stubEngine as engine } from './stubEngine';
import { generateStubSol142 } from './stubData';

const demo = generateStubSol142();

describe('provisional engine on Sol 142', () => {
  it('morning check: everything that was measured today is not red', () => {
    const evals = engine.evaluate(demo.history, [], demo.context, demo.nowTs);
    expect(evals).toHaveLength(engine.indicators().length);
    expect(evals.filter((e) => e.status === 'red')).toEqual([]);
    const co2 = evals.find((e) => e.indicatorId === 'cabin_co2')!;
    expect(co2.status).toBe('green');
  });

  it('marks old readings as stale, never green', () => {
    const later = demo.nowTs + 3 * 3_600_000; // CO2 goes stale after 2 h
    const co2 = engine.evaluate(demo.history, [], demo.context, later).find((e) => e.indicatorId === 'cabin_co2')!;
    expect(co2.status).toBe('stale');
  });

  it('no compound finding in the morning; headache + CO2 + short sleep after the 13:10 beat', () => {
    expect(engine.findCompound(demo.history, demo.context)).toEqual([]);
    const findings = engine.findCompound([...demo.history, ...demo.beats.headache], demo.context);
    expect(findings).toHaveLength(1);
    expect(findings[0].status).toBe('yellow');
    expect(findings[0].because).toHaveLength(3);
    expect(findings[0].actions[0].recheckInMin).toBe(30);
    expect(findings[0].sources.some((s) => s.official)).toBe(true);
  });

  it('projection: plan raises readiness and keeps the 4 tasks in order', () => {
    const now = engine.project(demo.history, demo.context);
    const plan = engine.project(demo.history, demo.context, demo.defaultPlan);
    expect(now.tasks.map((t) => t.id)).toEqual(['stand', 'see', 'move', 'think']);
    expect(plan.scoreIfPlanFollowed).toBeGreaterThanOrEqual(now.score + 10);
    const bones = plan.projections.find((p) => p.zone === 'bones')!;
    expect(bones.series).toHaveLength(181);
    expect(bones.series[142].value).toBe(bones.series[142].valueIfPlan);
    for (const p of plan.projections) {
      expect(p.sources.some((s) => s.official)).toBe(true);
      expect(p.sources.some((s) => !s.official)).toBe(true);
    }
  });

  it('verification closes the loop and the brief respects the comm delay', () => {
    const [before] = demo.beats.headache;
    const [after] = demo.beats.verification;
    const v = engine.verify(before, after);
    expect(v.outcome).toBe('improved');
    const findings = engine.findCompound([...demo.history, ...demo.beats.headache], demo.context);
    const readiness = engine.project(demo.history, demo.context, demo.defaultPlan);
    const brief = engine.brief({ findings, verifications: [v], readiness, ctx: demo.context, nowTs: after.ts });
    expect(brief.arrivesAtTs).toBe(after.ts + 14 * 60_000);
    expect(brief.decisionRequested).toMatch(/No decision needed/);
    const silent = engine.brief({ findings, verifications: [v], readiness, ctx: { ...demo.context, commDelayMin: Infinity }, nowTs: after.ts });
    expect(silent.arrivesAtTs).toBeNull();
  });

  it('is deterministic', () => {
    expect(generateStubSol142()).toEqual(generateStubSol142());
  });
});
