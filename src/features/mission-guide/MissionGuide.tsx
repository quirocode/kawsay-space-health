import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import copy from '../../../content/mission-guide.json';
import { clock, dec } from '../../app/format';
import { flow, te, useLang } from '../../app/i18n';
import { engine, loadDemoMission } from '../../app/engine';
import { Glyph } from '../../app/WorkspaceNav';
import { lastNDaysAvg } from '../../domain/rules';
import { CABIN_CO2_LIMIT, cabinCo2 } from '../../domain/cabinCo2';
import { StatusBadge } from '../../components/StatusBadge';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, Screen } from '../../components/ui';
import { CabinEvidence } from './CabinEvidence';

type MissionCopy = (typeof copy)[keyof typeof copy];
type Co2Window = ReturnType<typeof cabinCo2>;

function HeadacheScale({ score, label, onChange }: { score: number; label: string; onChange?: (value: number) => void }) {
  return <div className="mission-visual-tile">
    <div className="mission-value-line"><span>{label}</span><strong>{score}<small>/5</small></strong></div>
    {onChange
      ? <div className="mission-pain-scale" role="group" aria-label={label}>
        {flow.check.headacheScale.map((item, index) => (
          <button key={item} type="button" aria-label={`${index + 1} · ${item}`} aria-pressed={score === index + 1}
            onClick={() => onChange(index + 1)}>{index + 1}</button>
        ))}
      </div>
      : <div className="mission-pain-scale" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((number) => <span key={number} data-filled={number <= score}>{number}</span>)}
      </div>}
    <p className="mt-2 text-sm text-ink-2">{flow.check.headacheScale[score - 1]}</p>
  </div>;
}

function Co2Control({ value, onChange, lang, label }: {
  value: number; onChange: (next: number) => void; lang: 'es' | 'en'; label: string;
}) {
  const display = `${dec(value, lang)} mmHg`;
  return <label className="mission-co2-control">
    <span>{label}<output>{display}</output></span>
    <input type="range" min={1} max={6} step={0.1} value={value} aria-label={label} aria-valuetext={display}
      onChange={(event) => onChange(event.currentTarget.valueAsNumber)} />
    <small><span>1 mmHg</span><span>6 mmHg</span></small>
  </label>;
}

function CabinGauge({ window, t, lang }: { window: Co2Window; t: MissionCopy; lang: 'en' | 'es' }) {
  const value = window.value;
  const max = Math.max(6, Math.ceil(value ?? 0));
  const above = value !== null && value > CABIN_CO2_LIMIT;
  return <div className="mission-visual-tile" aria-live="polite">
    <div className="mission-value-line">
      <span>{t.average}</span>
      <strong>{value === null ? '—' : dec(Number(value.toFixed(2)), lang)}<small> mmHg</small></strong>
    </div>
    {value === null
      ? <div className="mission-data-gap"><strong>{t.insufficient}</strong><span>{window.coveredMinutes}/60 {t.covered}</span></div>
      : <>
        <div className="mission-gauge" aria-hidden="true">
          <span style={{ width: `${value / max * 100}%` }} data-above={above} />
          <i style={{ left: `${CABIN_CO2_LIMIT / max * 100}%` }} />
        </div>
        <div className="mission-gauge-key"><span>0</span><span>{t.limit} · {CABIN_CO2_LIMIT} mmHg</span><span>{max}</span></div>
      </>}
    {value !== null && <div className="mt-3"><StatusBadge size="sm" status={above ? 'yellow' : 'green'} label={above ? t.above : t.within} /></div>}
  </div>;
}

const DEFAULT_VALUES = { headache: 4, recheckHeadache: 2, cabinCo2: 4.1, recheckCo2: 2.6 };

