import { useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import ui from '../../../content/ui.json';
import flow from '../../../content/flow.json';
import type { Finding, HazardId } from '../../domain/types';
import { engine } from '../../app/engine';
import { isOpen, useApp, type AlertRecord, type CaseRecord } from '../../app/store';
import { clock, countdown, fill } from '../../app/format';
import { StatusBadge, StatusIcon } from '../../components/StatusBadge';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, PANEL, Screen, SourceList, SourceTag } from '../../components/ui';

const HAZARD: Record<HazardId, string> = {
  radiation: 'Space radiation', isolation: 'Isolation', distance: 'Distance from Earth', gravity: 'Gravity fields', environment: 'Hostile environment',
};
const DAY_MIN = 1440;

/** Findings: understand → act → verify. One finding at a time, one button. */
export function LoopScreen() {
  const readings = useApp((s) => s.readings);
  const ctx = useApp((s) => s.context);
  const nowTs = useApp((s) => s.nowTs);
  const pending = useApp((s) => s.pending);
  const cases = useApp((s) => s.cases);
  const alerts = useApp((s) => s.alerts);
  const acknowledged = useApp((s) => s.acknowledged);
  const [picked, setPicked] = useState<string | null>(null);

  const findings = useMemo(() => engine.findCompound(readings, ctx), [readings, ctx]);
  const toVerify = cases.find((c) => c.kind === 'finding' && c.verification && c.closedTs === null);
  const pendingCase = pending ? cases.find((c) => c.id === pending.caseId) : undefined;

  if (toVerify) return <Verification record={toVerify} />;
  if (pending && pendingCase) return nowTs < pending.dueTs ? <Waiting finding={pendingCase.finding} /> : <Remeasure finding={pendingCase.finding} />;

  const fresh = findings.filter((f) => acknowledged[f.ruleId] === undefined);
  const current = fresh.find((f) => f.ruleId === picked) ?? fresh[0];
  const others = fresh.filter((f) => f !== current);
  const noted = findings.filter((f) => acknowledged[f.ruleId] !== undefined);

  return (
    <Screen>
      {current ? <FindingDetail finding={current} /> : (
        <div className={`${CARD} flex flex-col gap-2`}>
          <div className="flex items-center gap-3">
            <h1 className="text-[34px] font-bold">{flow.findings.none}</h1>
            <StatusBadge status="green" />
          </div>
          <p className="text-ink-2">{flow.findings.noneHint}</p>
        </div>
      )}

      {others.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-bold text-ink-2">{flow.findings.others}</h2>
          {others.map((f) => (
            <button key={f.ruleId} type="button" onClick={() => setPicked(f.ruleId)} className={`${CARD} flex min-h-[72px] items-center gap-3 !p-4 text-left`}>
              <StatusBadge status={f.status} size="sm" />
              <span className="text-[18px] font-bold">{f.title}</span>
              <span className="ml-auto font-bold text-brand">{flow.findings.open}</span>
            </button>
          ))}
        </div>
      )}

      <History cases={cases} alerts={alerts} noted={noted} acknowledged={acknowledged} />
    </Screen>
  );
}

