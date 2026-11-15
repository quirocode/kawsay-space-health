import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ui } from '../../app/i18n';
import { flow } from '../../app/i18n';
import { indicators as indicatorCopy } from '../../app/i18n';
import { te, useLang } from '../../app/i18n';
import type { BodyZone, Evaluation, IndicatorDef, Reading } from '../../domain/types';
import { engine } from '../../app/engine';
import { useApp } from '../../app/store';
import { ago, clock, dec, fill } from '../../app/format';
import { StatusBadge } from '../../components/StatusBadge';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, NumberPad, PANEL, Screen, SourceList } from '../../components/ui';
import { BodyFigure } from '../future-self/BodyFigure';
import { todayZones } from '../future-self/zones';

type Copy = { howToMeasure: string[]; whyItMatters: string; scaleLabels: string[] | null };
const COPY = indicatorCopy as unknown as Record<string, Copy>;

type Step =
  | { key: keyof typeof flow.check.steps; kind: 'pad'; fields: string[]; decimal: boolean }
  | { key: keyof typeof flow.check.steps; kind: 'scale'; fields: [string] }
  | { key: keyof typeof flow.check.steps; kind: 'symptoms'; fields: string[] };

const SYMPTOMS = ['symptom_dizziness', 'symptom_vision', 'symptom_confusion', 'symptom_joint_pain', 'symptom_skin'] as const;

/** What the watch cannot measure, in under two minutes. One question per screen. */
const STEPS: Step[] = [
  { key: 'bp', kind: 'pad', fields: ['bp_systolic', 'bp_diastolic'], decimal: false },
  { key: 'temp', kind: 'pad', fields: ['body_temp'], decimal: true },
  { key: 'glucose', kind: 'pad', fields: ['glucose'], decimal: false },
  { key: 'sleep', kind: 'pad', fields: ['sleep_hours'], decimal: true },
  { key: 'mood', kind: 'scale', fields: ['mood'] },
  { key: 'symptoms', kind: 'symptoms', fields: ['headache_score', ...SYMPTOMS] },
  { key: 'habits', kind: 'pad', fields: ['exercise_min', 'water_ml'], decimal: false },
];

const MAX_DIGITS = 5;

/** Today's latest value per indicator, as the text the pad edits. */
function todaysValues(readings: Reading[], missionDay: number): Record<string, string> {
  const latest = new Map<string, Reading>();
  for (const r of readings) {
    if (r.missionDay !== missionDay) continue;
    const cur = latest.get(r.indicatorId);
    if (!cur || r.ts > cur.ts) latest.set(r.indicatorId, r);
  }
  return Object.fromEntries([...latest].map(([id, r]) => [id, String(r.value)]));
}

