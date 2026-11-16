import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useLang } from '../../app/i18n';
import { useApp } from '../../app/store';
import { DEFAULT_PATIENT, SCENARIOS, SIM_DELAY_MIN, scenarioReadings, type HazardScenario } from '../../app/simulator';
import { CREW, CREW_IDS, type CrewId } from '../../data/crew';
import type { Environment } from '../../domain/types';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, Screen } from '../../components/ui';
import { CrewAvatar, useCrewCopy } from '../crew';

const ENVS: Environment[] = ['iss', 'orion', 'moon', 'mars_transit', 'mars_surface'];
const HAZARD_ICON: Record<HazardScenario, string> = { cardio: '♥', bone: '⬢', radiation: '☢', co2: '≋', isolation: '☾' };

/** The judges' entry point: pick a person, a place and a hazard; KAWSAY does the rest. */
export function SimulatorScreen() {
  const ctx = useApp((s) => s.context);
  const nowTs = useApp((s) => s.nowTs);
  const apply = useApp((s) => s.applyScenario);
  const reset = useApp((s) => s.resetDemo);
  const lang = useLang();
  const t = useCrewCopy();
  const [, navigate] = useLocation();
  const [patient, setPatient] = useState<CrewId | null>(null);
  const [env, setEnv] = useState<Environment>(ctx.environment);
  const [hazard, setHazard] = useState<HazardScenario>('cardio');

  const who = patient ?? DEFAULT_PATIENT[hazard];
  const run = () => {
    // An hour later on the ship clock, so the simulated readings are the newest ones.
    const at = nowTs + 60 * 60_000;
    const context = { ...ctx, environment: env };
    apply({ add: scenarioReadings(hazard, who, context, at), focus: who, nowTs: at, environment: env, commDelayMin: SIM_DELAY_MIN[env] });
    navigate('/crew');
  };
  const choice = (on: boolean) => `flex flex-col gap-1 rounded-card border-2 p-4 text-left ${on ? 'border-brand-ink bg-brand-bg' : 'border-line hover:bg-surface-2'}`;

  return (
    <Screen>
      <div className={`${CARD} flex flex-col gap-5`}>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[34px] font-bold">{t.sim.title}</h1>
          <span className="rounded-full border-2 border-watch px-3 py-1 text-[14px] font-bold text-watch">{t.sim.badge}</span>
        </div>
        <p className="text-ink-2">{t.sim.intro}</p>

        <section className="flex flex-col gap-3">
          <h2 className="text-[22px] font-bold">{t.sim.stepA}</h2>
          <div role="radiogroup" aria-label={t.sim.stepA} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {CREW_IDS.map((id) => (
              <button key={id} type="button" role="radio" aria-checked={who === id} onClick={() => setPatient(id)} className={`${choice(who === id)} min-h-[140px] items-center text-center`}>
                <CrewAvatar id={id} size={64} />
                <span className="font-bold">{CREW[id].name}</span>
                <span className="text-[14px] text-ink-2">{CREW[id].role[lang]}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-[22px] font-bold">{t.sim.stepB}</h2>
          <div role="radiogroup" aria-label={t.sim.stepB} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {ENVS.map((e) => (
              <button key={e} type="button" role="radio" aria-checked={env === e} onClick={() => setEnv(e)} className={`${choice(env === e)} min-h-[110px]`}>
                <span className="font-bold">{t.sim.env[e].name}</span>
                <span className="text-[14px] text-ink-2">{t.sim.env[e].detail}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-[22px] font-bold">{t.sim.stepC}</h2>
          <div role="radiogroup" aria-label={t.sim.stepC} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {SCENARIOS.map((h) => (
              <button key={h} type="button" role="radio" aria-checked={hazard === h} onClick={() => setHazard(h)} className={`${choice(hazard === h)} min-h-[150px]`}>
                <span aria-hidden className="text-[28px] leading-none">{HAZARD_ICON[h]}</span>
                <span className="font-bold">{t.sim.hazards[h].name}</span>
                <span className="text-[13px] font-bold uppercase tracking-wide text-ink-2">{t.sim.hazards[h].hazard}</span>
                <span className="text-[14px] text-ink-2">{t.sim.hazards[h].detail}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <button type="button" className={BTN_PRIMARY} onClick={run}>{t.sim.run} · {CREW[who].short}</button>
          <button type="button" className={BTN_SECONDARY} onClick={() => { reset(); setPatient(null); }}>{t.sim.reset}</button>
        </div>
        <Link href="/arrival" className="font-bold text-brand-ink underline">{t.arrival.cta} →</Link>
      </div>
    </Screen>
  );
}

/** Banner for Future Self: the simulator is three clicks away. */
export function SimulatorBanner() {
  const t = useCrewCopy();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border-2 border-watch bg-watch-bg p-4">
      <span className="flex-1 font-bold">{t.sim.banner}</span>
      <Link href="/simulator" className="flex min-h-12 items-center rounded-card bg-brand px-5 font-bold text-on-brand">{t.sim.bannerCta}</Link>
    </div>
  );
}
