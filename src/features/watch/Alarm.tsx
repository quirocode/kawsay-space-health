import { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { flow, te, useLang } from '../../app/i18n';
import type { Status } from '../../domain/types';
import { CREW_ALERT_AFTER_MS, demandingAlert, isOpen, useApp, type AlertRecord } from '../../app/store';
import { clock, countdown, dec, fill } from '../../app/format';
import { sampleAt, windowOf } from '../../data/watchSeries';
import { StatusBadge } from '../../components/StatusBadge';
import { BTN_PRIMARY, BTN_SECONDARY, Thread } from '../../components/ui';
import { WhyPanel } from '../../components/WhyPanel';
import { explainAlert } from '../../app/why/explain';
import { CREW } from '../../data/crew';
import { activityMinutes, RESTING_BAND } from './WatchScreen';
import { startAlarm, stopAlarm } from './alarmSound';

/** The live state of the wearer, shown in the alarm and beside every response step. */
export function StateNow({ compact = false }: { compact?: boolean }) {
  const nowTs = useApp((s) => s.nowTs);
  const recoveryStartTs = useApp((s) => s.recoveryStartTs);
  const lang = useLang();
  const slot = Math.floor(nowTs / 5000) * 5000;
  const now = sampleAt(slot, { recoveryStartTs });
  const trace = windowOf(slot, 600, { recoveryStartTs }, 10).map((s) => s.heartRate);
  const hr: Status = now.activity === 'rest' && now.heartRate >= 130 ? 'red' : now.activity === 'rest' && now.heartRate >= 110 ? 'yellow' : 'green';
  const spo2: Status = now.spo2 < 88 ? 'red' : now.spo2 < 92 ? 'yellow' : 'green';
  const resp: Status = now.activity === 'rest' && now.respRate >= 18 ? 'yellow' : 'green';
  const rows: [string, string, string, Status][] = [
    [flow.watch.signals.heartRate, String(now.heartRate), flow.watch.units.heartRate, hr],
    [flow.watch.signals.spo2, String(now.spo2), flow.watch.units.spo2, spo2],
    [flow.watch.signals.respRate, String(now.respRate), flow.watch.units.respRate, resp],
    [flow.watch.signals.skinTemp, `${now.skinTempDelta >= 0 ? '+' : ''}${dec(now.skinTempDelta.toFixed(1), lang)}`, flow.watch.units.skinTemp, 'green'],
  ];
  return (
    <div className="flex flex-col gap-2 rounded-card bg-surface p-4" aria-live="off">
      <h2 className="font-bold text-ink-2">{flow.alarm.stateNow}</h2>
      {!compact && <Thread values={trace} min={40} max={150} band={RESTING_BAND} tone={hr === 'red' ? 'act' : hr === 'yellow' ? 'watch' : 'ink'} height={56} label={te('Heart rate, last 10 minutes')} />}
      <ul className="flex flex-col gap-1">
        {rows.map(([name, value, unit, status]) => (
          <li key={name} className="flex items-center gap-3">
            <span className="flex-1">{name}</span>
            <span className={`tabular ${compact ? 'text-[22px]' : 'text-[28px]'}`}>{value}</span>
            <span className="w-10 text-[15px] text-ink-2">{unit}</span>
            <StatusBadge status={status} size="sm" />
          </li>
        ))}
        <li className="flex items-center gap-3 text-ink-2">
          <span className="flex-1">{flow.alarm.movement}</span>
          <span>{fill(flow.alarm.stillFor, { activity: flow.activity[now.activity], min: activityMinutes(nowTs, now.activity) })}</span>
        </li>
      </ul>
    </div>
  );
}

function AlarmBody({ record }: { record: AlertRecord }) {
  const lang = useLang();
  const crewId = useApp((s) => s.crewId);
  const nowTs = useApp((s) => s.nowTs);
  const ack = useApp((s) => s.ackAlert);
  const silence = useApp((s) => s.silenceAlert);
  const callCrew = useApp((s) => s.callCrew);
  const [, navigate] = useLocation();
  const { alert } = record;
  const emergency = alert.level === 'emergency';
  const unit = alert.signal === 'spo2' ? '%' : 'bpm';
  const headline = alert.signal === 'heartRate' && alert.activity === 'rest'
    ? `Your heart rate is ${alert.value} ${unit} and you are resting.`
    : `${alert.title}: ${alert.value} ${unit}.`;

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-8">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-3">
          <StatusBadge status="red" label={flow.level[alert.level]} />
          <span className="text-[22px] font-bold">{CREW[crewId].name}</span>
        </span>
        <span className="tabular text-ink-2">{clock(alert.detectedTs)}</span>
      </div>
      <h1 id="alarm-title" className="max-w-[22ch] text-[48px] font-bold leading-[1.05]">{te(headline)}</h1>
      <p className="text-[20px] text-ink-2">
        {te(alert.because[1])} {alert.signal === 'heartRate' && fill(flow.alarm.usual, { low: RESTING_BAND[0], high: RESTING_BAND[1] })}
      </p>
      <WhyPanel why={explainAlert(alert, lang, te)} hideDoNow />

      <div className="grid flex-1 gap-5 lg:grid-cols-2">
        <StateNow />
        <div className="flex flex-col gap-3">
          <div className="rounded-card border-2 border-brand-ink bg-brand-bg p-5">
            <h2 className="font-bold text-brand-ink">{flow.alarm.doFirst}</h2>
            <p className="text-[26px] font-bold leading-snug">{te(alert.firstStep)}</p>
          </div>
          <button type="button" autoFocus className={BTN_PRIMARY} onClick={() => { ack(record.id); navigate('/respond'); }}>{flow.alarm.imHere}</button>
          <button type="button" className={BTN_SECONDARY} disabled={record.crewAlertedTs !== null} onClick={() => callCrew(record.id)}>
            {record.crewAlertedTs !== null ? fill(flow.alarm.crewCalled, { time: clock(record.crewAlertedTs) }) : flow.alarm.callCrew}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {emergency && (
          <p className="flex-1 text-[18px]" role="status">
            {record.crewAlertedTs !== null
              ? fill(flow.alarm.crewCalled, { time: clock(record.crewAlertedTs) })
              : fill(flow.alarm.countdown, { time: countdown(alert.detectedTs + CREW_ALERT_AFTER_MS - nowTs) })}
          </p>
        )}
        <button type="button" className="ml-auto min-h-14 rounded-full border border-line px-5 font-bold" disabled={record.silenced} onClick={() => silence(record.id)}>
          {record.silenced ? flow.alarm.silenced : flow.alarm.silence}
        </button>
      </div>
    </div>
  );
}