export function CheckInScreen() {
  const readings = useApp((s) => s.readings);
  const ctx = useApp((s) => s.context);
  const nowTs = useApp((s) => s.nowTs);
  const lastCheckTs = useApp((s) => s.lastCheckTs);
  const saveCheck = useApp((s) => s.saveCheck);
  const lang = useLang();

  const [editing, setEditing] = useState(lastCheckTs === null);
  const [index, setIndex] = useState(0);
  const [field, setField] = useState(0);
  const [fresh, setFresh] = useState(true); // the first key replaces a prefilled value
  const [values, setValues] = useState<Record<string, string>>(() => todaysValues(readings, ctx.missionDay));
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const defs = useMemo(() => new Map(engine.indicators().map((d) => [d.id, d])), []);

  if (!editing) return <Summary onAgain={() => { setValues(todaysValues(readings, ctx.missionDay)); setSkipped(new Set()); setIndex(0); setField(0); setFresh(true); setEditing(true); }} />;

  const step = STEPS[index];
  const copyId = step.fields[step.kind === 'pad' ? field : 0];
  const copy = COPY[copyId];
  const set = (id: string, v: string) => setValues((cur) => ({ ...cur, [id]: v }));

  const onKey = (key: string) => {
    if (step.kind !== 'pad') return;
    const id = step.fields[field];
    const cur = fresh ? '' : values[id] ?? '';
    if (key === '/') { setField((f) => (f + 1) % step.fields.length); setFresh(true); return; }
    if (key === 'back') { set(id, fresh ? '' : cur.slice(0, -1)); setFresh(false); return; }
    if (key === '.' && (cur.includes('.') || cur === '')) return;
    if (cur.replace('.', '').length >= MAX_DIGITS) return;
    set(id, cur + key);
    setFresh(false);
  };

  const go = (to: number) => { setIndex(to); setField(0); setFresh(true); };
  const finish = (skip: Set<string>) => {
    const out: Reading[] = [];
    for (const s of STEPS) {
      for (const id of s.fields) {
        if (skip.has(id)) continue;
        const text = values[id] ?? (s.kind === 'symptoms' ? (id === 'headache_score' ? '1' : '0') : '');
        const value = Number(text);
        if (text === '' || !Number.isFinite(value)) continue;
        out.push({ indicatorId: id, value, ts: nowTs, missionDay: ctx.missionDay, phase: ctx.phase, origin: 'manual' });
      }
    }
    saveCheck(out);
    setEditing(false);
  };
  const next = (skipStep: boolean) => {
    const skip = new Set(skipped);
    for (const id of step.fields) (skipStep ? skip.add(id) : skip.delete(id));
    setSkipped(skip);
    if (index === STEPS.length - 1) finish(skip);
    else go(index + 1);
  };

  const prefilled = step.kind === 'pad' && fresh && step.fields.some((id) => values[id]);

  return (
    <Screen>
      <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className={`${CARD} flex flex-col gap-4`}>
          <ol className="flex gap-2" aria-label={fill(ui.check.progress, { n: index + 1, total: STEPS.length })}>
            {STEPS.map((s, i) => (
              <li key={s.key} className={`h-2 flex-1 rounded-full ${i <= index ? 'bg-brand' : 'bg-surface-3'}`} />
            ))}
          </ol>
          <p className="text-[15px] text-ink-2">{fill(flow.check.label, { n: index + 1, total: STEPS.length })}</p>
          <h1 className="text-[34px] font-bold">{flow.check.steps[step.key]}</h1>

          {step.kind === 'pad' && (
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
              {step.fields.map((id, i) => {
                const def = defs.get(id)!;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setField(i); setFresh(true); }}
                    aria-pressed={field === i}
                    aria-label={`${te(def.name)}: ${values[id] || flow.check.empty}`}
                    className={`flex items-baseline gap-2 rounded-card border-2 px-3 py-1 ${field === i ? 'border-brand' : 'border-transparent'}`}
                  >
                    {step.key === 'habits' && <span className="text-[18px] text-ink-2">{i === 0 ? flow.check.exercise : flow.check.water}</span>}
                    <span className={`tabular text-[64px] leading-none ${values[id] ? '' : 'text-ink-2'}`}>{values[id] || '–'}</span>
                    <span className="text-[20px] text-ink-2">{step.key === 'bp' && i === 0 ? '/' : def.unit}</span>
                  </button>
                );
              })}
            </div>
          )}
          {prefilled && <p className="text-[15px] text-ink-2">{flow.check.prefilled}</p>}

          <div className={PANEL}>
            <h2 className="font-bold text-brand">{ui.check.howToMeasure}</h2>
            <ol className="mt-1 list-decimal pl-6 text-[18px]">
              {copy.howToMeasure.map((line) => <li key={line}>{line}</li>)}
            </ol>
            <h2 className="mt-3 font-bold text-brand">{flow.check.whyItMatters}</h2>
            <p className="text-[18px]">{copy.whyItMatters}</p>
            <div className="mt-1"><SourceList sources={defs.get(copyId)!.sources} /></div>
          </div>

          <div className="mt-auto grid grid-cols-[1fr_1fr_2.4fr] gap-3">
            <button type="button" className={BTN_SECONDARY} disabled={index === 0} onClick={() => go(index - 1)}>{ui.check.back}</button>
            <button type="button" className={BTN_SECONDARY} onClick={() => next(true)}>{ui.check.skip}</button>
            <button type="button" className={BTN_PRIMARY} onClick={() => next(false)}>{index === STEPS.length - 1 ? flow.check.save : ui.check.next}</button>
          </div>
        </div>

        <div className={`${CARD} flex flex-col gap-4`}>
          {step.kind === 'pad' && <NumberPad onKey={onKey} extra={step.fields.length > 1 ? '/' : step.decimal ? '.' : undefined} />}
          {step.kind === 'scale' && (
            <Scale labels={COPY.mood.scaleLabels ?? []} value={Number(values.mood ?? 0)} onChange={(v) => set('mood', String(v))} name={flow.check.steps.mood} />
          )}
          {step.kind === 'symptoms' && (
            <>
              <h2 className="text-[20px] font-bold">{flow.check.headache}</h2>
              <Scale labels={flow.check.headacheScale} value={Number(values.headache_score ?? 1)} onChange={(v) => set('headache_score', String(v))} name={flow.check.headache} compact />
              <h2 className="text-[20px] font-bold">{flow.check.anyOfThese}</h2>
              <div className="grid gap-2">
                {SYMPTOMS.map((id) => {
                  const on = values[id] === '1';
                  return (
                    <button key={id} type="button" role="switch" aria-checked={on} onClick={() => set(id, on ? '0' : '1')}
                      className={`flex min-h-14 items-center justify-between rounded-card border-2 px-4 text-left text-[18px] ${on ? 'border-watch bg-watch-bg font-bold' : 'border-line'}`}>
                      {flow.check.symptomNames[id]}
                      <span className="text-[15px] text-ink-2">{on ? (lang === 'es' ? 'Sí' : 'Yes') : 'No'}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </Screen>
  );
}

function Scale({ labels, value, onChange, name, compact = false }: { labels: string[]; value: number; onChange: (v: number) => void; name: string; compact?: boolean }) {
  return (
    <div role="radiogroup" aria-label={name} className={compact ? 'grid grid-cols-5 gap-2' : 'grid flex-1 gap-3'}>
      {labels.map((label, i) => {
        const v = i + 1;
        const on = value === v;
        return (
          <button key={label} type="button" role="radio" aria-checked={on} onClick={() => onChange(v)}
            className={`flex items-center rounded-card border-2 ${compact ? 'min-h-[72px] flex-col justify-center px-1 text-[15px]' : 'min-h-[72px] gap-4 px-5 text-[20px]'} ${on ? 'border-brand bg-brand-bg font-bold' : 'border-line'}`}>
            <span className="tabular text-[24px]">{v}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

const ORDER = { red: 0, yellow: 1, stale: 2, green: 3 } as const;

function Summary({ onAgain }: { onAgain: () => void }) {
  const readings = useApp((s) => s.readings);
  const ctx = useApp((s) => s.context);
  const nowTs = useApp((s) => s.nowTs);
  const lastCheckTs = useApp((s) => s.lastCheckTs);
  const lang = useLang();
  const [zone, setZone] = useState<BodyZone | null>(null);

  const defs = engine.indicators();
  const evals = useMemo(() => engine.evaluate(readings, [], ctx, nowTs), [readings, ctx, nowTs]);
  const findings = useMemo(() => engine.findCompound(readings, ctx), [readings, ctx]);
  const zones = useMemo(() => todayZones(evals, defs), [evals, defs]);
  const attention = evals.some((e) => e.status === 'red' || e.status === 'yellow') || findings.length > 0;
  const savedCount = lastCheckTs === null ? 0 : readings.filter((r) => r.ts === lastCheckTs && r.origin === 'manual').length;

  const latest = useMemo(() => {
    const m = new Map<string, Reading>();
    for (const r of readings) { const c = m.get(r.indicatorId); if (!c || r.ts > c.ts) m.set(r.indicatorId, r); }
    return m;
  }, [readings]);
  const rows = defs
    .map((def) => ({ def, e: evals.find((x) => x.indicatorId === def.id)! }))
    .filter((row) => (zone ? row.def.zone === zone : row.e.status !== 'green'))
    .sort((a, b) => ORDER[a.e.status] - ORDER[b.e.status]);

  return (
    <Screen>
      <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.6fr)]">
        <div className={`${CARD} flex flex-col items-center gap-3`}>
          <div className="h-[420px] w-full max-w-[240px]">
            <BodyFigure zones={zones} variant="today" title={lang === 'es' ? `Tu cuerpo hoy, Sol ${ctx.missionDay}` : `Your body today, Sol ${ctx.missionDay}`} selected={zone} onSelect={(z) => setZone(zone === z ? null : z)} />
          </div>
          <p className="text-center text-[15px] text-ink-2">{flow.check.tapZone}</p>
        </div>

        <div className={`${CARD} flex flex-col gap-4`}>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[34px] font-bold">{zone ? ui.zone.names[zone] : flow.check.summaryTitle}</h1>
            <StatusBadge status={zone ? (zones[zone] === 'none' ? 'stale' : zones[zone]) : attention ? 'yellow' : 'green'} label={zone ? undefined : attention ? ui.check.summaryAttention : ui.check.summaryOk} />
          </div>
          {!zone && lastCheckTs !== null && <p className="text-[15px] text-ink-2">{fill(flow.check.savedAt, { time: clock(lastCheckTs), count: savedCount })}</p>}
          {zone && <h2 className="font-bold text-ink-2">{flow.check.feeds}</h2>}

          <ul className="flex flex-col gap-2">
            {rows.length === 0 && <li className={PANEL}>{zone ? flow.check.noIndicators : ui.check.summaryOk}</li>}
            {rows.map(({ def, e }) => <IndicatorRow key={def.id} def={def} e={e} reading={latest.get(def.id)} nowTs={nowTs} />)}
          </ul>

          <div className="mt-auto grid grid-cols-2 gap-3">
            <button type="button" className={BTN_SECONDARY} onClick={onAgain}>{flow.check.again}</button>
            {findings.length > 0
              ? <Link href="/loop" className={BTN_PRIMARY}>{flow.check.seeFindings}</Link>
              : <Link href="/" className={BTN_PRIMARY}>{ui.check.done}</Link>}
          </div>
        </div>
      </div>
    </Screen>
  );
}

function IndicatorRow({ def, e, reading, nowTs }: { def: IndicatorDef; e: Evaluation; reading: Reading | undefined; nowTs: number }) {
  const lang = useLang();
  const value = !reading ? '–' : def.input === 'boolean' ? (reading.value ? (lang === 'es' ? 'Sí' : 'Yes') : 'No') : dec(String(reading.value), lang);
  return (
    <li className={`${PANEL} flex flex-col gap-1`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[18px] font-bold">{te(def.name)}</span>
        <span className="tabular text-[20px]">{value}{def.input === 'number' && reading ? ` ${def.unit}` : ''}</span>
        <span className="ml-auto"><StatusBadge status={e.status} size="sm" /></span>
      </div>
      <p className="text-[15px] text-ink-2">
        {te(e.reason)}
        {reading && ` · ${flow.check.from[reading.origin]} · ${fill(flow.check.ageAgo, { age: ago(nowTs - reading.ts) })}`}
      </p>
      <SourceList sources={e.sources} />
    </li>
  );
}
