import { useMemo } from 'react';
import { Link } from 'wouter';
import flow from '../../../content/flow.json';
import type { ActivityState, Reading, Status, WatchSample } from '../../domain/types';
import { engine } from '../../app/engine';
import { isOpen, useApp } from '../../app/store';
import { ago, clock, fill } from '../../app/format';
import { sampleAt, windowOf } from '../../data/watchSeries';
import { tsOf } from '../../data/sol142';
import { StatusBadge } from '../../components/StatusBadge';
import { BTN_PRIMARY, CARD, PANEL, Screen, Thread } from '../../components/ui';

/** Personal resting range for the demo crew member (prototype; a real watch learns it in a week). */
export const RESTING_BAND: [number, number] = [56, 68];

const ACTIVITY_TONE: Record<ActivityState, string> = {
  sleep: 'bg-surface-3', rest: 'bg-surface-2', active: 'bg-brand-bg', exercise: 'bg-brand', eva: 'bg-brand',
};

/** How long the current activity has lasted, in minutes (looks back at most three hours). */
export function activityMinutes(nowTs: number, activity: ActivityState): number {
  let min = 0;
  while (min < 180 && sampleAt(nowTs - (min + 1) * 60_000).activity === activity) min++;
  return min;
}

const toneOf = (s: Status) => (s === 'green' ? 'ink' : s === 'yellow' ? 'watch' : s === 'red' ? 'act' : 'stale');

