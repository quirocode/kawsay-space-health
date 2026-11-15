import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { clock, dec } from '../../app/format';
import { te, useLang } from '../../app/i18n';
import { engine, loadDemoMission } from '../../app/engine';
import { Glyph } from '../../app/WorkspaceNav';
import { cabinCo2 } from '../../domain/cabinCo2';
import { StatusBadge } from '../../components/StatusBadge';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, Screen } from '../../components/ui';
import { CabinEvidence } from './CabinEvidence';

const copy = {
  en: {
    title: 'Guided mission', intro: 'Day 142 · Transit to Mars',
    scope: 'Simulation · about 90 seconds · runs separately from your mission log',
    stages: ['Report', 'Review', 'Recheck', 'Brief Earth'],
    titles: ['A crewmate reports a headache', 'Review the cabin evidence', 'Check what changed', 'Send the update in the simulation'],
    notes: [
      'Earth is 14 minutes away by signal. The crew logs a headache and checks the cabin readings while waiting for ground support.',
      'The prototype flags a combination of headache, short sleep and elevated cabin CO₂. The crew checks ventilation in this scenario and schedules a recheck.',
      'The simulation advances by 65 minutes to show a fresh one-hour window. Compare the result with the original report before preparing the brief.',
      'Review the simulated brief. The estimated time of receipt includes the one-way communication delay.',
    ],
    next: ['Log simulated report', 'Simulate cabin check', 'Prepare brief', 'Queue simulated brief'],
    back: 'Back', restart: 'Restart mission', exit: 'Return to Future Self', complete: 'Simulated brief queued',
    status: 'Simulation', at: 'Mission time', latest: 'Simulated crew report', average: 'Cabin CO₂ · 1-hour average',
    headache: 'Headache', before: 'Before', after: 'After', eta: 'Estimated receipt on Earth', delay: 'One-way signal delay',
    insufficient: 'Insufficient data', result: 'Recheck result', sources: 'Review the evidence used to build this brief',
    why: 'The scenario records a drop in both the reported headache and the cabin average.',
    wait: 'No message was sent outside this simulation.',
  },
  es: {
    title: 'Misión guiada', intro: 'Día 142 · Tránsito a Marte',
    scope: 'Simulación · unos 90 segundos · separada de tu historial de misión',
    stages: ['Registrar', 'Revisar', 'Reevaluar', 'Informar a Tierra'],
    titles: ['Un tripulante reporta dolor de cabeza', 'Revisa los datos de la cabina', 'Comprueba qué cambió', 'Envía el informe en la simulación'],
    notes: [
      'La señal tarda 14 minutos en llegar a Tierra. La tripulación registra el dolor de cabeza y revisa las lecturas de cabina mientras espera apoyo.',
      'El prototipo cruza el dolor de cabeza, el sueño reciente y el CO₂ elevado. En este escenario, la tripulación comprueba la ventilación y programa una reevaluación.',
      'La simulación avanza 65 minutos para mostrar una nueva ventana de una hora. Compara el resultado con el reporte inicial antes de preparar el informe.',
      'Revisa el informe simulado. La hora estimada de recepción incluye la demora de la señal en un sentido.',
    ],
    next: ['Registrar reporte simulado', 'Simular revisión de cabina', 'Preparar informe', 'Poner informe simulado en cola'],
    back: 'Atrás', restart: 'Reiniciar misión', exit: 'Volver a Yo futuro', complete: 'Informe simulado en cola',
    status: 'Simulación', at: 'Hora de misión', latest: 'Reporte simulado de la tripulación', average: 'CO₂ de cabina · promedio de 1 h',
    headache: 'Dolor de cabeza', before: 'Antes', after: 'Después', eta: 'Recepción estimada en Tierra', delay: 'Demora de la señal en un sentido',
    insufficient: 'Datos insuficientes', result: 'Resultado de la reevaluación', sources: 'Revisar la evidencia del informe',
    why: 'El escenario registra una disminución tanto en el dolor reportado como en el promedio de cabina.',
    wait: 'El informe queda dentro de la simulación.',
  },
} as const;

function buildScenario() {
  const mission = loadDemoMission();
  const before = mission.beats.headache.find((r) => r.indicatorId === 'headache_score')!;
  const after = mission.beats.verification.find((r) => r.indicatorId === 'headache_score')!;
  const initial = [...mission.history, ...mission.beats.headache];
  const recovered = [...initial, ...mission.beats.verification];
  const finding = engine.findCompound(initial, mission.context, before.ts).find((f) => f.ruleId === 'co2_headache')!;
  const verification = engine.verify(before, after);
  const brief = engine.brief({
    findings: [finding], verifications: [verification], ctx: mission.context, nowTs: after.ts,
    readiness: engine.project(recovered, mission.context, mission.defaultPlan),
  });
  return { context: mission.context, before, after, initial, recovered, finding, verification, brief };
}

