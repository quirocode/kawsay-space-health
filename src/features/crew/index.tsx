import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import crewCopy from '../../../content/crew.json';
import { te, useLang } from '../../app/i18n';
import { engine } from '../../app/engine';
import { crewReadings, useApp } from '../../app/store';
import { ago, fill } from '../../app/format';
import { CREW, CREW_IDS, type CrewId } from '../../data/crew';
import { crewFindings } from '../../domain/crewRules';
import type { Finding, Status } from '../../domain/types';
import { StatusBadge } from '../../components/StatusBadge';
import { WhyPanel } from '../../components/WhyPanel';
import { explainFinding } from '../../app/why/explain';
import { CARD, PANEL, Screen, SourceTag } from '../../components/ui';

export type CrewCopy = typeof crewCopy.en;
export const useCrewCopy = (): CrewCopy => crewCopy[useLang()] as CrewCopy;

const TONE: Record<CrewId, string> = { elena: 'bg-brand', amara: 'bg-ok', mateo: 'bg-watch', kenji: 'bg-act' };

/** Initials on a coloured disc: no photos, no AI faces. */
export function CrewAvatar({ id, size = 48 }: { id: CrewId; size?: number }) {
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-on-brand ${TONE[id]}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {CREW[id].initials}
    </span>
  );
}

/** Header control: who is using this device. Four big portraits, glove-sized. */
export function CrewSwitcher() {
  const crewId = useApp((s) => s.crewId);
  const select = useApp((s) => s.selectCrew);
  const lang = useLang();
  const t = useCrewCopy();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const me = CREW[crewId];
  return (
    <div className="relative">
      <button type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={`${t.switcher.label}: ${me.name}`} onClick={() => setOpen(!open)}
        className="flex min-h-11 items-center gap-2 rounded-full px-2 hover:bg-surface-2">
        <CrewAvatar id={crewId} size={36} />
        <span className="flex flex-col text-left leading-tight">
          <span className="text-[15px] font-bold">{me.short}</span>
          <span className="text-[13px] text-ink-2">{me.role[lang]}</span>
        </span>
        <span aria-hidden>⌄</span>
      </button>
      {open && (
        <div role="dialog" aria-label={t.switcher.title} className="absolute left-0 top-full z-50 mt-2 flex w-[420px] max-w-[92vw] flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-lg">
          <h2 className="text-[18px] font-bold">{t.switcher.title}</h2>
          <p className="text-[15px] text-ink-2">{t.switcher.hint}</p>
          <div className="grid grid-cols-2 gap-2">
            {CREW_IDS.map((id) => {
              const p = CREW[id];
              const on = id === crewId;
              return (
                <button key={id} type="button" aria-pressed={on} onClick={() => { select(id); setOpen(false); }}
                  className={`flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-card border-2 p-3 text-center ${on ? 'border-brand-ink bg-brand-bg' : 'border-line hover:bg-surface-2'}`}>
                  <CrewAvatar id={id} size={56} />
                  <span className="font-bold">{p.name}</span>
                  <span className="text-[13px] text-ink-2">{p.role[lang]}</span>
                </button>
              );
            })}
          </div>
          <Link href="/crew" onClick={() => setOpen(false)} className="flex min-h-12 items-center justify-center font-bold text-brand-ink underline">{t.switcher.seeAll}</Link>
        </div>
      )}
    </div>
  );
}

const RANK: Record<Status, number> = { red: 0, yellow: 1, stale: 2, green: 3 };

export function rttLabel(oneWayMin: number): string {
  const total = Math.round(oneWayMin * 2 * 60);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s ? `${m} min ${s} s` : `${m} min`;
}

