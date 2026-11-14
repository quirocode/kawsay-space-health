import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import flow from '../../../content/flow.json';
import ui from '../../../content/ui.json';
import type { ProtocolStep } from '../../domain/types';
import { watchEngine } from '../../app/engine';
import { useApp, type AlertRecord, type CaseRecord } from '../../app/store';
import { clock, countdown, fill } from '../../app/format';
import { sampleAt } from '../../data/watchSeries';
import { StatusBadge, StatusIcon } from '../../components/StatusBadge';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, PANEL, Screen, SourceTag } from '../../components/ui';
import { StateNow } from './Alarm';

/** Guided response to a watch alert: one step per screen, live state always in view. */
export function RespondScreen() {
  const alerts = useApp((s) => s.alerts);
  const cases = useApp((s) => s.cases);
  const open = alerts.find((a) => a.state === 'responding' || a.state === 'rechecking');
  const closed = [...alerts].reverse().find((a) => a.caseId !== null);
  const record = open ?? closed;

  if (!record) {
    return (
      <Screen>
        <div className={`${CARD} flex flex-col gap-4`}>
          <h1 className="text-[34px] font-bold">{flow.respond.nothing}</h1>
          <Link href="/watch" className={`${BTN_PRIMARY} self-start`}>{flow.respond.backToWatch}</Link>
        </div>
      </Screen>
    );
  }
  const caseRecord = record.caseId ? cases.find((c) => c.id === record.caseId) : undefined;

  return (
    <Screen wide>
      <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <div className={`${CARD} flex flex-col gap-4`}>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status="red" label={flow.level[record.alert.level]} size="sm" />
            <span className="font-bold">{record.alert.title}</span>
            <span className="tabular ml-auto text-ink-2">{clock(record.alert.detectedTs)}</span>
          </div>
          {record.state === 'responding' && <Steps record={record} />}
          {record.state === 'rechecking' && <Recheck record={record} />}
          {record.state === 'resolved' && caseRecord && <Resolved record={caseRecord} />}
          {record.state === 'escalated' && <Escalated record={record} caseRecord={caseRecord} />}
        </div>
        <aside className="flex flex-col gap-5">
          <StateNow compact />
          <Thinks record={record} />
          <CallCrew record={record} />
        </aside>
      </div>
    </Screen>
  );
}

function Thinks({ record }: { record: AlertRecord }) {
  const readings = useApp((s) => s.readings);
  const ctx = useApp((s) => s.context);
  const view = useMemo(
    () => watchEngine.likely(record.alert, readings, sampleAt(record.alert.detectedTs), ctx),
    [record.alert, readings, ctx],
  );
  return (
    <div className={`${CARD} flex flex-col gap-2 !p-4`}>
      <h2 className="font-bold text-ink-2">{flow.respond.thinks}</h2>
      <p className="text-[20px] font-bold">{view.headline}</p>
      <ul className="flex flex-col gap-2">
        {view.reasons.map((r) => (
          <li key={r.text} className="flex items-start gap-2"><span className="flex-1">{r.text}</span><SourceTag official={r.source.official} /></li>
        ))}
      </ul>
      {record.alert.signal === 'heartRate' && <p className="text-[15px] text-ink-2">{flow.respond.notRuledOut}</p>}
    </div>
  );
}

function CallCrew({ record }: { record: AlertRecord }) {
  const callCrew = useApp((s) => s.callCrew);
  return (
    <button type="button" className={BTN_SECONDARY} disabled={record.crewAlertedTs !== null} onClick={() => callCrew(record.id)}>
      {record.crewAlertedTs !== null ? fill(flow.alarm.crewCalled, { time: clock(record.crewAlertedTs) }) : flow.alarm.callCrew}
    </button>
  );
}

function Steps({ record }: { record: AlertRecord }) {
  const steps = useMemo(() => watchEngine.protocol(record.alert), [record.alert]);
  const nextStep = useApp((s) => s.nextStep);
  const startRecheck = useApp((s) => s.startAlertRecheck);
  const index = Math.min(record.stepIndex, steps.length - 1);
  const step = steps[index];
  const last = index === steps.length - 1;
  const advance = () => {
    nextStep(record.id);
    if (last) startRecheck(record.id);
  };
  return (
    <>
      <p className="text-[15px] text-ink-2">{fill(flow.respond.step, { n: index + 1, total: steps.length })}</p>
      <h1 className="text-[34px] font-bold leading-tight">{step.title}</h1>
      <p className="text-[20px] text-ink-2">{step.detail}</p>
      {step.kind === 'question' && <Question key={step.id} record={record} step={step} last={last} />}
      {step.kind === 'measure' && <Measure key={step.id} step={step} onDone={advance} />}
      {step.kind === 'timer' && <Timer key={step.id} step={step} onDone={advance} />}
      {step.kind === 'action' && <button type="button" className={`${BTN_PRIMARY} mt-auto`} onClick={advance}>{flow.respond.done}</button>}
    </>
  );
}