function buildScenario(mission: ReturnType<typeof loadDemoMission>, values: typeof DEFAULT_VALUES) {
  const original = mission.beats.headache.map((reading) => ({
    ...reading, value: reading.indicatorId === 'headache_score' ? values.headache : values.cabinCo2,
  }));
  const recheck = mission.beats.verification.map((reading) => ({
    ...reading, value: reading.indicatorId === 'headache_score' ? values.recheckHeadache : values.recheckCo2,
  }));
  const before = original.find((reading) => reading.indicatorId === 'headache_score')!;
  const after = recheck.find((reading) => reading.indicatorId === 'headache_score')!;
  const initial = [...mission.history, ...original];
  const recovered = [...initial, ...recheck];
  const finding = engine.findCompound(initial, mission.context, before.ts).find((item) => item.ruleId === 'co2_headache');
  const verification = engine.verify(before, after);
  const brief = engine.brief({
    findings: finding ? [finding] : [], verifications: finding ? [verification] : [],
    ctx: mission.context, nowTs: after.ts,
    readiness: engine.project(recovered, mission.context, mission.defaultPlan),
  });
  const sleepAverage = lastNDaysAvg(initial, 'sleep_hours', 3, mission.context) ?? null;
  return { context: mission.context, before, after, initial, recovered, sleepAverage, brief, finding };
}

