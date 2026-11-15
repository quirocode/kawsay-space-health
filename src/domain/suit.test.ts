import { describe, expect, it } from 'vitest';
import { adviseSuit, evaluateSuit, FLIGHT_PHASES, PHASE_SIGNALS, SCENARIOS, seeded, simulate, statusOf, SUIT_SIGNALS } from './suit';

describe('seeded', () => {
  it('replays the same sequence for the same seed', () => {
    const a = seeded(42), b = seeded(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe('simulate', () => {
  it('is deterministic for phase + scenario + run', () => {
    expect(simulate('eva', 'watch', 3)).toEqual(simulate('eva', 'watch', 3));
  });

  it('returns exactly the signals each phase watches', () => {
    for (const p of FLIGHT_PHASES) expect(simulate(p, 'nominal').map((s) => s.id)).toEqual(PHASE_SIGNALS[p]);
  });

  it('nominal is all green, watch is yellow, act is red, in every phase and run', () => {
    const want = { nominal: 'green', watch: 'yellow', act: 'red' } as const;
    for (const p of FLIGHT_PHASES) for (const s of SCENARIOS) for (const run of [0, 1, 2, 7]) {
      expect(adviseSuit(p, evaluateSuit(simulate(p, s, run))).status, `${p}/${s}/${run}`).toBe(want[s]);
    }
  });
});

describe('statusOf', () => {
  it('treats the 4.3 psi EMU pressure as green and a drop as red', () => {
    expect(statusOf(SUIT_SIGNALS.suit_pressure, 4.3)).toBe('green');
    expect(statusOf(SUIT_SIGNALS.suit_pressure, 3.5)).toBe('red');
  });
  it('turns a missing prebreathe red and missing fluid loading yellow', () => {
    expect(statusOf(SUIT_SIGNALS.prebreathe_done, 0)).toBe('red');
    expect(statusOf(SUIT_SIGNALS.fluid_loading_done, 0)).toBe('yellow');
  });
});

describe('adviseSuit', () => {
  it('ends the EVA and returns to pressure on DCS symptoms, first', () => {
    const v = adviseSuit('eva', evaluateSuit([{ id: 'dcs_symptoms', value: 1 }, { id: 'heart_rate', value: 110 }]));
    expect(v.steps[0].id).toBe('end_eva_repress');
    expect(v.escalate).toBe(true);
  });
  it('asks for fluid loading and compression before entry', () => {
    const v = adviseSuit('entry', evaluateSuit(simulate('entry', 'act')));
    expect(v.steps.map((s) => s.id)).toEqual(expect.arrayContaining(['fluid_load', 'compression']));
  });
  it('keeps the crew member lying down after landing when the stand test is red', () => {
    const v = adviseSuit('post_landing', evaluateSuit(simulate('post_landing', 'act')));
    expect(v.steps[0].id).toBe('lie_down');
    expect(v.steps.some((s) => s.id === 'no_critical_tasks')).toBe(true);
  });
  it('never gives more than five steps and every step says why', () => {
    for (const p of FLIGHT_PHASES) for (const s of SCENARIOS) {
      const v = adviseSuit(p, evaluateSuit(simulate(p, s)));
      expect(v.steps.length).toBeLessThanOrEqual(5);
      for (const step of v.steps) expect(step.sources.length).toBeGreaterThan(0);
    }
  });
  it('every signal carries at least one source', () => {
    for (const d of Object.values(SUIT_SIGNALS)) expect(d.sources.length).toBeGreaterThan(0);
  });
});
