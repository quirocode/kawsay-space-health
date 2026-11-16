import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import suitCopy from '../../../content/suit.json';
import { useLang } from '../../app/i18n';
import { dec, fill, landingLabel, missionLabel } from '../../app/format';
import { useApp } from '../../app/store';
import { getCrewMember } from '../../domain/crew';
import { speakCopilot, stopCopilotVoice } from '../../domain/localAi';
import type { MissionPhase, Reading } from '../../domain/types';
import { adviseSuit, evaluateSuit, FLIGHT_PHASES, SCENARIOS, simulate, type FlightPhase, type Scenario, type SuitEvaluation } from '../../domain/suit';
import { StatusBadge, StatusIcon } from '../../components/StatusBadge';
import { CARD, PANEL, BTN_PRIMARY, BTN_SECONDARY, Screen, SourceList } from '../../components/ui';

type SuitCopy = (typeof suitCopy)['en'];

/** Phase icons: plain line drawings, no NASA marks. */
function PhaseIcon({ phase }: { phase: FlightPhase }) {
  const c = { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (phase) {
    case 'launch': return <svg {...c}><path d="M12 2c3 3 4 7 4 11l-4 3-4-3c0-4 1-8 4-11z" /><path d="M8 13l-3 4h4M16 13l3 4h-4M10 20l2 2 2-2" /></svg>;
    case 'cruise': return <svg {...c}><circle cx="12" cy="12" r="4" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-20 12 12)" /></svg>;
    case 'eva': return <svg {...c}><circle cx="12" cy="7" r="4" /><path d="M10 7h4M7 21v-6a5 5 0 0 1 10 0v6M5 14l2 1M19 14l-2 1" /></svg>;
    case 'entry': return <svg {...c}><path d="M5 4l9 9" /><path d="M14 13a5 5 0 1 0 0 0z" /><path d="M3 9l3-1M8 3l-1 3" /></svg>;
    case 'post_landing': return <svg {...c}><circle cx="12" cy="5" r="2" /><path d="M12 7v7M9 21l3-7 3 7M8 10h8M3 22h18" /></svg>;
  }
}

function bandText(e: SuitEvaluation, t: SuitCopy, lang: 'en' | 'es'): string {
  if (e.direction === 'yes_needed' || e.direction === 'no_wanted') return t.explain[e.direction];
  return fill(t.explain[e.direction], { watch: dec(e.watchAt ?? 0, lang), act: dec(e.actAt ?? 0, lang), unit: e.unit });
}

function valueText(e: SuitEvaluation, t: SuitCopy, lang: 'en' | 'es'): string {
  if (e.direction === 'yes_needed' || e.direction === 'no_wanted') return e.value >= 1 ? t.yesNo.yes : t.yesNo.no;
  const unit = e.unit === 'of 5' ? (lang === 'es' ? 'de 5' : 'of 5') : e.unit;
  return `${dec(e.value, lang)} ${unit}`.trim();
}

/** Where the reading sits between OK, watch and act: a three-band ruler with a marker. */
function Ruler({ e }: { e: SuitEvaluation }) {
  if (e.watchAt === undefined || e.actAt === undefined) return null;
  const span = Math.abs(e.actAt - e.watchAt) * 2.2;
  const [lo, hi] = e.direction === 'high' ? [e.watchAt - span, e.actAt + span / 2] : [e.actAt - span / 2, e.watchAt + span];
  const pos = (v: number) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));
  const w = pos(e.watchAt), a = pos(e.actAt);
  const bands = e.direction === 'high'
    ? [['ok', 0, w], ['watch', w, a], ['act', a, 100]]
    : [['act', 0, a], ['watch', a, w], ['ok', w, 100]];
  const color = { ok: 'var(--status-ok)', watch: 'var(--status-watch)', act: 'var(--status-act)' } as const;
  return (
    <div className="relative mt-2 h-3 w-full overflow-visible rounded-full" aria-hidden>
      {bands.map(([k, from, to]) => (
        <span key={k as string} className="absolute top-0 h-3" style={{ left: `${from}%`, width: `${(to as number) - (from as number)}%`, background: color[k as keyof typeof color], opacity: 0.35 }} />
      ))}
      <span className="absolute -top-1 h-5 w-1.5 rounded-full bg-ink" style={{ left: `calc(${pos(e.value)}% - 3px)` }} />
    </div>
  );
}

