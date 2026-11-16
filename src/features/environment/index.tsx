import { useEffect, useState, type FormEvent } from 'react';
import { ui, useLang } from '../../app/i18n';
import { flow } from '../../app/i18n';
import type { Environment, MissionPhase } from '../../domain/types';
import { MAX_MISSION_DAYS, useApp } from '../../app/store';
import { ADVANCED_SPACE_INDICATORS, analyzeCrewCohort, CREW_ROSTER, evaluateSilentSpaceRisks, getCrewMember } from '../../domain/crew';
import { fill } from '../../app/format';
import { StatusBadge } from '../../components/StatusBadge';
import { BTN_PRIMARY, CARD, PANEL, Screen } from '../../components/ui';

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
    { env: 'iss', name: ui.environment.iss.name, description: ui.environment.iss.description, gravity: flow.environment.microG, delay: flow.environment.seconds, delayMin: 0 },
    { env: 'orion', name: ui.environment.orion.name, description: ui.environment.orion.description, gravity: flow.environment.microG, delay: flow.environment.seconds, delayMin: 0 },
    { env: 'moon', name: ui.environment.moon.name, description: ui.environment.moon.description, gravity: flow.environment.moonG, delay: flow.environment.seconds, delayMin: 0 },
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
      <CrewSquadPanel />
      <OperationalPhaseSelector />
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

  useEffect(() => {
    setName(mission.name);
    setCrew(mission.crew);
  }, [mission.name, mission.crew]);

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

/**
 * 4-Astronaut Crew Profiles, Pre-existing Conditions, Missing Deep-Space Indicators & Silent Risks.
 */