export function MissionGuide() {
  const lang = useLang();
  const t = copy[lang];
  const scene = useMemo(buildScenario, []);
  const [step, setStep] = useState(0);
  const done = step === t.stages.length;
  const nowTs = step < 2 ? scene.before.ts : scene.after.ts;
  const beforeCo2 = cabinCo2(scene.initial, scene.before.ts).value;
  const afterCo2 = cabinCo2(scene.recovered, scene.after.ts).value;
  const value = (n: number | null) => n === null ? t.insufficient : `${dec(Number(n.toFixed(2)), lang)} mmHg`;

  return <Screen>
    <header className="mission-guide-header">
      <div>
        <p className="text-sm font-semibold text-brand-ink">{t.intro}</p>
        <h1 className="text-[clamp(30px,5vw,44px)] font-bold tracking-tight">{t.title}</h1>
        <p className="text-sm text-ink-2">{t.scope}</p>
      </div>
      <Link className="dashboard-secondary !w-auto" href="/">{t.exit}</Link>
    </header>
    <ol className="mission-guide-steps" aria-label={t.title}>
      {t.stages.map((label, i) => <li key={label} aria-current={i === step ? 'step' : undefined} data-complete={i < step}>
        <span>{i < step ? '✓' : i + 1}</span>{label}
      </li>)}
    </ol>
    <article className={`${CARD} flex flex-col gap-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-2">
        <span>{t.at} · <span className="tabular">{clock(nowTs)}</span></span>
        <span className="rounded-full bg-brand-bg px-3 py-1 font-semibold text-brand-ink">{t.status}</span>
      </div>
      <div aria-live="polite">
        <h2 className="text-2xl font-bold">{done ? t.complete : t.titles[step]}</h2>
        <p className="mt-1 text-ink-2">{done ? t.wait : t.notes[step]}</p>
      </div>
      {step === 0 && (
        <div className="rounded-card border border-line bg-surface-2 p-4">
          <p className="text-sm text-ink-2">{t.latest}</p><p className="text-xl font-bold">{t.headache} · {scene.before.value}/5</p>
        </div>
      )}
      {step === 1 && <>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={scene.finding.status} /><strong>{te(scene.finding.title)}</strong>
        </div>
        <CabinEvidence readings={scene.initial} nowTs={scene.before.ts} context={scene.context} />
      </>}
      {step === 2 && <>
        <div className="grid gap-3 sm:grid-cols-2">
          {[[t.headache, `${scene.before.value}/5`, `${scene.after.value}/5`], [t.average, value(beforeCo2), value(afterCo2)]].map(([label, before, after]) => (
            <div className="rounded-card border border-line bg-surface-2 p-4" key={label}>
              <p className="font-bold">{label}</p>
              <dl className="mt-2 grid grid-cols-2 gap-3">
                <div><dt className="text-xs text-ink-2">{t.before}</dt><dd className="tabular text-lg">{before}</dd></div>
                <div><dt className="text-xs text-ink-2">{t.after}</dt><dd className="tabular text-lg font-bold">{after}</dd></div>
              </dl>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3"><StatusBadge status={scene.verification.outcome === 'improved' ? 'green' : 'yellow'} label={t.result} /><span>{t.why}</span></div>
      </>}
      {step >= 3 && <>
        <div className="rounded-card border border-line bg-surface-2 p-4">
          <p className="font-bold">{te(scene.brief.headline)}</p>
          <p className="mt-2 text-sm text-ink-2">{te(scene.brief.decisionRequested)}</p>
          <ul className="mt-3 flex flex-wrap gap-2 text-sm" aria-label={t.result}>
            <li className="rounded-md bg-surface px-2.5 py-1">{t.headache} · {scene.before.value}/5 → {scene.after.value}/5</li>
            <li className="rounded-md bg-surface px-2.5 py-1">{t.average} · {value(beforeCo2)} → {value(afterCo2)}</li>
          </ul>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div><dt className="text-sm text-ink-2">{t.delay}</dt><dd className="tabular font-bold">{scene.brief.commDelayMin} min</dd></div>
            <div><dt className="text-sm text-ink-2">{t.eta}</dt><dd className="tabular font-bold">{scene.brief.arrivesAtTs === null ? '—' : clock(scene.brief.arrivesAtTs)}</dd></div>
          </dl>
        </div>
        <details><summary className="cursor-pointer text-sm font-semibold text-brand-ink">{t.sources}</summary>
          <div className="mt-3"><CabinEvidence readings={scene.initial} nowTs={scene.before.ts} context={scene.context} /></div>
        </details>
      </>}
      <footer className="flex flex-wrap justify-between gap-3 pt-3">
        {step > 0 && !done && <button className={BTN_SECONDARY} type="button" onClick={() => setStep(step - 1)}>{t.back}</button>}
        {done ? <button className={BTN_SECONDARY} type="button" onClick={() => setStep(0)}>{t.restart}</button>
          : <button className={`${BTN_PRIMARY} ml-auto gap-2`} type="button" onClick={() => setStep(step + 1)}>
            {t.next[step]}<Glyph name="missionGuide" size={16} />
          </button>}
      </footer>
    </article>
  </Screen>;
}
