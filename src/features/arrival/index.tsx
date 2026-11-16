import { useMemo } from 'react';
import { Link } from 'wouter';
import { te, useLang } from '../../app/i18n';
import { engine } from '../../app/engine';
import { useApp } from '../../app/store';
import { dec, fill } from '../../app/format';
import { CREW } from '../../data/crew';
import { SRC } from '../../domain/indicators';
import type { Environment, LandingTaskId } from '../../domain/types';
import { StatusBadge } from '../../components/StatusBadge';
import { BTN_SECONDARY, CARD, PANEL, Screen, SourceList } from '../../components/ui';
import { CrewAvatar, useCrewCopy } from '../crew';

type Dest = 'mars' | 'moon' | 'earth';
/** Where this leg of the mission ends. */
const DEST: Record<Environment, Dest> = { iss: 'earth', orion: 'moon', moon: 'moon', mars_transit: 'mars', mars_surface: 'earth' };
const TASK_LABEL: Record<LandingTaskId, { en: string; es: string }> = {
  stand: { en: 'Stand up without fainting', es: 'Ponerte de pie sin desmayarte' },
  see: { en: 'Read the displays', es: 'Leer las pantallas' },
  move: { en: 'Climb out and walk', es: 'Salir y caminar' },
  think: { en: 'Run the landing checklist', es: 'Ejecutar el checklist de aterrizaje' },
};

/** Planetary arrival debrief: what the trip did to this body, explained for the new gravity. */
export function ArrivalScreen() {
  const readings = useApp((s) => s.readings);
  const ctx = useApp((s) => s.context);
  const plan = useApp((s) => s.plan);
  const nowTs = useApp((s) => s.nowTs);
  const crewId = useApp((s) => s.crewId);
  const lang = useLang();
  const t = useCrewCopy().arrival;
  const p = CREW[crewId];
  const dest = DEST[ctx.environment];

  const readiness = useMemo(() => engine.project(readings, ctx, plan), [readings, ctx, plan]);
  const openRed = useMemo(() => engine.findCompound(readings, ctx, nowTs).filter((f) => f.status === 'red'), [readings, ctx, nowTs]);
  const pct = (zone: string) => {
    const proj = readiness.projections.find((x) => x.zone === zone);
    return proj ? dec(Math.round(proj.atArrival * 10) / 10, lang) : '–';
  };

  const sections = [
    { key: 'ortho', title: t.sections.ortho.title, body: t.sections.ortho.body + (p.sex === 'female' ? ` ${fill(t.sections.ortho.female, { name: p.short })}` : ''), sources: [SRC.cardio, SRC.gravity] },
    { key: 'vestibular', title: t.sections.vestibular.title, body: t.sections.vestibular.body, sources: [SRC.sensorimotor] },
    { key: 'bone', title: t.sections.bone.title, body: fill(t.sections.bone.body, { bone: pct('bones'), leg: pct('muscles') }), sources: [SRC.bone, SRC.fitness, SRC.prototype] },
    { key: 'meds', title: t.sections.meds.title, body: t.sections.meds.body, sources: [SRC.cardio] },
    { key: 'env', title: t.envTitle, body: t.sections.env[dest], sources: dest === 'earth' ? [SRC.gravity] : [SRC.environment, SRC.dcs, SRC.radiation] },
  ];

  return (
    <Screen>
      <div className={`${CARD} flex flex-col gap-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <CrewAvatar id={crewId} size={56} />
          <div className="flex flex-1 flex-col">
            <h1 className="text-[34px] font-bold">{t.title}</h1>
            <span className="text-[18px] font-bold text-brand-ink">{t.dest[dest]}</span>
          </div>
        </div>
        <p className="text-ink-2">{fill(t.intro, { name: p.name })}</p>
        <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
          <div className={`${PANEL} flex flex-col gap-1`}>
            <span className="text-[15px] text-ink-2">{t.readiness}</span>
            <span className="tabular text-[48px] font-bold leading-none">{readiness.score}<span className="text-[20px] text-ink-2"> / 100</span></span>
            <span className="text-[15px]">{t.withPlan}: <b className="tabular">{readiness.scoreIfPlanFollowed}</b></span>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {readiness.tasks.map((task) => (
              <li key={task.id} className={`${PANEL} flex items-center justify-between gap-2`}>
                <span className="font-bold">{TASK_LABEL[task.id][lang]}</span>
                <StatusBadge status={task.status} size="sm" />
              </li>
            ))}
          </ul>
        </div>
        <p className={`${PANEL} font-bold`} role="status">
          {openRed.length ? `${t.notCleared} ${openRed.map((f) => te(f.title)).join(' · ')}` : t.cleared}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((s) => (
          <section key={s.key} className={`${CARD} flex flex-col gap-2`}>
            <h2 className="text-[22px] font-bold">{s.title}</h2>
            <p className="text-[18px]">{s.body}</p>
            <SourceList sources={s.sources} />
          </section>
        ))}
      </div>
      <Link href="/" className={BTN_SECONDARY}>{t.back}</Link>
    </Screen>
  );
}