function Because({ finding }: { finding: Finding }) {
  const official = finding.sources.find((s) => s.official);
  return (
    <>
      <h2 className="font-bold text-ink-2">{ui.finding.because}</h2>
      <ul className="flex flex-col gap-2">
        {finding.because.map((line) => (
          <li key={line} className={`${PANEL} flex items-center gap-3 text-[18px]`}>
            <span className="flex-1">{line}</span>
            {official && line.includes('NASA') && <SourceTag official />}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2 text-[15px] text-ink-2">
        {ui.finding.hazards}
        {finding.hazards.map((h) => <span key={h} className="rounded-full bg-surface-3 px-3 py-1 font-bold text-ink">{HAZARD[h]}</span>)}
      </div>
      <SourceList sources={finding.sources} />
    </>
  );
}

function FindingDetail({ finding }: { finding: Finding }) {
  const nowTs = useApp((s) => s.nowTs);
  const startRecheck = useApp((s) => s.startRecheck);
  const acknowledge = useApp((s) => s.acknowledge);
  const action = finding.actions[0];
  const nextDay = (action.recheckInMin ?? 0) >= DAY_MIN;
  const defs = engine.indicators();
  const recheckName = defs.find((d) => d.id === action.recheckIndicatorId)?.name.toLowerCase() ?? '';

  return (
    <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className={`${CARD} flex flex-col gap-3`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[15px] text-ink-2">{fill(flow.findings.compound, { time: clock(nowTs) })}</p>
          <StatusBadge status={finding.status} />
        </div>
        <h1 className="text-[34px] font-bold leading-tight">{finding.title}</h1>
        <Because finding={finding} />
      </div>

      <div className="flex flex-col gap-4 rounded-sheet border-2 border-brand bg-brand-bg p-6">
        <h2 className="font-bold text-brand">{ui.finding.doNow}</h2>
        <p className="text-[24px] font-bold leading-snug">{action.text}</p>
        {!nextDay && (
          <div className="flex items-center gap-3 rounded-card bg-surface p-4">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M12 3a9 9 0 1 0 9 9" /></svg>
            <div>
              <p className="font-bold">{fill(ui.finding.recheck, { min: action.recheckInMin ?? 30 })}</p>
              <p className="text-[15px] text-ink-2">{fill(flow.findings.remeasure, { name: recheckName })}</p>
            </div>
          </div>
        )}
        <p className="mt-auto text-[15px] text-ink-2">{action.escalate ? flow.findings.escalates : flow.findings.onBoard}</p>
        {nextDay
          ? <button type="button" className={BTN_PRIMARY} onClick={() => acknowledge(finding.ruleId)}>{flow.findings.gotIt}</button>
          : <button type="button" className={BTN_PRIMARY} onClick={() => startRecheck(finding)}>{ui.finding.startTimer}</button>}
      </div>
    </div>
  );
}

function Waiting({ finding }: { finding: Finding }) {
  const nowTs = useApp((s) => s.nowTs);
  const pending = useApp((s) => s.pending)!;
  const skip = useApp((s) => s.skipToRecheck);
  return (
    <Screen>
      <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className={`${CARD} flex flex-col gap-3`}>
          <StatusBadge status={finding.status} />
          <h1 className="text-[34px] font-bold leading-tight">{finding.title}</h1>
          <Because finding={finding} />
        </div>
        <div className={`${CARD} flex flex-col gap-4`}>
          <h2 className="font-bold text-brand">{ui.finding.doNow}</h2>
          <p className="text-[20px]">{finding.actions[0].text}</p>
          <p className="text-[26px] font-bold" role="timer" aria-live="off">
            {fill(flow.findings.timer, { time: '' })}<span className="tabular">{countdown(pending.dueTs - nowTs)}</span>
          </p>
          <button type="button" className={`${BTN_SECONDARY} mt-auto`} onClick={skip}>{flow.demo.skip}</button>
        </div>
      </div>
    </Screen>
  );
}

function Remeasure({ finding }: { finding: Finding }) {
  const pending = useApp((s) => s.pending)!;
  const complete = useApp((s) => s.completeRecheck);
  const def = engine.indicators().find((d) => d.id === pending.indicatorId)!;
  const [value, setValue] = useState<number | null>(null);
  const [text, setText] = useState('');
  const options = def.input === 'boolean' ? [{ v: 0, label: 'No' }, { v: 1, label: 'Yes' }]
    : def.input === 'scale_1_5' ? (def.id === 'headache_score' ? flow.check.headacheScale : ['1', '2', '3', '4', '5']).map((label, i) => ({ v: i + 1, label }))
    : null;
  const chosen = options ? value : text === '' ? null : Number(text);

  return (
    <Screen>
      <div className={`${CARD} flex flex-1 flex-col gap-4`}>
        <p className="text-[15px] text-ink-2">{finding.title}</p>
        <h1 className="text-[34px] font-bold">{fill(flow.findings.remeasure, { name: def.name.toLowerCase() })}</h1>
        <p className="text-ink-2">{flow.findings.remeasureHint}</p>
        {options ? (
          <div role="radiogroup" aria-label={def.name} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
            {options.map((o) => (
              <button key={o.v} type="button" role="radio" aria-checked={value === o.v} onClick={() => setValue(o.v)}
                className={`flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-card border-2 ${value === o.v ? 'border-brand bg-brand-bg font-bold' : 'border-line'}`}>
                {def.input === 'scale_1_5' && <span className="tabular text-[34px]">{o.v}</span>}
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <label className="flex items-baseline gap-3 text-[20px]">
            <input inputMode="decimal" value={text} onChange={(e) => setText(e.target.value.replace(/[^0-9.]/g, ''))} aria-label={def.name}
              className="tabular w-48 rounded-card border-2 border-line bg-surface-2 px-4 py-3 text-[34px]" />
            {def.unit}
          </label>
        )}
        <button type="button" className={`${BTN_PRIMARY} mt-auto`} disabled={chosen === null || !Number.isFinite(chosen)} onClick={() => complete(chosen!)}>{flow.findings.save}</button>
      </div>
    </Screen>
  );
}

function Verification({ record }: { record: CaseRecord }) {
  const closeCase = useApp((s) => s.closeCase);
  const [, navigate] = useLocation();
  const v = record.verification!;
  const improved = v.outcome === 'improved';
  const status = improved ? 'green' : v.outcome === 'worse' ? 'red' : 'yellow';
  const tone = improved ? 'text-ok' : v.outcome === 'worse' ? 'text-act' : 'text-watch';
  const send = () => { closeCase(record.id); navigate('/brief'); };

  return (
    <Screen>
      <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <div className={`${CARD} flex flex-col gap-4`}>
          <p className="text-[15px] text-ink-2">{fill(flow.findings.later, { time: clock(v.ts), min: Math.round((v.ts - record.startedTs) / 60_000) })}</p>
          <h1 className="text-[40px] font-bold">{ui.verify.title}</h1>
          <div className="grid gap-4 sm:grid-cols-2">
            {record.compared.map((c) => (
              <div key={c.label} className={PANEL}>
                <p className="font-bold">{c.label}</p>
                <p className="tabular mt-1 flex items-baseline gap-3 text-[44px]">
                  <span className="text-ink-2">{c.before}</span>
                  <span className="text-[24px] text-ink-2" aria-label="to">→</span>
                  <span className={tone}>{c.after}</span>
                  <span className="font-sans text-[15px] text-ink-2">{c.unit}</span>
                </p>
              </div>
            ))}
          </div>
          <div className={`flex items-center gap-4 rounded-card p-4 ${improved ? 'bg-ok-bg' : v.outcome === 'worse' ? 'bg-act-bg' : 'bg-watch-bg'}`}>
            <span className={tone}><StatusIcon status={status} size={40} /></span>
            <div>
              <p className={`text-[24px] font-bold ${tone}`}>{ui.verify[v.outcome]}</p>
              <p>{v.reason}</p>
            </div>
          </div>
          <div className="mt-auto grid grid-cols-2 gap-3">
            {improved ? (
              <>
                <button type="button" className={BTN_SECONDARY} onClick={send}>{ui.verify.sendToSurgeon}</button>
                <button type="button" className={BTN_PRIMARY} onClick={() => closeCase(record.id)}>{ui.verify.close}</button>
              </>
            ) : (
              <>
                <button type="button" className={BTN_SECONDARY} onClick={() => closeCase(record.id)}>{ui.verify.close}</button>
                <button type="button" className={BTN_PRIMARY} onClick={send}>{ui.verify.sendToSurgeon}</button>
              </>
            )}
          </div>
        </div>
        {improved && (
          <div className="flex flex-col gap-3 rounded-sheet bg-surface-2 p-6">
            <h2 className="font-bold text-ink-2">{flow.findings.ifNot}</h2>
            <StatusBadge status="yellow" label={flow.findings.noBetter} size="sm" />
            <p className="text-[18px]">{flow.findings.ifNotText}</p>
            <p className="mt-auto rounded-card border-2 border-brand p-4 text-center font-bold text-brand">{flow.findings.notImproved}</p>
          </div>
        )}
      </div>
    </Screen>
  );
}

function History({ cases, alerts, noted, acknowledged }: { cases: CaseRecord[]; alerts: AlertRecord[]; noted: Finding[]; acknowledged: Record<string, number> }) {
  const rows = [
    ...cases.filter((c) => c.kind === 'finding').map((c) => ({
      key: c.id, ts: c.startedTs, title: c.finding.title, status: c.finding.status,
      outcome: c.sentToSurgeon ? flow.findings.outcome.sent : c.verification ? flow.findings.outcome[c.verification.outcome] : flow.findings.outcome.open, href: null as string | null,
    })),
    ...alerts.map((a) => ({
      key: a.id, ts: a.alert.detectedTs, title: a.alert.title, status: a.alert.level === 'caution' ? ('yellow' as const) : ('red' as const),
      outcome: isOpen(a) ? flow.findings.outcome.open : a.state === 'escalated' ? flow.findings.outcome.escalated : a.caseId ? flow.findings.outcome.improved : flow.findings.outcome.cleared,
      href: isOpen(a) && a.alert.level !== 'caution' ? '/respond' : null,
    })),
    ...noted.map((f) => ({
      key: `noted:${f.ruleId}`, ts: acknowledged[f.ruleId], title: f.title, status: f.status,
      outcome: fill(flow.findings.noted, { time: clock(acknowledged[f.ruleId]) }), href: null as string | null,
    })),
  ].sort((a, b) => b.ts - a.ts);
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-bold text-ink-2">{flow.findings.history}</h2>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.key} className={`${CARD} flex flex-wrap items-center gap-3 !p-4`}>
            <span className="tabular text-ink-2">{clock(r.ts)}</span>
            <StatusBadge status={r.status} size="sm" />
            <span className="font-bold">{r.title}</span>
            <span className="ml-auto text-ink-2">{r.outcome}</span>
            {r.href && <Link href={r.href} className="font-bold text-brand underline">{flow.findings.continue}</Link>}
          </li>
        ))}
      </ul>
    </div>
  );
}
