import { useState } from 'react';
import ui from '../../../content/ui.json';
import flow from '../../../content/flow.json';
import type { Environment } from '../../domain/types';
import { useApp } from '../../app/store';
import { fill } from '../../app/format';
import { BTN_PRIMARY, CARD, Screen } from '../../components/ui';

/**
 * One-way delay per environment, in minutes. Mars values sit inside NASA's "up to 20 min";
 * the rest are seconds. Same table as DELAY_MIN in src/domain/loop.ts.
 */
const OPTIONS: { env: Environment; name: string; description: string; gravity: string; delay: string; delayMin: number }[] = [
  { env: 'iss', name: ui.environment.iss.name, description: ui.environment.iss.description, gravity: flow.environment.microG, delay: flow.environment.seconds, delayMin: 0 },
  { env: 'orion', name: ui.environment.orion.name, description: ui.environment.orion.description, gravity: flow.environment.microG, delay: flow.environment.seconds, delayMin: 0 },
  { env: 'moon', name: ui.environment.moon.name, description: ui.environment.moon.description, gravity: flow.environment.moonG, delay: flow.environment.seconds, delayMin: 0 },
  { env: 'mars_transit', name: ui.environment.marsTransit.name, description: ui.environment.marsTransit.description, gravity: flow.environment.microG, delay: fill(flow.environment.transitDelay, { min: 14 }), delayMin: 14 },
  { env: 'mars_surface', name: ui.environment.marsSurface.name, description: ui.environment.marsSurface.description, gravity: flow.environment.marsG, delay: flow.environment.surfaceDelay, delayMin: 20 },
];

/** Where the crew is: sets gravity for the projection and the delay the brief has to respect. */
export function EnvironmentScreen() {
  const ctx = useApp((s) => s.context);
  const setEnvironment = useApp((s) => s.setEnvironment);
  const [env, setEnv] = useState<Environment>(ctx.environment);
  const [conjunction, setConjunction] = useState(!Number.isFinite(ctx.commDelayMin));
  const [applied, setApplied] = useState<string | null>(null);

  const choice = OPTIONS.find((o) => o.env === env)!;
  const inUse = ctx.environment === env && !Number.isFinite(ctx.commDelayMin) === conjunction;
  const apply = () => {
    setEnvironment(env, conjunction ? Infinity : choice.delayMin);
    setApplied(choice.name);
  };

  return (
    <Screen>
      <div className={`${CARD} flex flex-1 flex-col gap-4`}>
        <h1 className="text-[34px] font-bold">{ui.environment.title}</h1>
        <p className="text-ink-2">{flow.environment.hint}</p>

        <div role="radiogroup" aria-label={ui.environment.title} className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OPTIONS.map((o) => {
            const on = o.env === env;
            return (
              <button key={o.env} type="button" role="radio" aria-checked={on} onClick={() => { setEnv(o.env); setApplied(null); }}
                className={`flex min-h-[150px] flex-col gap-1 rounded-card border-2 p-5 text-left ${on ? 'border-brand bg-brand-bg' : 'border-line bg-surface-2'}`}>
                <span className="flex items-center justify-between text-[22px] font-bold">
                  {o.name}
                  {ctx.environment === o.env && <span className="rounded-full border border-brand px-2 text-[15px] text-brand">{flow.environment.current}</span>}
                </span>
                <span className="text-[15px] text-ink-2">{o.description}</span>
                <span className="mt-auto text-[15px] text-ink-2">{ui.environment.gravity} · {o.gravity}</span>
                <span className="text-[15px] text-ink-2">{ui.environment.oneWayDelay} · {o.delay}</span>
              </button>
            );
          })}
          <button type="button" role="switch" aria-checked={conjunction} onClick={() => { setConjunction(!conjunction); setApplied(null); }}
            className={`flex min-h-[150px] flex-col justify-center gap-3 rounded-card border-2 p-5 text-left ${conjunction ? 'border-stale bg-stale-bg' : 'border-line'}`}>
            <span className={`flex h-9 w-16 items-center rounded-full p-1 ${conjunction ? 'justify-end bg-stale' : 'justify-start bg-surface-3'}`} aria-hidden>
              <span className="h-7 w-7 rounded-full bg-surface" />
            </span>
            <span className="text-[18px] font-bold">{ui.environment.conjunction}</span>
          </button>
        </div>

        <p className="min-h-6 text-ink-2" role="status">{applied ? fill(flow.environment.applied, { name: applied }) : ''}</p>
        <button type="button" className={BTN_PRIMARY} disabled={inUse} onClick={apply}>{ui.environment.use}</button>
      </div>
    </Screen>
  );
}