export function MissionGuide() {
  const lang = useLang();
  const t = copy[lang];
  const mission = useMemo(loadDemoMission, []);
  const [values, setValues] = useState(DEFAULT_VALUES);
  const scene = useMemo(() => buildScenario(mission, values), [mission, values]);
  const setValue = (field: keyof typeof DEFAULT_VALUES, value: number) => setValues((current) => ({ ...current, [field]: value }));
  const [step, setStep] = useState(0);
  const [gap, setGap] = useState(false);
  const [showAfter, setShowAfter] = useState(true);
  const done = step === t.stages.length;
  const initial = gap ? scene.initial.filter((r) => r.indicatorId !== 'cabin_co2' ||
    r.ts <= scene.before.ts - 50 * 60_000 || r.ts >= scene.before.ts - 15 * 60_000) : scene.initial;
  const finding = gap ? engine.findCompound(initial, scene.context, scene.before.ts).find((item) => item.ruleId === 'co2_headache') : scene.finding;
  const before = cabinCo2(scene.initial, scene.before.ts);
  const after = cabinCo2(scene.recovered, scene.after.ts);
  const visibleReading = showAfter ? scene.after : scene.before;
  const format = (n: number | null) => n === null ? '—' : dec(Number(n.toFixed(2)), lang);
  const advance = () => {
    if (step === 1) { setGap(false); setShowAfter(true); }
    setStep(step + 1);
  };

  return <Screen>
    <header className="mission-guide-header">
      <div>
        <p className="text-sm font-semibold text-brand-ink">{t.intro} · {t.scope}</p>
        <h1 className="text-[clamp(28px,5vw,40px)] font-bold tracking-tight">{t.title}</h1>
      </div>
      <Link className="dashboard-secondary !w-auto" href="/">{t.exit}</Link>
    </header>
    <ol className="mission-guide-steps" aria-label={t.title}>
      {t.stages.map((label, i) => <li key={label} aria-current={i === step ? 'step' : undefined} data-complete={i < step}>
        <span>{i < step ? '✓' : i + 1}</span>{label}
      </li>)}
    </ol>
    <article className={`${CARD} mission-visual-card flex flex-col gap-4`}>
      <h2 className="text-2xl font-bold" aria-live="polite">{done ? t.complete : t.titles[step]}</h2>
      {step === 0 && <>
        <p className="mission-visual-meta"><span>{t.report}</span><strong>{clock(scene.before.ts)}</strong></p>
        <p className="text-sm text-ink-2">{t.painHint}</p>
        <HeadacheScale score={scene.before.value} label={t.headache} onChange={(value) => setValue('headache', value)} />
      </>}
      {step === 1 && <>
        <div className="workspace-segmented w-fit" role="group" aria-label={t.coverage}>
          <button type="button" aria-pressed={!gap} onClick={() => setGap(false)}>{t.full}</button>
          <button type="button" aria-pressed={gap} onClick={() => setGap(true)}>{t.gap}</button>
        </div>
        <CabinGauge window={cabinCo2(initial, scene.before.ts)} t={t} lang={lang} />
        {!gap && <Co2Control value={values.cabinCo2} onChange={(value) => setValue('cabinCo2', value)} lang={lang} label={t.adjust} />}
        <p className="rounded-lg border border-line px-3 py-2 text-sm font-semibold" aria-live="polite">{finding ? te(finding.title) : t.noFinding}</p>
        {gap && <p className="text-sm text-ink-2">{t.restore}</p>}
        <p className="mission-visual-meta">
          <span>{t.headache} <strong>{scene.before.value}/5</strong></span>
          <span>{t.sleep} <strong>{format(scene.sleepAverage)} h</strong></span>
        </p>
        <details className="mission-evidence-details">
          <summary>{t.evidence}</summary>
          <CabinEvidence readings={initial} nowTs={scene.before.ts} context={scene.context} />
        </details>
      </>}
      {step === 2 && <>
        <p className="mission-visual-meta">
          <span>{showAfter ? t.age : t.before}</span><strong>{clock(visibleReading.ts)}</strong>
        </p>
        <div className="workspace-segmented w-fit" role="group" aria-label={t.compare}>
          <button type="button" aria-pressed={!showAfter} onClick={() => setShowAfter(false)}>{t.before}</button>
          <button type="button" aria-pressed={showAfter} onClick={() => setShowAfter(true)}>{t.after}</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <HeadacheScale score={visibleReading.value} label={t.headache}
            onChange={showAfter ? (value) => setValue('recheckHeadache', value) : undefined} />
          <CabinGauge window={showAfter ? after : before} t={t} lang={lang} />
        </div>
        {showAfter && <Co2Control value={values.recheckCo2} onChange={(value) => setValue('recheckCo2', value)} lang={lang} label={t.adjust} />}
        <p className="mission-visual-meta">
          <span>{t.headache} <strong>{scene.before.value}/5 → {scene.after.value}/5</strong></span>
          <span>CO₂ <strong>{format(before.value)} → {format(after.value)} mmHg</strong></span>
        </p>
      </>}
      {step >= 3 && <>
        <div className="mission-visual-tile">
          <p className="text-sm text-ink-2">{t.waiting}</p>
          <div className="mission-signal" data-sent={done}>
            <div><span>{t.departure}</span><strong>{clock(scene.brief.generatedTs)}</strong></div>
            <div className="mission-signal-track" aria-hidden="true"><i /></div>
            <div><span>{t.arrival}</span><strong>{scene.brief.arrivesAtTs === null ? '—' : clock(scene.brief.arrivesAtTs)}</strong></div>
          </div>
        </div>
        <p className="mission-visual-meta">
          <span>{t.headache} <strong>{scene.before.value}/5 → {scene.after.value}/5</strong></span>
          <span>CO₂ <strong>{format(before.value)} → {format(after.value)} mmHg</strong></span>
        </p>
        {done && <p className="text-sm text-ink-2">{t.queue}</p>}
        <details className="mission-evidence-details">
          <summary>{t.evidence}</summary>
          <div className="rounded-card border border-line bg-surface-2 p-3">
            <p className="text-sm">{te(scene.brief.headline)}</p>
            <p className="mt-1 text-sm text-ink-2">{te(scene.brief.decisionRequested)}</p>
          </div>
          <CabinEvidence readings={scene.initial} nowTs={scene.before.ts} context={scene.context} />
        </details>
      </>}
      <footer className="flex flex-wrap justify-between gap-2 border-t border-line pt-3">
        {step > 0 && !done && <button className={BTN_SECONDARY} type="button" onClick={() => setStep(step - 1)}>{t.back}</button>}
        {done ? <button className={BTN_SECONDARY} type="button" onClick={() => { setStep(0); setGap(false); setShowAfter(true); setValues(DEFAULT_VALUES); }}>{t.restart}</button>
          : <button className={`${BTN_PRIMARY} ml-auto gap-2`} type="button" disabled={step === 1 && gap} onClick={advance}>
            {t.next[step]}<Glyph name="missionGuide" size={16} />
          </button>}
      </footer>
    </article>
  </Screen>;
}