function SignalRow({ e, t, lang, open }: { e: SuitEvaluation; t: SuitCopy; lang: 'en' | 'es'; open: boolean }) {
  const s = t.signals[e.id];
  return (
    <details open={open} className={`${PANEL} group`}>
      <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center gap-3">
        <StatusBadge status={e.status} label={t.status[e.status]} size="sm" />
        <span className="flex-1 font-bold">{s.name}</span>
        <span className="tabular text-[20px]">{valueText(e, t, lang)}</span>
        <span className="text-[15px] text-brand-ink group-open:hidden">{lang === 'es' ? '¿Por qué?' : 'Why?'}</span>
      </summary>
      <Ruler e={e} />
      {/* The explanation trace: measured → compared with → so. */}
      <ol className="mt-3 grid gap-2 text-[16px] md:grid-cols-3">
        <li className="rounded-chip bg-surface p-3"><span className="block text-[14px] text-ink-2">{t.explain.measured}</span>{valueText(e, t, lang)}</li>
        <li className="rounded-chip bg-surface p-3"><span className="block text-[14px] text-ink-2">{t.explain.comparedTo}</span>{bandText(e, t, lang)}</li>
        <li className="rounded-chip bg-surface p-3"><span className="block text-[14px] text-ink-2">{t.explain.therefore}</span>{t.explain[e.band]}</li>
      </ol>
      <dl className="mt-3 grid gap-2 text-[16px] md:grid-cols-2">
        <div><dt className="text-[14px] text-ink-2">{t.explain.how}</dt><dd>{s.how}</dd></div>
        <div><dt className="text-[14px] text-ink-2">{t.explain.why}</dt><dd>{s.why}</dd></div>
      </dl>
      <div className="mt-2"><SourceList sources={e.sources} /></div>
    </details>
  );
}

