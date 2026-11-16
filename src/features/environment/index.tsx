import { useState, type FormEvent } from 'react';
import { ui } from '../../app/i18n';
import { flow } from '../../app/i18n';
import type { Environment } from '../../domain/types';
import { MAX_MISSION_DAYS, useApp } from '../../app/store';
import { fill } from '../../app/format';
import { BTN_PRIMARY, CARD, Screen } from '../../components/ui';

/**
 * One-way delay per environment, in minutes. Mars values sit inside NASA's "up to 20 min";
 * the rest are seconds. Same table as DELAY_MIN in src/domain/loop.ts.
 */

/** Where the crew is: sets gravity for the projection and the delay the brief has to respect. */
export function EnvironmentScreen() {
  const ctx = useApp((s) => s.context);
  const setEnvironment = useApp((s) => s.setEnvironment);
  const [applied, setApplied] = useState<string | null>(null);

  const options: { env: Environment; name: string; description: string; gravity: string; delay: string; delayMin: number }[] = [
    { env: 'iss', name: ui.environment.iss.name, description: ui.environment.iss.description, gravity: flow.environment.microG, delay: flow.environment.seconds, delayMin: 0.002 },
    { env: 'orion', name: ui.environment.orion.name, description: ui.environment.orion.description, gravity: flow.environment.microG, delay: flow.environment.seconds, delayMin: 0.02 },
    { env: 'moon', name: ui.environment.moon.name, description: ui.environment.moon.description, gravity: flow.environment.moonG, delay: flow.environment.seconds, delayMin: 0.022 },
    { env: 'mars_transit', name: ui.environment.marsTransit.name, description: ui.environment.marsTransit.description, gravity: flow.environment.microG, delay: fill(flow.environment.transitDelay, { min: 14 }), delayMin: 14 },
    { env: 'mars_surface', name: ui.environment.marsSurface.name, description: ui.environment.marsSurface.description, gravity: flow.environment.marsG, delay: flow.environment.surfaceDelay, delayMin: 20 },
  ];

  // Choosing applies at once, so the header always shows where the crew is.
  const env = ctx.environment;
  const conjunction = !Number.isFinite(ctx.commDelayMin);
  const choose = (o: (typeof options)[number], conj: boolean) => {
    setEnvironment(o.env, conj ? Infinity : o.delayMin);
    setApplied(conj ? ui.environment.conjunction : o.name);
  };

  return (
    <Screen>
      <MissionEditor />
      <div className={`${CARD} flex flex-1 flex-col gap-4`}>
        <h2 className="text-[34px] font-bold">{ui.environment.title}</h2>
        <p className="text-ink-2">{flow.environment.hint}</p>

        <div role="radiogroup" aria-label={ui.environment.title} className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {options.map((o) => {
            const on = o.env === env;
            return (
              <button key={o.env} type="button" role="radio" aria-checked={on} onClick={() => choose(o, conjunction)}
                className={`flex min-h-[150px] flex-col gap-1 rounded-card border-2 p-5 text-left ${on ? 'border-brand-ink bg-brand-bg' : 'border-line bg-surface-2'}`}>
                <span className="flex items-center justify-between text-[22px] font-bold">
                  {o.name}
                  {on && <span className="rounded-full border border-brand-ink px-2 text-[15px] text-brand-ink">{flow.environment.current}</span>}
                </span>
                <span className="text-[15px] text-ink-2">{o.description}</span>
                <span className="mt-auto text-[15px] text-ink-2">{ui.environment.gravity} · {o.gravity}</span>
                <span className="text-[15px] text-ink-2">{ui.environment.oneWayDelay} · {o.delay}</span>
              </button>
            );
          })}
          <button type="button" role="switch" aria-checked={conjunction} onClick={() => choose(options.find((o) => o.env === env)!, !conjunction)}
            className={`flex min-h-[150px] flex-col justify-center gap-3 rounded-card border-2 p-5 text-left ${conjunction ? 'border-stale bg-stale-bg' : 'border-line'}`}>
            <span className={`flex h-9 w-16 items-center rounded-full p-1 ${conjunction ? 'justify-end bg-stale' : 'justify-start bg-surface-3'}`} aria-hidden>
              <span className="h-7 w-7 rounded-full bg-surface" />
            </span>
            <span className="text-[18px] font-bold">{ui.environment.conjunction}</span>
          </button>
        </div>

        <p className="min-h-6 text-ink-2" role="status">{applied ? fill(flow.environment.applied, { name: applied }) : ''}</p>
      </div>
    </Screen>
  );
}

/** Mission name, crew member, today's mission day and landing day. Day 1 is launch day. */
function MissionEditor() {
  const ctx = useApp((s) => s.context);
  const mission = useApp((s) => s.mission);
  const setMission = useApp((s) => s.setMission);
  const m = ui.mission;
  const [name, setName] = useState(mission.name);
  const [crew, setCrew] = useState(mission.crew);
  const [day, setDay] = useState(String(ctx.missionDay));
  const [landing, setLanding] = useState(String(ctx.arrivalDay));
  const [saved, setSaved] = useState<string | null>(null);

  const d = Number(day);
  const l = Number(landing);
  const whole = (n: number) => Number.isInteger(n) && n >= 1 && n <= MAX_MISSION_DAYS;
  const error = !whole(d) || !whole(l) ? fill(m.invalidRange, { max: MAX_MISSION_DAYS }) : l < d ? m.invalidOrder : null;
  const field = 'min-h-14 w-full rounded-card border-2 border-line bg-surface-2 px-4 text-[20px] focus:border-brand-ink';
  const onlyDigits = (v: string) => v.replace(/\D/g, '').slice(0, 4);

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (error) return;
    setMission({ name, crew, missionDay: d, arrivalDay: l });
    const st = useApp.getState();
    setName(st.mission.name);
    setCrew(st.mission.crew);
    setSaved(fill(m.saved, { name: st.mission.name, day: st.context.missionDay, total: st.context.arrivalDay }));
  };

  return (
    <form onSubmit={save} className={`${CARD} flex flex-col gap-4`} aria-labelledby="mission-edit-title">
      <h1 id="mission-edit-title" className="text-[34px] font-bold">{m.editTitle}</h1>
      <p className="text-ink-2">{m.editHint}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-[15px] text-ink-2">
          {m.name}
          <input className={`${field} text-ink`} value={name} maxLength={40} onChange={(e) => { setName(e.target.value); setSaved(null); }} />
        </label>
        <label className="flex flex-col gap-1 text-[15px] text-ink-2">
          {m.crew}
          <input className={`${field} text-ink`} value={crew} maxLength={40} onChange={(e) => { setCrew(e.target.value); setSaved(null); }} />
        </label>
        <label className="flex flex-col gap-1 text-[15px] text-ink-2">
          {m.dayField}
          <input className={`${field} tabular text-ink`} inputMode="numeric" value={day} aria-invalid={!!error}
            onChange={(e) => { setDay(onlyDigits(e.target.value)); setSaved(null); }} />
        </label>
        <label className="flex flex-col gap-1 text-[15px] text-ink-2">
          {m.landingField}
          <input className={`${field} tabular text-ink`} inputMode="numeric" value={landing} aria-invalid={!!error}
            onChange={(e) => { setLanding(onlyDigits(e.target.value)); setSaved(null); }} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className={`${BTN_PRIMARY} min-h-14`} disabled={!!error}>{m.save}</button>
        <p role="status" className={error ? 'font-bold text-act' : 'text-ink-2'}>{error ?? saved ?? ''}</p>
      </div>
    </form>
  );
}