/** Everything the watch collects, and plainly what it cannot. */
export function WatchScreen() {
  const nowTs = useApp((s) => s.nowTs);
  const ctx = useApp((s) => s.context);
  const readings = useApp((s) => s.readings);
  const alerts = useApp((s) => s.alerts);
  const recoveryStartTs = useApp((s) => s.recoveryStartTs);
  const scenario = useMemo(() => ({ recoveryStartTs }), [recoveryStartTs]);

  // Re-read the series every 5 s (the watch's own rate), not on every clock tick.
  const slot = Math.floor(nowTs / 5000);
  const now = useMemo(() => sampleAt(slot * 5000, scenario), [slot, scenario]);
  const hour = useMemo(() => windowOf(slot * 5000, 3600, scenario, 30), [slot, scenario]);
  const minuteSlot = Math.floor(nowTs / 60_000);
  const day = useMemo(() => {
    const start = tsOf(ctx.missionDay, 0, 0);
    const out: WatchSample[] = [];
    for (let ts = start; ts <= minuteSlot * 60_000; ts += 300_000) out.push(sampleAt(ts, scenario));
    return out;
  }, [ctx.missionDay, minuteSlot, scenario]);

  const openHeart = alerts.find((a) => isOpen(a) && a.alert.signal === 'heartRate');
  const openSpo2 = alerts.find((a) => isOpen(a) && a.alert.signal === 'spo2');
  const level = (a: typeof openHeart): Status => (!a ? 'green' : a.alert.level === 'caution' ? 'yellow' : 'red');
  const mins = activityMinutes(nowTs, now.activity);
  const context = `${flow.activity[now.activity].toLowerCase()} · ${fill(flow.watch.forMin, { min: mins })}`;

  const tiles: { key: string; name: string; value: string; unit: string; status: Status; series: number[]; min: number; max: number; band?: [number, number]; note: string }[] = [
    { key: 'hr', name: flow.watch.signals.heartRate, value: String(now.heartRate), unit: flow.watch.units.heartRate, status: level(openHeart), series: hour.map((s) => s.heartRate), min: 40, max: 150, band: now.activity === 'rest' ? RESTING_BAND : undefined, note: now.activity === 'rest' ? fill(flow.watch.usual, { low: RESTING_BAND[0], high: RESTING_BAND[1] }) : context },
    { key: 'spo2', name: flow.watch.signals.spo2, value: String(now.spo2), unit: flow.watch.units.spo2, status: level(openSpo2), series: hour.map((s) => s.spo2), min: 85, max: 100, band: [95, 100], note: context },
    { key: 'resp', name: flow.watch.signals.respRate, value: String(now.respRate), unit: flow.watch.units.respRate, status: 'green', series: hour.map((s) => s.respRate), min: 8, max: 32, note: context },
    { key: 'skin', name: flow.watch.signals.skinTemp, value: `${now.skinTempDelta >= 0 ? '+' : ''}${now.skinTempDelta.toFixed(1)}`, unit: flow.watch.units.skinTemp, status: 'green', series: hour.map((s) => s.skinTempDelta), min: -1, max: 2, band: [-0.5, 0.5], note: flow.watch.vsUsual },
    { key: 'hrv', name: flow.watch.signals.hrv, value: String(now.hrv), unit: flow.watch.units.hrv, status: 'green', series: hour.map((s) => s.hrv), min: 0, max: 70, note: context },
  ];

  const blocks = useMemo(() => {
    const out: { activity: ActivityState; count: number }[] = [];
    for (const s of day) {
      const last = out[out.length - 1];
      if (last && last.activity === s.activity) last.count++;
      else out.push({ activity: s.activity, count: 1 });
    }
    return out;
  }, [day]);
  const dayStart = tsOf(ctx.missionDay, 0, 0);
  const knots = alerts
    .filter((a) => a.alert.detectedTs >= dayStart && a.alert.signal !== 'quality')
    .map((a) => ({ index: Math.min(day.length - 1, Math.floor((a.alert.detectedTs - dayStart) / 300_000)), size: a.alert.level === 'emergency' ? 6 : a.alert.level === 'warning' ? 5 : 4 }));

  const evals = useMemo(() => engine.evaluate(readings, [], ctx, nowTs), [readings, ctx, nowTs]);
  const latest = (id: string): Reading | undefined => {
    let best: Reading | undefined;
    for (const r of readings) if (r.indicatorId === id && (!best || r.ts > best.ts)) best = r;
    return best;
  };
  const manual = [
    { label: flow.check.steps.bp, ids: ['bp_systolic', 'bp_diastolic'], unit: 'mmHg' },
    { label: flow.check.steps.glucose, ids: ['glucose'], unit: 'mg/dL' },
    { label: flow.check.steps.temp, ids: ['body_temp'], unit: '°C' },
    { label: flow.check.steps.mood, ids: ['mood'], unit: 'of 5' },
  ];

  return (
    <Screen wide>
      <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,2.4fr)_minmax(280px,1fr)]">
        <div className="flex flex-col gap-5">
          <div className={`${CARD} flex flex-wrap items-center gap-x-6 gap-y-1 !p-4`}>
            <h1 className="text-[22px] font-bold">{flow.watch.device}</h1>
            <span className="text-ink-2">{fill(flow.watch.lastReading, { age: ago(nowTs - now.ts) })}</span>
            <span className="text-ink-2">{flow.watch.quality}</span>
            <span className="ml-auto rounded-full border border-line px-3 py-1 text-[15px] text-ink-2">{flow.watch.simulated}</span>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label={flow.watch.title}>
            {tiles.map((t) => (
              <li key={t.key} className={`${CARD} flex flex-col gap-1 !p-4`}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-bold">{t.name}</h2>
                  <StatusBadge status={t.status} size="sm" />
                </div>
                <p className="flex items-baseline gap-2">
                  <span className="tabular text-[44px] leading-none" data-testid={`watch-${t.key}`}>{t.value}</span>
                  <span className="text-ink-2">{t.unit}</span>
                </p>
                <Thread values={t.series} min={t.min} max={t.max} band={t.band} tone={toneOf(t.status)} height={44} label={`${t.name}, ${flow.watch.lastHour.toLowerCase()}`} />
                <p className="text-[15px] text-ink-2">{t.note}</p>
              </li>
            ))}
            <li className={`${CARD} flex flex-col gap-1 !p-4`}>
              <h2 className="font-bold">{flow.watch.signals.activity}</h2>
              <p className="text-[34px] font-bold leading-tight">{flow.activity[now.activity]}</p>
              <p className="text-[15px] text-ink-2">{fill(flow.watch.forMin, { min: mins })}</p>
            </li>
          </ul>

          <div className={`${CARD} flex flex-col gap-2`}>
            <h2 className="text-[20px] font-bold">{flow.watch.today}</h2>
            <p className="text-[15px] text-ink-2">{flow.watch.todayHint}</p>
            <Thread values={day.map((s) => s.heartRate)} min={40} max={150} knots={knots} tone={openHeart ? toneOf(level(openHeart)) : 'ink'} height={90} label={`${flow.watch.signals.heartRate}, ${flow.watch.today.toLowerCase()}`} />
            <div className="flex h-7 overflow-hidden rounded-chip" role="img" aria-label={blocks.map((b) => `${flow.activity[b.activity]} ${b.count * 5} min`).join(', ')}>
              {blocks.map((b, i) => <span key={i} className={ACTIVITY_TONE[b.activity]} style={{ flexGrow: b.count }} />)}
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-ink-2">
              {(['sleep', 'rest', 'active', 'exercise'] as ActivityState[]).map((a) => (
                <li key={a} className="flex items-center gap-2"><span className={`h-3 w-5 rounded-sm border border-line ${ACTIVITY_TONE[a]}`} />{flow.activity[a]}</li>
              ))}
              <li className="ml-auto tabular">00:00 – {clock(nowTs)}</li>
            </ul>
          </div>

          <details className={`${CARD} !p-4`}>
            <summary className="min-h-12 cursor-pointer text-[18px] font-bold text-brand">{flow.watch.rulesTitle}</summary>
            <ul className="mt-2 list-disc pl-5">{flow.watch.rules.map((r) => <li key={r}>{r}</li>)}</ul>
            <p className="mt-2 text-[15px] text-ink-2">{flow.watch.rulesNote}</p>
          </details>
        </div>

        <aside className="flex flex-col gap-5">
          <div className={`${CARD} flex flex-col gap-3`}>
            <h2 className="text-[20px] font-bold">{flow.watch.cannot}</h2>
            <p className="text-[15px] text-ink-2">{flow.watch.cannotHint}</p>
            <ul className="flex flex-col gap-2">
              {manual.map((m) => {
                const rs = m.ids.map(latest);
                const first = rs[0];
                const status = evals.find((e) => e.indicatorId === m.ids[0])?.status ?? 'stale';
                return (
                  <li key={m.label} className={`${PANEL} ${status === 'stale' ? 'hatch' : ''}`}>
                    <p className="flex items-center justify-between gap-2 font-bold">{m.label}<StatusBadge status={status} size="sm" /></p>
                    <p className="text-[15px] text-ink-2">
                      {first ? <><span className="tabular text-[18px] text-ink">{rs.map((r) => r?.value ?? '–').join('/')}</span> {m.unit} · {fill(flow.check.ageAgo, { age: ago(nowTs - first.ts) })}</> : flow.check.empty}
                    </p>
                  </li>
                );
              })}
            </ul>
            <Link href="/check" className={BTN_PRIMARY}>{flow.watch.startCheck}</Link>
          </div>

          <div className={`${CARD} flex flex-col gap-2`}>
            <h2 className="text-[20px] font-bold">{flow.watch.alertsTitle}</h2>
            {alerts.length === 0 ? <p className="text-ink-2">{flow.watch.noAlerts}</p> : (
              <ul className="flex flex-col gap-2">
                {[...alerts].reverse().map((a) => (
                  <li key={a.id} className={PANEL}>
                    <p className="flex items-center gap-2"><span className="tabular text-ink-2">{clock(a.alert.detectedTs)}</span><StatusBadge status={a.alert.level === 'caution' ? 'yellow' : 'red'} label={flow.level[a.alert.level]} size="sm" /></p>
                    <p className="font-bold">{a.alert.title}</p>
                    {isOpen(a) && a.alert.level !== 'caution' && <Link href="/respond" className="font-bold text-brand underline">{flow.findings.continue}</Link>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </Screen>
  );
}