function CrewSquadPanel() {
  const lang = useLang();
  const es = lang === 'es';
  const activeCrewId = useApp((s) => s.activeCrewId);
  const selectCrewMember = useApp((s) => s.selectCrewMember);
  const readings = useApp((s) => s.readings);
  const ctx = useApp((s) => s.context);

  const active = getCrewMember(activeCrewId);
  const silentAlerts = evaluateSilentSpaceRisks(active, readings, ctx);
  const cohort = analyzeCrewCohort(readings, ctx);

  return (
    <div className={`${CARD} flex flex-col gap-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[28px] font-bold">
            {es ? 'Escuadrón de 4 Astronautas · Perfiles y Riesgos Silenciosos' : '4-Astronaut Crew · Profiles & Silent Risks'}
          </h2>
          <p className="text-ink-2">
            {es
              ? 'Cada astronauta tiene su línea base pre-vuelo, dispositivo asignado y condiciones preexistentes aisladas.'
              : 'Each astronaut has an isolated pre-flight baseline, assigned device, and pre-existing condition profile.'}
          </p>
        </div>
        <StatusBadge status={cohort.status} />
      </div>

      <div className={`${PANEL} flex flex-col gap-1 border border-line`}>
        <p className="text-[16px] font-bold">{cohort.title[lang]}</p>
        <p className="text-[14px] text-ink-2">{cohort.detail[lang]}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CREW_ROSTER.map((member) => {
          const isSelected = member.id === active.id;
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => selectCrewMember(member.id)}
              className={`flex flex-col gap-2 rounded-card border-2 p-4 text-left ${
                isSelected ? 'border-brand-ink bg-brand-bg' : 'border-line bg-surface-2 hover:border-brand-ink'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded bg-brand px-2 py-0.5 text-[13px] font-bold text-on-brand">{member.role}</span>
                {isSelected && (
                  <span className="rounded-full border border-brand-ink px-2 py-0.5 text-[12px] font-bold text-brand-ink">
                    {es ? 'Perfil activo' : 'Active profile'}
                  </span>
                )}
              </div>
              <p className="text-[20px] font-bold text-ink">{member.name}</p>
              <p className="text-[13px] text-ink-2">{member.roleTitle[lang]}</p>
              <p className="text-[12px] text-ink-2">
                {es ? 'Basal:' : 'Baseline:'} {member.baseline.restingHrBpm} bpm · {member.baseline.systolicMmHg}/{member.baseline.diastolicMmHg} mmHg · HRV {member.baseline.hrvRmssdMs} ms
              </p>
              <div className="mt-auto border-t border-line pt-2 text-[12px]">
                <span className="font-bold text-watch">{es ? 'Preexistencia:' : 'Pre-existing:'}</span>{' '}
                <span>{member.preExisting[0]?.name[lang]}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${PANEL} flex flex-col gap-2.5`}>
          <h3 className="text-[18px] font-bold text-brand-ink">
            {es
              ? `Vigilancia de Enfermedades Silenciosas y Preexistencias (${active.role} ${active.name})`
              : `Silent Disease & Pre-existing Surveillance (${active.role} ${active.name})`}
          </h3>
          {active.preExisting.map((pre) => (
            <div key={pre.id} className="rounded-lg bg-surface p-3 text-[14px]">
              <p className="font-bold text-ink">{pre.name[lang]}</p>
              <p className="mt-0.5 text-ink-2">{pre.clinicalNote[lang]}</p>
              <p className="mt-1 font-semibold text-watch">{pre.silentTrigger[lang]}</p>
            </div>
          ))}
          {silentAlerts.map((alert) => (
            <div key={alert.id} className="rounded-lg border-2 border-watch bg-watch-bg p-3 text-[14px]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-ink">{alert.title[lang]}</span>
                <span className="tabular rounded bg-surface px-2 py-0.5 text-[12px] font-bold">
                  {alert.metricLabel}: {alert.metricValue}
                </span>
              </div>
              <p className="mt-1 text-ink">{alert.physiologicalMechanism[lang]}</p>
              <p className="mt-1 text-[13px] text-ink-2">
                <strong>{es ? 'Por qué no lo notarías:' : 'Why you would miss it:'}</strong> {alert.whyUnnoticed[lang]}
              </p>
              <p className="mt-1.5 font-bold text-brand-ink">
                {es ? 'Acción preventiva:' : 'Preventive action:'} {alert.preventiveAction[lang]}
              </p>
            </div>
          ))}
        </div>

        <div className={`${PANEL} flex flex-col gap-2.5`}>
          <h3 className="text-[18px] font-bold text-brand-ink">
            {es
              ? 'Indicadores Avanzados de Espacio Profundo (Biomarcadores Silenciosos)'
              : 'Advanced Deep-Space Indicators (Silent Biomarkers)'}
          </h3>
          <ul className="grid gap-2">
            {ADVANCED_SPACE_INDICATORS.map((ind) => {
              const val = active.advancedMetrics[ind.id];
              return (
                <li key={ind.id} className="rounded-lg bg-surface p-2.5 text-[14px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-ink">{ind.name[lang]}</span>
                    <span className="tabular font-bold text-brand-ink">
                      {val} {ind.unit}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[13px] text-ink-2">{ind.silentDiseaseCaught[lang]}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Operational Flight Phase Selector: allows switching `ctx.phase` between cruise, pre_eva, eva,
 * pre_landing, and surface so phase-gated compound rules (like `dcs_eva` and `orthostatic_landing`) work.
 */
function OperationalPhaseSelector() {
  const lang = useLang();
  const es = lang === 'es';
  const phase = useApp((s) => s.context.phase);
  const setPhase = useApp((s) => s.setPhase);

  const phases: { id: MissionPhase; label: string; hint: string }[] = [
    { id: 'cruise', label: es ? 'Crucero intravehicular' : 'Intravehicular cruise', hint: es ? 'Rutina de cabina, ejercicio ARED y vigilancia continua' : 'Cabin routine, ARED exercise & continuous watch' },
    { id: 'pre_eva', label: es ? 'Pre-EVA (Desnitrogenación)' : 'Pre-EVA (Prebreathe)', hint: es ? 'Lavado de nitrógeno con O₂ antes de caminata espacial' : 'O₂ nitrogen washout prior to spacewalk' },
    { id: 'eva', label: es ? 'Caminata Espacial (EVA Activa)' : 'Spacewalk (Active EVA)', hint: es ? 'Activa reglas de descompresión (DCS) y copiloto de traje 4.3 psi' : 'Activates decompression (DCS) rules & 4.3 psi suit copilot' },
    { id: 'pre_landing', label: es ? 'Pre-Aterrizaje / Entrada' : 'Pre-Landing / Entry', hint: es ? 'Activa protocolo de carga hidrosalina y prevención de síncope' : 'Activates fluid-loading & syncope prevention rules' },
    { id: 'surface', label: es ? 'Operaciones en Superficie' : 'Surface Operations', hint: es ? 'Readaptación vestibular, polvo planetario y gravedad parcial' : 'Vestibular readaptation, planetary dust & partial gravity' },
  ];

  return (
    <div className={`${CARD} flex flex-col gap-3`}>
      <h2 className="text-[24px] font-bold">
        {es ? 'Fase Operativa Actual de la Misión' : 'Current Operational Mission Phase'}
      </h2>
      <p className="text-ink-2">
        {es
          ? 'Define la actividad operativa actual para activar las reglas clínicas de descompresión (EVA) o transición a gravedad (Pre-Aterrizaje).'
          : 'Sets the active operational phase to enable decompression (EVA) or gravity-transition (Pre-Landing) clinical rules.'}
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {phases.map((p) => {
          const on = phase === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPhase(p.id)}
              className={`flex flex-col gap-1 rounded-card border-2 p-3 text-left ${
                on ? 'border-brand-ink bg-brand-bg' : 'border-line bg-surface-2 hover:border-brand-ink'
              }`}
            >
              <span className="font-bold text-ink">{p.label}</span>
              <span className="text-[13px] text-ink-2">{p.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