/**
 * The one alarm. Emergency takes the whole window; a warning is a sheet over the current
 * screen. Both stay until the crew member answers.
 */
export function AlarmOverlay() {
  const alerts = useApp((s) => s.alerts);
  const record = demandingAlert(alerts);
  const level = record && record.alert.level !== 'caution' ? record.alert.level : null;
  const sounding = record && !record.silenced ? level : null;

  useEffect(() => {
    if (sounding) startAlarm(sounding);
    else stopAlarm();
    return stopAlarm;
  }, [sounding]);

  if (!record || !level) return null;
  if (level === 'emergency') {
    return (
      <div role="alertdialog" aria-modal="true" aria-labelledby="alarm-title" className="alarm-frame fixed inset-0 z-50 bg-bg">
        <AlarmBody record={record} />
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6">
      <div role="alertdialog" aria-modal="true" aria-labelledby="alarm-title" className="max-h-full w-full max-w-[860px] overflow-auto rounded-sheet border-2 border-act bg-bg">
        <AlarmBody record={record} />
      </div>
    </div>
  );
}

/** Quiet strip under the top bar: a caution from the watch, or a response left half way. */
export function AlertBanner() {
  const alerts = useApp((s) => s.alerts);
  const [loc] = useLocation();
  const inProgress = alerts.find((a) => (a.state === 'responding' || a.state === 'rechecking'));
  const caution = alerts.find((a) => isOpen(a) && a.alert.level === 'caution');
  if (inProgress && !loc.startsWith('/respond')) {
    return (
      <div role="status" className="flex items-center gap-3 border-b border-line bg-act-bg px-6 py-2">
        <StatusBadge status="red" label={flow.level[inProgress.alert.level]} size="sm" />
        <span className="font-bold">{te(inProgress.alert.title)}</span>
        <Link href="/respond" className="ml-auto flex min-h-12 items-center font-bold text-brand-ink underline">{flow.alarm.bannerRespond}</Link>
      </div>
    );
  }
  if (caution && !inProgress) {
    return (
      <div role="status" className="flex items-center gap-3 border-b border-line bg-watch-bg px-6 py-2">
        <StatusBadge status="yellow" size="sm" />
        <span className="font-bold">{te(caution.alert.title)}</span>
        <span className="tabular">{te(caution.alert.because[0])}</span>
        <Link href="/watch" className="ml-auto flex min-h-12 items-center font-bold text-brand-ink underline">{flow.alarm.bannerSee}</Link>
      </div>
    );
  }
  return null;
}