/** Medical-officer view: the four records side by side, and what only shows across the crew. */
export function CrewScreen() {
  const state = useApp();
  const { context: ctx, nowTs, crewId, selectCrew } = state;
  const lang = useLang();
  const t = useCrewCopy();
  const [, navigate] = useLocation();
  const byCrew = useMemo(() => crewReadings(state), [state.crewId, state.readings, state.crewSlices]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => CREW_IDS.map((id) => {
    const readings = byCrew[id].filter((r) => r.ts <= nowTs);
    const evals = engine.evaluate(readings, [], ctx, nowTs).filter((e) => e.status !== 'stale');
    const findings = engine.findCompound(readings, ctx, nowTs);
    const red = evals.filter((e) => e.status === 'red').length + findings.filter((f) => f.status === 'red').length;
    const yellow = evals.filter((e) => e.status === 'yellow').length + findings.filter((f) => f.status === 'yellow').length;
    const status: Status = red ? 'red' : yellow ? 'yellow' : 'green';
    const lastManual = readings.filter((r) => r.origin === 'manual').reduce((m, r) => Math.max(m, r.ts), 0);
    return { id, findings, red, yellow, status, lastManual };
  }).sort((a, b) => RANK[a.status] - RANK[b.status]), [byCrew, ctx, nowTs]);

  const names = Object.fromEntries(CREW_IDS.map((id) => [id, CREW[id].short]));
  const shared = useMemo(() => crewFindings(byCrew, names, ctx), [byCrew, ctx]); // eslint-disable-line react-hooks/exhaustive-deps

  const delay = ctx.commDelayMin;
  const eimo = !Number.isFinite(delay) ? t.crew.eimoNone : delay < 1 ? t.crew.eimoNear : fill(t.crew.eimo, { rtt: rttLabel(delay) });
  const open = (id: CrewId, f?: Finding) => { selectCrew(id); navigate(f ? '/loop' : '/check'); };

  return (
    <Screen>
      {shared.length > 0 && <div className={`${CARD} flex flex-col gap-3 border-2 border-act`}>
        <h2 className="text-[24px] font-bold">{t.crew.shared}</h2>
        <p className="text-ink-2">{t.crew.sharedHint}</p>
        {shared.length === 0 && <p className={PANEL}>{t.crew.noShared}</p>}
        {shared.map((f) => (
          <article key={f.ruleId} className={`${PANEL} flex flex-col gap-2`}>
            <div className="flex flex-wrap items-center gap-3"><StatusBadge status={f.status} size="sm" /><h3 className="text-[20px] font-bold">{te(f.title)}</h3></div>
            <ul className="list-disc pl-6">{f.because.map((b) => <li key={b}>{te(b)}</li>)}</ul>
            <p className="font-bold">{te(f.actions[0].text)}</p>
            <WhyPanel why={explainFinding(f, lang, te, false)} hideDoNow />
          </article>
        ))}
      </div>}
      <div className={`${CARD} flex flex-col gap-4`}>
        <h1 className="text-[34px] font-bold">{t.crew.title}</h1>
        <p className="text-ink-2">{t.crew.intro}</p>
        <p className={`${PANEL} font-bold`} role="note">{eimo}</p>
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map(({ id, findings, red, yellow, status, lastManual }) => {
            const p = CREW[id];
            return (
              <article key={id} className={`flex flex-col gap-3 rounded-card border-2 p-4 ${status === 'red' ? 'border-act' : status === 'yellow' ? 'border-watch' : 'border-line'}`}>
                <div className="flex items-center gap-3">
                  <CrewAvatar id={id} size={56} />
                  <div className="flex flex-1 flex-col">
                    <span className="text-[20px] font-bold">{p.name}</span>
                    <span className="text-[14px] text-ink-2">{p.role[lang]} · {p.age} · {p.sex === 'female' ? (lang === 'es' ? 'mujer' : 'female') : (lang === 'es' ? 'hombre' : 'male')}</span>
                  </div>
                  <StatusBadge status={status} size="sm" />
                </div>
                <p className="text-[15px] text-ink-2">
                  {fill(t.crew.statusOf, { n: red, m: yellow })}
                  {lastManual > 0 && ` · ${fill(t.crew.lastCheck, { age: ago(nowTs - lastManual, lang) })}`}
                  {id === crewId && ` · ${t.crew.yourRecord}`}
                </p>
                {findings.length === 0
                  ? <p className="text-[15px]">{t.crew.noFindings}</p>
                  : <ul className="flex flex-col gap-1">{findings.slice(0, 3).map((f) => (
                      <li key={f.ruleId} className="flex items-center gap-2 text-[16px]"><StatusBadge status={f.status} size="sm" /><span className="font-bold">{te(f.title)}</span></li>
                    ))}</ul>}
                <div className="mt-auto flex flex-wrap gap-2">
                  <button type="button" onClick={() => open(id, findings[0])}
                    className={`min-h-12 rounded-card px-4 font-bold ${status === 'red' ? 'bg-brand text-on-brand' : 'border-2 border-brand-ink text-brand-ink'}`}>
                    {id === crewId ? t.crew.open : fill(t.crew.respondFor, { name: p.short })}
                  </button>
                </div>
                <details className="text-[15px]">
                  <summary className="inline-flex min-h-12 cursor-pointer items-center font-bold text-brand-ink">{fill(t.crew.watchFor, { name: p.short })}</summary>
                  <ul className="flex flex-col gap-2">
                    {p.notes.map((n) => <li key={n.text.en} className="flex items-start gap-2"><SourceTag official={n.source.official} /><span>{n.text[lang]}</span></li>)}
                  </ul>
                </details>
              </article>
            );
          })}
        </div>
        <p className="text-[14px] text-ink-2">{t.crew.privacy}</p>
      </div>

    </Screen>
  );
}