/** Suit & flight-phase check: a simulated measurement, explained reading by reading. */
export function SuitScreen() {
  const lang = useLang();
  const es = lang === 'es';
  const t: SuitCopy = suitCopy[lang] as SuitCopy;
  const ctx = useApp((s) => s.context);
  const nowTs = useApp((s) => s.nowTs);
  const activeCrewId = useApp((s) => s.activeCrewId);
  const addReadings = useApp((s) => s.addReadings);
  const setMissionPhase = useApp((s) => s.setPhase);
  const crew = getCrewMember(activeCrewId);
  // Open on the phase the mission is in now; cruise days default to the spacewalk demo.
  const [phase, setPhase] = useState<FlightPhase>(() =>
    ctx.phase === 'pre_landing' ? 'entry' : ctx.phase === 'surface' ? 'post_landing' : 'eva');
  const [scenario, setScenario] = useState<Scenario>('watch');
  const [run, setRun] = useState(0);
  const [measuring, setMeasuring] = useState(false);
  const [shown, setShown] = useState(false);
  const [voiceCopilot, setVoiceCopilot] = useState(false);
  const [loggedToMission, setLoggedToMission] = useState(false);

  const evals = useMemo(() => evaluateSuit(simulate(phase, scenario, run)), [phase, scenario, run]);
  const verdict = useMemo(() => adviseSuit(phase, evals), [phase, evals]);

  useEffect(() => { setShown(false); setLoggedToMission(false); }, [phase, scenario]);
  useEffect(() => {
    if (!measuring) return;
    const id = setTimeout(() => { setMeasuring(false); setShown(true); }, 900);
    return () => clearTimeout(id);
  }, [measuring]);

  const measure = (again: boolean) => { if (again) setRun((r) => r + 1); setLoggedToMission(false); setMeasuring(true); };
  const p = t.phases[phase];
  const nameOf = (id: string) => (t.signals as Record<string, { name: string }>)[id]?.name ?? id;

  const speakSuitBrief = () => {
    const headline = (t.verdicts as Record<string, Record<string, string>>)[phase][verdict.status];
    const stepTexts = verdict.steps
      .map((s, i) => {
        const c = (t.steps as Record<string, { text: string; detail: string }>)[s.id];
        return `${es ? 'Paso' : 'Step'} ${i + 1}: ${c?.text ?? s.id}. ${c?.detail ?? ''}`;
      })
      .join(' ');
    const fullText = `${crew.role} ${crew.name}. ${headline} ${stepTexts}`;
    speakCopilot(fullText, lang);
  };

  useEffect(() => {
    if (shown && !measuring && voiceCopilot) {
      speakSuitBrief();
    }
    return () => stopCopilotVoice();
  }, [shown, measuring, voiceCopilot, phase, scenario, run]);

  const logSuitTelemetryToMission = () => {
    const mappedPhase: MissionPhase =
      phase === 'eva' ? 'eva' : phase === 'entry' ? 'pre_landing' : phase === 'post_landing' ? 'surface' : 'cruise';
    setMissionPhase(mappedPhase);

    const out: Reading[] = [];
    const byId = new Map(evals.map((e) => [e.id, e.value]));
    if (byId.has('heart_rate')) {
      out.push({ indicatorId: 'heart_rate', value: Math.round(byId.get('heart_rate')!), ts: nowTs, missionDay: ctx.missionDay, phase: mappedPhase, origin: 'sensor_sim' });
    }
    if (byId.has('spo2')) {
      out.push({ indicatorId: 'spo2', value: Math.round(byId.get('spo2')!), ts: nowTs, missionDay: ctx.missionDay, phase: mappedPhase, origin: 'sensor_sim' });
    }
    if (byId.has('core_temp')) {
      out.push({ indicatorId: 'body_temp', value: byId.get('core_temp')!, ts: nowTs, missionDay: ctx.missionDay, phase: mappedPhase, origin: 'sensor_sim' });
    }
    if (byId.get('dcs_symptoms') === 1) {
      out.push({ indicatorId: 'symptom_joint_pain', value: 1, ts: nowTs, missionDay: ctx.missionDay, phase: mappedPhase, origin: 'manual' });
    }
    if ((byId.get('dizziness') ?? 0) >= 3) {
      out.push({ indicatorId: 'symptom_dizziness', value: 1, ts: nowTs, missionDay: ctx.missionDay, phase: mappedPhase, origin: 'manual' });
    }
    if (out.length > 0) addReadings(out);
    setLoggedToMission(true);
  };

  return (
    <Screen wide>
      <div className={`${CARD} flex flex-col gap-3`}>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[30px] font-bold">{t.title}</h1>
          <span className="rounded-full border border-future px-3 py-1 text-[15px] text-future">{t.simBadge}</span>
          <span className="rounded-full bg-brand-bg px-3 py-1 text-[14px] font-bold text-brand-ink">
            {crew.role} {crew.name} · {crew.assignedDevice}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={voiceCopilot}
            onClick={() => setVoiceCopilot((v) => !v)}
            className={`ml-auto rounded-full border-2 px-4 py-1.5 text-[14px] font-bold ${
              voiceCopilot ? 'border-brand-ink bg-brand text-on-brand' : 'border-line bg-surface-2 text-ink'
            }`}
          >
            {voiceCopilot
              ? (es ? 'Copiloto de Voz en Casco: ACTIVO' : 'In-Helmet Voice Copilot: ON')
              : (es ? 'Activar Copiloto de Voz (Manos Libres)' : 'Enable Voice Copilot (Hands-Free)')}
          </button>
        </div>
        <p className="max-w-[80ch] text-ink-2">{t.intro}</p>
      </div>

      {/* 1. Phase timeline: the mission as a line, from launch to standing up on the ground. */}
      <div className={`${CARD} flex flex-col gap-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[22px] font-bold">{t.phaseTitle}</h2>
          <span className="rounded-full bg-surface-2 px-3 py-1 text-[15px]">{missionLabel(ctx, lang)} · {landingLabel(ctx, lang)}</span>
        </div>
        <div role="radiogroup" aria-label={t.phaseTitle} className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {FLIGHT_PHASES.map((ph, i) => (
            <button key={ph} type="button" role="radio" aria-checked={phase === ph} onClick={() => setPhase(ph)}
              className={`flex min-h-[88px] flex-col items-start gap-1 rounded-card border-2 p-3 text-left ${phase === ph ? 'border-brand bg-surface-2' : 'border-line'}`}>
              <span className="flex items-center gap-2 text-brand-ink"><PhaseIcon phase={ph} /><span className="text-[14px] text-ink-2">{i + 1}/5</span></span>
              <span className="font-bold">{t.phases[ph].name}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className={PANEL}><p className="text-[14px] text-ink-2">{lang === 'es' ? 'Lo que llevas puesto' : 'What you wear'}</p><p>{p.suit}</p></div>
          <div className={PANEL}><p className="text-[14px] text-ink-2">{lang === 'es' ? 'Qué le pasa al cuerpo' : 'What happens to the body'}</p><p>{p.body}</p></div>
          <div className={PANEL}><p className="text-[14px] text-ink-2">{lang === 'es' ? 'Qué se mide' : 'What gets measured'}</p><p>{p.sensors}</p></div>
        </div>
      </div>

      {/* 2 + 3. Scenario and measure */}
      <div className={`${CARD} flex flex-col gap-4`}>
        <h2 className="text-[22px] font-bold">{t.scenarioTitle}</h2>
        <div role="radiogroup" aria-label={t.scenarioTitle} className="grid gap-2 md:grid-cols-3">
          {SCENARIOS.map((sc) => {
            const st = sc === 'nominal' ? 'green' : sc === 'watch' ? 'yellow' : 'red';
            return (
              <button key={sc} type="button" role="radio" aria-checked={scenario === sc} onClick={() => setScenario(sc)}
                className={`flex min-h-[72px] items-center gap-3 rounded-card border-2 px-4 text-left ${scenario === sc ? 'border-brand bg-surface-2' : 'border-line'}`}>
                <StatusIcon status={st} />
                <span><span className="block font-bold">{t.scenarios[sc].name}</span><span className="text-[15px] text-ink-2">{t.scenarios[sc].hint}</span></span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={`${BTN_PRIMARY} min-w-[240px]`} disabled={measuring} onClick={() => measure(shown)}>
            {measuring ? t.measuring : shown ? t.again : t.run}
          </button>
          <p className="text-[15px] text-ink-2">{t.simNote}</p>
        </div>
        {measuring && <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2"><div className="h-2 animate-pulse rounded-full bg-brand" style={{ width: '70%' }} /></div>}
      </div>

      {shown && !measuring && (
        <>
          <div className={`${CARD} flex flex-col gap-4`} aria-live="polite">
            <h2 className="text-[22px] font-bold">{t.resultTitle}</h2>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={verdict.status} label={t.status[verdict.status]} />
              <p className="text-[24px] font-bold">{(t.verdicts as Record<string, Record<string, string>>)[phase][verdict.status]}</p>
              <button
                type="button"
                onClick={speakSuitBrief}
                className="ml-auto rounded-full border border-brand-ink bg-brand-bg px-4 py-2 text-[14px] font-bold text-brand-ink"
              >
                {es ? 'Escuchar por Audio del Casco (HUD)' : 'Speak on Helmet Audio (HUD)'}
              </button>
            </div>
            <p className={`${PANEL} text-[16px]`}>{verdict.escalate ? t.escalate : t.noEscalate}</p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={logSuitTelemetryToMission}
                disabled={loggedToMission}
                className={BTN_SECONDARY}
              >
                {loggedToMission
                  ? (es ? 'Registrado en bitácora del tripulante ✓' : 'Logged to crew medical record ✓')
                  : (es ? 'Registrar lecturas del traje en bitácora e Informe a Tierra' : 'Log suit readings to crew record & Earth Brief')}
              </button>
              {loggedToMission && (
                <Link href="/loop" className="font-bold text-brand-ink underline">
                  {es ? 'Abrir Hallazgos / Informe →' : 'Open Findings / Earth Brief →'}
                </Link>
              )}
            </div>
            <h3 className="text-[20px] font-bold">{t.stepsTitle}</h3>
            <ol className="flex flex-col gap-3">
              {verdict.steps.map((s, i) => {
                const c = (t.steps as Record<string, { text: string; detail: string }>)[s.id];
                return (
                  <li key={s.id} className={`flex gap-4 rounded-card border-2 p-4 ${s.urgent ? 'border-act' : 'border-line'}`}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-[20px] font-bold text-on-brand">{i + 1}</span>
                    <div className="flex flex-col gap-1">
                      <p className="text-[20px] font-bold">{c?.text ?? s.id}</p>
                      <p className="text-ink-2">{c?.detail}</p>
                      {s.because.length > 0 && <p className="text-[15px]"><span className="font-bold">{t.because}</span> {s.because.map(nameOf).join(' · ')}</p>}
                      <SourceList sources={s.sources} />
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
          <div className={`${CARD} flex flex-col gap-3`}>
            <h2 className="text-[22px] font-bold">{t.signalsTitle}</h2>
            {evals.map((e) => <SignalRow key={e.id} e={e} t={t} lang={lang} open={e.status !== 'green'} />)}
          </div>
          <button type="button" className={BTN_SECONDARY} onClick={() => measure(true)}>{t.again}</button>
        </>
      )}
    </Screen>
  );
}