function Question({ record, step, last }: { record: AlertRecord; step: ProtocolStep; last: boolean }) {
  const answer = useApp((s) => s.answerSymptoms);
  const startRecheck = useApp((s) => s.startAlertRecheck);
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) => setPicked((cur) => (id === 'none' ? ['none'] : cur.includes(id) ? cur.filter((x) => x !== id) : [...cur.filter((x) => x !== 'none'), id]));
  return (
    <>
      <div className="grid gap-3">
        {step.options!.map((o) => {
          const on = picked.includes(o.id);
          return (
            <button key={o.id} type="button" role="checkbox" aria-checked={on} onClick={() => toggle(o.id)}
              className={`flex min-h-16 items-center rounded-card border-2 px-5 text-left text-[20px] ${on ? 'border-brand bg-brand-bg font-bold' : 'border-line'}`}>
              {o.label}
            </button>
          );
        })}
      </div>
      <button type="button" className={`${BTN_PRIMARY} mt-auto`} disabled={picked.length === 0}
        onClick={() => { answer(record.id, picked); if (last) startRecheck(record.id); }}>
        {flow.respond.next}
      </button>
    </>
  );
}

function Measure({ step, onDone }: { step: ProtocolStep; onDone: () => void }) {
  const addReadings = useApp((s) => s.addReadings);
  const ctx = useApp((s) => s.context);
  const nowTs = useApp((s) => s.nowTs);
  const ids = step.indicatorIds ?? [];
  const [values, setValues] = useState<string[]>(ids.map(() => ''));
  const ready = values.every((v) => v !== '' && Number.isFinite(Number(v)));
  const save = () => {
    addReadings(ids.map((indicatorId, i) => ({ indicatorId, value: Number(values[i]), ts: nowTs, missionDay: ctx.missionDay, phase: ctx.phase, origin: 'manual' as const })));
    onDone();
  };
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-3">
        {ids.map((id, i) => (
          <label key={id} className="flex items-baseline gap-2 text-[24px]">
            <span className="sr-only">{id === 'bp_systolic' ? 'Top number' : id === 'bp_diastolic' ? 'Bottom number' : id}</span>
            <input inputMode="numeric" value={values[i]} placeholder="–"
              onChange={(e) => setValues((cur) => cur.map((v, j) => (j === i ? e.target.value.replace(/[^0-9.]/g, '').slice(0, 5) : v)))}
              className="tabular w-36 rounded-card border-2 border-line bg-surface-2 px-4 py-3 text-center text-[44px]" />
            {i < ids.length - 1 ? '/' : <span className="text-[18px] text-ink-2">mmHg</span>}
          </label>
        ))}
      </div>
      <div className="mt-auto grid grid-cols-[1fr_2.4fr] gap-3">
        <button type="button" className={BTN_SECONDARY} onClick={onDone}>{ui.check.skip}</button>
        <button type="button" className={BTN_PRIMARY} disabled={!ready} onClick={save}>{flow.respond.save}</button>
      </div>
    </>
  );
}

function Timer({ step, onDone }: { step: ProtocolStep; onDone: () => void }) {
  const nowTs = useApp((s) => s.nowTs);
  const [startTs, setStartTs] = useState<number | null>(null);
  const left = startTs === null ? (step.durationSec ?? 0) * 1000 : startTs + (step.durationSec ?? 0) * 1000 - nowTs;
  const running = startTs !== null && left > 0;
  return (
    <>
      <div className="flex flex-1 items-center justify-center" aria-hidden>
        <span className={`flex h-44 w-44 items-center justify-center rounded-full border-4 border-brand bg-brand-bg ${running ? 'breathe' : ''}`} />
      </div>
      <p className="tabular text-center text-[34px]" role="timer">{countdown(left)}</p>
      {startTs === null
        ? <button type="button" className={`${BTN_PRIMARY} mt-auto`} onClick={() => setStartTs(nowTs)}>{flow.respond.timerStart}</button>
        : <button type="button" className={`${running ? BTN_SECONDARY : BTN_PRIMARY} mt-auto`} onClick={onDone}>{running ? `${flow.demo.skip}` : flow.respond.done}</button>}
    </>
  );
}

