import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { te, ui, useLang } from '../../app/i18n';
import type { BodyZone, Projection, Reading } from '../../domain/types';
import { engine } from '../../app/engine';
import { useApp } from '../../app/store';
import { StatusBadge } from '../../components/StatusBadge';
import { AnatomyModeSwitch, BodyFigure, ZONE_LABEL } from './BodyFigure';
import { PlanPanel } from './PlanPanel';
import { WovenTimeline } from './WovenTimeline';
import { arrivalZones, biggestDrops, currentHabits, exerciseByDay, exerciseGap, fill, todayZones } from './zones';
import { Glyph } from '../../app/WorkspaceNav';
import anatomyCopy from '../../../content/anatomy.json';
import { readingOrigin } from '../../components/readingEvidence';
import { cabinCo2 } from '../../domain/cabinCo2';
import { ago, dec } from '../../app/format';
import { SimulatorBanner } from '../simulator';

const METRIC_LABEL: Record<string, string> = {
  bone_density_pct: 'Bone density',
  leg_strength_pct: 'Leg strength',
  orthostatic_tolerance_pct: 'Standing tolerance',
  vision_pct: 'Vision',
  alertness_pct: 'Alertness',
};

const PROJECTION_INPUTS: Record<string, string[]> = {
  bone_density_pct: ['exercise_min'],
  leg_strength_pct: ['exercise_min'],
  orthostatic_tolerance_pct: ['exercise_min', 'water_ml'],
  vision_pct: ['symptom_vision'],
  alertness_pct: ['sleep_hours'],
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
  const es = lang === 'es';
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

  const showDetails = () => document.getElementById('dashboard-details')?.focus();

  // Full screen for the body comparison, so the crew can look at the anatomy closely.
  const anatomyRef = useRef<HTMLDivElement>(null);
  const [big, setBig] = useState(false);
  useEffect(() => {
    const onChange = () => setBig(document.fullscreenElement === anatomyRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleBig = () => {
    const el = anatomyRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el.requestFullscreen) void el.requestFullscreen().catch(() => setBig((b) => !b));
    else setBig((b) => !b);
  };

  return (
    <section className="dashboard">
      <div className="dashboard-heading">
        <div>
          <h1>{es ? 'Tu salud al aterrizar' : 'Your health at landing'}</h1>
          <p>{es ? 'Compara tu estado actual con la proyección para el día de llegada.' : 'Compare your health today with the projection for landing day.'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="dashboard-secondary !w-auto" href="/check"><Glyph name="check"/>{ui.home.startCheck}</Link>
          <Link className="dashboard-secondary !w-auto" href="/mission-guide"><Glyph name="missionGuide"/>{es ? 'Demo guiada' : 'Guided demo'}</Link>
          <Link className="dashboard-primary" href="/arrival"><Glyph name="arrival"/>{es ? 'Informe de aterrizaje' : 'Landing debrief'}</Link>
        </div>
      </div>
      <SimulatorBanner />
      <div className="dashboard-grid">
      <div className="dashboard-anatomy dashboard-card" ref={anatomyRef}>
        <header className="dashboard-card-heading">
          <div><h2>{es ? 'Comparación corporal' : 'Body comparison'}</h2><p>{anatomyCopy[lang].gesture}</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={toggleBig} aria-pressed={big}
              className="flex min-h-11 items-center gap-2 rounded-full border-2 border-brand-ink px-4 font-bold text-brand-ink">
              <span aria-hidden>{big ? '⤡' : '⤢'}</span>{big ? (es ? 'Reducir' : 'Exit full screen') : (es ? 'Agrandar cuerpo' : 'Enlarge body')}
            </button>
            <AnatomyModeSwitch />
          </div>
        </header>
        <div className="dashboard-timeline">
          <div><strong>{es ? 'Día de proyección' : 'Projection day'}</strong><span>{ui.future.sliderHint}</span></div>
          <WovenTimeline today={ctx.missionDay} arrival={ctx.arrivalDay} value={viewDay} onChange={setViewDay} exercise={exercise} />
        </div>
        <div className="dashboard-figures">
          <figure className="dashboard-figure">
            <figcaption className="dashboard-figure-title">
              <span>{ui.future.today} · {fill(ui.future.dayLabel, { day: ctx.missionDay })}</span>
            </figcaption>
            <div className="w-full">
              <BodyFigure sharedControls onShowDetails={showDetails} zones={today} variant="today" title={lang === 'es' ? `Tu cuerpo hoy, día ${ctx.missionDay}` : `Your body today, day ${ctx.missionDay}`} selected={selected} onSelect={setSelected} />
            </div>
          </figure>
          <figure className="dashboard-figure">
            <figcaption className="dashboard-figure-title text-future" aria-live="polite">
              {futureTitle}
              <span className="text-[15px] font-normal text-ink-2">
                {viewDay - ctx.missionDay === 1 ? ui.future.inOneDay : fill(ui.future.inDays, { days: viewDay - ctx.missionDay })}
              </span>
            </figcaption>
            <div className="w-full">
              <BodyFigure sharedControls onShowDetails={showDetails} zones={future} variant="future" title={lang === 'es'
                ? `Tu cuerpo proyectado, día ${viewDay}, ${withPlan ? 'con tu plan' : 'con tus hábitos actuales'}`
                : `Your projected body, day ${viewDay}, ${withPlan ? 'with your plan' : 'with current habits'}`} selected={selected} onSelect={setSelected} />
            </div>
          </figure>
        </div>

        <ul className="dashboard-impact" aria-label={lang === 'es' ? 'Mayores cambios para entonces' : 'Biggest changes by then'}>
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

      </div>
        <div className="dashboard-readiness dashboard-card">
          <div className="dashboard-card-heading">
            <div><h2>{ui.future.readiness}</h2><p>{futureTitle}</p><p className="mt-1 font-semibold text-brand-ink">{es ? 'Estimación del prototipo' : 'Prototype estimate'}</p></div>
            <span className="dashboard-score-mark"><Glyph name="watch" /></span>
          </div>
          <div className="dashboard-score-row">
            <div><span data-testid="readiness-score">{score}</span><small> / 100</small></div>
            <p>{withPlan ? ui.future.currentHabits : ui.future.withPlan}<strong>{otherScore} / 100</strong></p>
          </div>
          <div className="dashboard-meter" aria-hidden="true"><span style={{ width: `${score}%` }} /></div>
          <div role="radiogroup" aria-label={es ? 'Modo de proyección' : 'Projection mode'} className="workspace-segmented dashboard-plan-switch">
              {[false, true].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  role="radio"
                  aria-checked={withPlan === v}
                  onClick={() => setWithPlan(v)}
                >
                  {v ? ui.future.followPlan : ui.future.currentHabits}
                </button>
              ))}
          </div>
          <p className="dashboard-insight">
            {gap.shortDays > 0 ? fill(ui.future.insight, { days: gap.shortDays, min: gap.missingMinPerDay }) : ui.future.insightOk}
          </p>
          <div className="mt-4">
            <button
              type="button"
              aria-expanded={planOpen}
              onClick={() => setPlanOpen((o) => !o)}
              className="dashboard-secondary"
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

        <div className="dashboard-details" id="dashboard-details" tabIndex={-1}>
        {selected ? (
          <ZoneWhy zone={selected} projection={selProjection} readings={readings} nowTs={nowTs} onClose={() => setSelected(null)} withPlan={withPlan} />
        ) : (
          <div className="dashboard-card">
            <h2 className="mb-3 text-[19px] font-bold">{ui.future.tasksTitle}</h2>
            <ul className="grid gap-2" aria-label={lang === 'es' ? 'Tareas del día de aterrizaje' : 'Landing day tasks'}>
              {readiness.tasks.map((t) => (
                <li key={t.id} className="dashboard-task">
                  <p className="flex-1 text-[15px] font-bold">{te(t.label)}</p>
                  <StatusBadge status={withPlan ? t.statusIfPlan : t.status} />
                </li>
              ))}
            </ul>
          </div>
        )}
        </div>
      </div>
    </section>
  );
}

function ZoneWhy({ zone, projection, readings, nowTs, onClose, withPlan }: {
  zone: BodyZone; projection?: Projection; readings: Reading[]; nowTs: number; onClose: () => void; withPlan: boolean;
}) {
  const lang = useLang();
  const es = lang === 'es';
  const ids = projection ? PROJECTION_INPUTS[projection.metric] ?? [] : [];
  const evidence = engine.indicators()
    .filter((def) => ids.length ? ids.includes(def.id) : def.zone === zone)
    .map((def) => {
      const latest = readings.reduce<Reading | undefined>((best, reading) => reading.indicatorId === def.id &&
        reading.ts <= nowTs && (!best || reading.ts >= best.ts) ? reading : best, undefined);
      return { def, latest };
    }).filter((entry): entry is { def: typeof entry.def; latest: Reading } => Boolean(entry.latest))
    .sort((a, b) => b.latest.ts - a.latest.ts).slice(0, 3);
  const co2 = zone === 'lungs' ? cabinCo2(readings, nowTs).value : null;
  return (
    <div className="dashboard-card" role="region" aria-label={lang === 'es' ? `Detalles de ${te(ZONE_LABEL[zone])}` : `${ZONE_LABEL[zone]} details`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[22px] font-bold">{te(ZONE_LABEL[zone])}</h2>
        <button type="button" onClick={onClose} className="min-h-14 rounded-full px-4 font-bold text-brand-ink">
          {ui.future.close}
        </button>
      </div>
      {projection ? (
        <>
          <p className="mt-2 font-semibold">{te(METRIC_LABEL[projection.metric] ?? projection.metric)}</p>
          <p className="text-xs text-ink-2">{ui.future.vsPreflight}</p>
          <dl className="mt-3 grid grid-cols-3 gap-2">
            {([
              [ui.future.today, projection.today, false],
              [ui.future.currentHabits, projection.atArrival, !withPlan],
              [ui.future.followPlan, projection.atArrivalIfPlanFollowed, withPlan],
            ] as const).map(([label, value, selected]) => <div key={label} className={`rounded-lg border p-2 ${selected ? 'border-future bg-brand-bg' : 'border-line bg-surface-2'}`}>
              <dt className="text-xs text-ink-2">{label}</dt>
              <dd className="mt-1 tabular text-sm font-bold">{dec(value, lang)} %</dd>
            </div>)}
          </dl>
          <p className="mt-2 text-sm text-brand-ink">{es ? 'Diferencia con el plan' : 'Difference with the plan'} · <strong>
            {projection.atArrivalIfPlanFollowed >= projection.atArrival ? '+' : ''}
            {dec(Number((projection.atArrivalIfPlanFollowed - projection.atArrival).toFixed(1)), lang)} {es ? 'puntos porcentuales' : 'percentage points'}
          </strong></p>
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
      {evidence.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <h3 className="font-bold">{projection ? (es ? 'Datos recientes relacionados con el modelo' : 'Recent model-related inputs') : (es ? 'Lecturas de esta zona' : 'Readings for this zone')}</h3>
          <ul className="mt-2 grid gap-2">
            {evidence.map(({ def, latest }) => <li key={def.id} className="rounded-lg bg-surface-2 p-2 text-sm">
              <p className="font-semibold">{te(def.name)} · {def.input === 'boolean'
                ? (latest.value ? (es ? 'Sí' : 'Yes') : 'No')
                : <>{dec(latest.value, lang)} {def.unit}</>}</p>
              <p className="text-xs text-ink-2">{def.id === 'cabin_co2' ? (es ? 'Última muestra · ' : 'Latest sample · ') : ''}
                {readingOrigin(latest, lang)} · {ago(nowTs - latest.ts, lang)}</p>
              {def.id === 'cabin_co2' && <p className="mt-1 text-xs">{es ? 'Promedio de 1 h' : '1-hour average'} · {
                co2 === null ? (es ? 'Datos insuficientes' : 'Insufficient data') : `${dec(Number(co2.toFixed(2)), lang)} mmHg`
              }</p>}
            </li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
