import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { te, ui, useLang } from '../../app/i18n';
import type { BodyZone, Projection } from '../../domain/types';
import { engine } from '../../app/engine';
import { useApp } from '../../app/store';
import { StatusBadge } from '../../components/StatusBadge';
import { BodyFigure, ZONE_LABEL } from './BodyFigure';
import { PlanPanel } from './PlanPanel';
import { WovenTimeline } from './WovenTimeline';
import { arrivalZones, biggestDrops, currentHabits, exerciseByDay, exerciseGap, fill, todayZones } from './zones';
import { dec } from '../../app/format';

const METRIC_LABEL: Record<string, string> = {
  bone_density_pct: 'Bone density',
  leg_strength_pct: 'Leg strength',
  orthostatic_tolerance_pct: 'Standing tolerance',
  vision_pct: 'Vision',
  alertness_pct: 'Alertness',
};

/**
 * Future Self (P1) — the hero screen. Today's body next to the body on the viewed day,
 * a woven timeline to scrub to arrival, and a plan whose every change moves the projection.
 */
export function FutureSelfScreen() {
  const readings = useApp((s) => s.readings);
  const ctx = useApp((s) => s.context);
  const nowTs = useApp((s) => s.nowTs);
  const plan = useApp((s) => s.plan);
  const setPlan = useApp((s) => s.setPlan);
  const lang = useLang();
  const storeViewDay = useApp((s) => s.viewDay);
  const setViewDay = useApp((s) => s.setViewDay);

  const [withPlan, setWithPlan] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [selected, setSelected] = useState<BodyZone | null>(null);

  const viewDay = Math.min(ctx.arrivalDay, Math.max(ctx.missionDay, storeViewDay));
  const atArrival = viewDay === ctx.arrivalDay;

  const evals = useMemo(() => engine.evaluate(readings, [], ctx, nowTs), [readings, ctx, nowTs]);
  const today = useMemo(() => todayZones(evals, engine.indicators()), [evals]);
  const readiness = useMemo(() => engine.project(readings, { ...ctx, arrivalDay: viewDay }, plan), [readings, ctx, viewDay, plan]);
  const future = arrivalZones(readiness, withPlan);
  const drops = biggestDrops(readiness.projections, withPlan);
  const exercise = useMemo(() => exerciseByDay(readings), [readings]);
  const habits = useMemo(() => currentHabits(readings, ctx.missionDay), [readings, ctx.missionDay]);
  const gap = useMemo(() => exerciseGap(readings, ctx.missionDay), [readings, ctx.missionDay]);

  const score = withPlan ? readiness.scoreIfPlanFollowed : readiness.score;
  const otherScore = withPlan ? readiness.score : readiness.scoreIfPlanFollowed;
  const selProjection: Projection | undefined = selected ? readiness.projections.find((p) => p.zone === selected) : undefined;
  const futureTitle = atArrival ? `${ui.future.arrival} · ${fill(ui.future.dayLabel, { day: viewDay })}` : fill(ui.future.ifLanding, { day: viewDay });

  return (
    <section className="mx-auto grid max-w-[1400px] gap-5 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,1fr)]">
      {/* Left: the double body + woven timeline */}
      <div className="flex flex-col gap-4 rounded-sheet bg-surface p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <figure className="flex flex-col items-center">
            <figcaption className="text-[20px] font-bold">
              {ui.future.today} · <span className="tabular">{fill(ui.future.dayLabel, { day: ctx.missionDay })}</span>
            </figcaption>
            <div className="h-[360px] w-full max-w-[220px]">
              <BodyFigure zones={today} variant="today" title={lang === 'es' ? `Tu cuerpo hoy, día ${ctx.missionDay}` : `Your body today, day ${ctx.missionDay}`} selected={selected} onSelect={setSelected} />
            </div>
          </figure>
          <figure className="flex flex-col items-center">
            <figcaption className="flex flex-col items-center text-[20px] font-bold text-future" aria-live="polite">
              {futureTitle}
              <span className="text-[15px] font-normal text-ink-2">
                {viewDay - ctx.missionDay === 1 ? ui.future.inOneDay : fill(ui.future.inDays, { days: viewDay - ctx.missionDay })}
              </span>
            </figcaption>
            <div className="h-[360px] w-full max-w-[220px]">
              <BodyFigure zones={future} variant="future" title={lang === 'es'
                ? `Tu cuerpo proyectado, día ${viewDay}, ${withPlan ? 'con tu plan' : 'con tus hábitos actuales'}`
                : `Your projected body, day ${viewDay}, ${withPlan ? 'with your plan' : 'with current habits'}`} selected={selected} onSelect={setSelected} />
            </div>
          </figure>
        </div>

        <ul className="flex min-h-10 flex-wrap justify-end gap-2" aria-label={lang === 'es' ? 'Mayores cambios para entonces' : 'Biggest changes by then'}>
          {drops.map((d) => (
            <li key={d.zone}>
              <button
                type="button"
                onClick={() => setSelected(d.zone)}
                className="min-h-10 rounded-full border border-future px-3 text-[15px] text-future"
              >
                {te(METRIC_LABEL[d.metric] ?? ZONE_LABEL[d.zone])}{' '}
                <span className="tabular font-semibold">{dec((d.to - d.from).toFixed(1), lang)} %</span>
              </button>
            </li>
          ))}
        </ul>

        <WovenTimeline today={ctx.missionDay} arrival={ctx.arrivalDay} value={viewDay} onChange={setViewDay} exercise={exercise} />
        <p className="text-center text-[15px] text-ink-2">{ui.future.sliderHint}</p>
      </div>

      {/* Right: readiness, plan toggle, landing tasks */}
      <div className="flex flex-col gap-4">
        <div className="rounded-sheet bg-surface p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[22px] font-bold">{ui.future.readiness}</h1>
              <p className="text-[15px] text-ink-2">{futureTitle}</p>
            </div>
            <div role="radiogroup" aria-label={lang === 'es' ? 'Modo de proyección' : 'Projection mode'} className="flex rounded-full bg-surface-2 p-1">
              {[false, true].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  role="radio"
                  aria-checked={withPlan === v}
                  onClick={() => setWithPlan(v)}
                  className={`min-h-12 rounded-full px-4 text-[15px] font-bold ${withPlan === v ? (v ? 'bg-future text-on-brand' : 'bg-ink text-bg') : 'text-ink-2'}`}
                >
                  {v ? ui.future.followPlan : ui.future.currentHabits}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 flex items-baseline gap-3">
            <span className={`tabular text-[64px] font-semibold leading-none ${withPlan ? 'text-future' : ''}`} data-testid="readiness-score">
              {score}
            </span>
            <span className="text-[18px] text-ink-2">
              {withPlan ? ui.future.currentHabits.toLowerCase() : ui.future.withPlan}:{' '}
              <span className="tabular font-semibold">{otherScore}</span>
            </span>
          </p>
          <p className="mt-3 text-[17px]">
            {gap.shortDays > 0 ? fill(ui.future.insight, { days: gap.shortDays, min: gap.missingMinPerDay }) : ui.future.insightOk}
          </p>
          <div className="mt-4 flex gap-3">
            <Link href="/check" className="flex min-h-[72px] flex-1 items-center justify-center rounded-card bg-brand px-5 text-center text-[19px] font-bold text-on-brand">
              {ui.home.startCheck}
            </Link>
            <button
              type="button"
              aria-expanded={planOpen}
              onClick={() => setPlanOpen((o) => !o)}
              className="min-h-[72px] rounded-card border-2 border-future px-5 text-[17px] font-bold text-future"
            >
              {planOpen ? ui.future.hidePlan : ui.future.adjustPlan}
            </button>
          </div>
          {planOpen && (
            <div className="mt-4">
              <PlanPanel
                plan={plan}
                current={habits}
                onChange={(p) => {
                  setPlan(p);
                  setWithPlan(true);
                }}
              />
            </div>
          )}
        </div>

        {selected ? (
          <ZoneWhy zone={selected} projection={selProjection} onClose={() => setSelected(null)} withPlan={withPlan} />
        ) : (
          <div className="rounded-sheet bg-surface p-5 shadow-sm">
            <h2 className="mb-3 text-[20px] font-bold">{ui.future.tasksTitle}</h2>
            <ul className="grid gap-2" aria-label={lang === 'es' ? 'Tareas del día de aterrizaje' : 'Landing day tasks'}>
              {readiness.tasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-card bg-surface-2 px-4 py-3">
                  <p className="flex-1 text-[18px] font-bold">{te(t.label)}</p>
                  <StatusBadge status={withPlan ? t.statusIfPlan : t.status} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function ZoneWhy({ zone, projection, onClose, withPlan }: { zone: BodyZone; projection?: Projection; onClose: () => void; withPlan: boolean }) {
  const lang = useLang();
  return (
    <div className="rounded-sheet bg-surface p-5 shadow-sm" role="region" aria-label={lang === 'es' ? `Detalles de ${te(ZONE_LABEL[zone])}` : `${ZONE_LABEL[zone]} details`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[22px] font-bold">{te(ZONE_LABEL[zone])}</h2>
        <button type="button" onClick={onClose} className="min-h-14 rounded-full px-4 font-bold text-brand-ink">
          {ui.future.close}
        </button>
      </div>
      {projection ? (
        <>
          <p className="mt-2 text-[18px]">
            {te(METRIC_LABEL[projection.metric] ?? projection.metric)}{': '}
            <span className="tabular font-semibold">{dec(projection.today, lang)} %</span> →{' '}
            <span className="tabular font-semibold text-future">{dec(withPlan ? projection.atArrivalIfPlanFollowed : projection.atArrival, lang)} %</span>{' '}
            <span className="text-ink-2">{ui.future.vsPreflight}</span>
          </p>
          <h3 className="mt-3 font-bold">{ui.future.model}</h3>
          <p className="text-[17px] text-ink-2">{te(projection.model)}</p>
          <h3 className="mt-3 font-bold">{ui.future.source}</h3>
          <ul className="mt-1 grid gap-1">
            {projection.sources.map((s) => (
              <li key={s.url + s.label} className="flex items-start gap-2 text-[15px]">
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[13px] font-bold ${s.official ? 'bg-brand text-on-brand' : 'bg-surface-2 text-ink-2'}`}>
                  {s.official ? ui.future.nasa : ui.future.prototype}
                </span>
                <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-2">
                  {te(s.label)}
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-ink-2">{ui.future.noProjection}</p>
      )}
    </div>
  );
}