function Recheck({ record }: { record: AlertRecord }) {
  const nowTs = useApp((s) => s.nowTs);
  const skip = useApp((s) => s.skipAlertRecheck);
  const finish = useApp((s) => s.finishAlertRecheck);
  const due = record.recheckDueTs ?? nowTs;
  const waiting = nowTs < due;
  return (
    <>
      <h1 className="text-[34px] font-bold leading-tight" role="timer">
        {waiting ? <>{fill(flow.respond.recheckTitle, { time: '' })}<span className="tabular">{countdown(due - nowTs)}</span></> : flow.findings.timerDone}
      </h1>
      <p className="text-[20px] text-ink-2">{flow.respond.recheckHint}</p>
      <div className="mt-auto grid gap-3">
        {waiting && <button type="button" className={BTN_SECONDARY} onClick={() => skip(record.id)}>{flow.demo.skip}</button>}
        <button type="button" className={BTN_PRIMARY} disabled={waiting} onClick={() => finish(record.id)}>{flow.respond.recheckNow}</button>
      </div>
    </>
  );
}

function Compared({ record }: { record: CaseRecord }) {
  const improved = record.verification?.outcome === 'improved';
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {record.compared.map((c) => (
        <div key={c.label} className={PANEL}>
          <p className="font-bold">{c.label}</p>
          <p className="tabular mt-1 flex items-baseline gap-3 text-[44px]">
            <span className="text-ink-2">{c.before}</span>
            <span className="text-[24px] text-ink-2" aria-label="to">→</span>
            <span className={improved ? 'text-ok' : 'text-act'}>{c.after}</span>
            <span className="font-sans text-[15px] text-ink-2">{c.unit}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

function Resolved({ record }: { record: CaseRecord }) {
  const c = record.compared[0];
  return (
    <>
      <h1 className="text-[40px] font-bold">{ui.verify.title}</h1>
      <Compared record={record} />
      <div className="flex items-center gap-4 rounded-card bg-ok-bg p-4">
        <span className="text-ok"><StatusIcon status="green" size={40} /></span>
        <div>
          <p className="text-[24px] font-bold text-ok">{ui.verify.improved}</p>
          {c && <p>{fill(flow.respond.improvedTitle, { before: c.before, after: c.after, unit: c.unit })}</p>}
        </div>
      </div>
      <p className="text-ink-2">{flow.findings.onBoard}</p>
      <div className="mt-auto grid grid-cols-2 gap-3">
        <Link href="/brief" className={BTN_SECONDARY}>{ui.verify.sendToSurgeon}</Link>
        <Link href="/watch" className={BTN_PRIMARY}>{flow.respond.close}</Link>
      </div>
    </>
  );
}

function Escalated({ record, caseRecord }: { record: AlertRecord; caseRecord: CaseRecord | undefined }) {
  const ctx = useApp((s) => s.context);
  const sentTs = record.closedTs ?? record.alert.detectedTs;
  const delay = ctx.commDelayMin;
  const contact = Number.isFinite(delay);
  const c = caseRecord?.compared[0];
  const marks: [string, number][] = [[flow.respond.sentAt, sentTs], [flow.respond.arrivesAt, sentTs + delay * 60_000], [flow.respond.answerAt, sentTs + 2 * delay * 60_000]];
  return (
    <>
      <h1 className="text-[34px] font-bold leading-tight">{flow.respond.escalatedTitle}</h1>
      {c && caseRecord && (
        <>
          <Compared record={caseRecord} />
          <p className="text-[20px]">{fill(flow.respond.notImprovedTitle, { after: c.after, unit: c.unit, min: Math.round(((caseRecord.verification?.ts ?? sentTs) - record.alert.detectedTs) / 60_000) })}</p>
        </>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={PANEL}>
          <h2 className="font-bold text-ink-2">{flow.respond.onBoard}</h2>
          <p className="text-[20px] font-bold">{flow.respond.cmo}</p>
          <p className="text-ink-2">{fill(flow.respond.alertSent, { time: clock(record.crewAlertedTs ?? sentTs) })}</p>
        </div>
        <div className={PANEL}>
          <h2 className="font-bold text-ink-2">{flow.respond.earth}</h2>
          {contact ? (
            <>
              <ol className="mt-1 flex items-start">
                {marks.map(([label, ts], i) => (
                  <li key={label} className="flex flex-1 flex-col gap-1">
                    <span className="flex items-center"><span className="h-3 w-3 rounded-full bg-brand" />{i < marks.length - 1 && <span className="h-0.5 flex-1 bg-brand" />}</span>
                    <span className="tabular text-[18px] font-bold">{clock(ts)}</span>
                    <span className="text-[15px] text-ink-2">{label}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-[15px]">{fill(flow.respond.dontWait, { min: Math.round(delay) })}</p>
            </>
          ) : <p>{flow.respond.noEarth}</p>}
        </div>
      </div>
      <div className={PANEL}>
        <h2 className="font-bold text-ink-2">{flow.respond.whileWait}</h2>
        <ul className="list-disc pl-5">{flow.respond.waitList.map((w) => <li key={w}>{w}</li>)}</ul>
      </div>
      <Link href="/brief" className={`${BTN_PRIMARY} mt-auto`}>{flow.respond.tellEarth}</Link>
    </>
  );
}
