import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { flow, useLang } from '../../app/i18n';
import { ago, fill } from '../../app/format';
import { useBand } from '../../app/band/store';
import { BAND_LINK, freshness, type Freshness } from '../../app/band/heartRate';
import { StatusBadge, StatusIcon } from '../../components/StatusBadge';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, PANEL, Screen, Thread } from '../../components/ui';

/** Wall-clock "now", once a second: band readings carry real time, not ship time. */
export function useWallClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function BandGlyph({ size = 88 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M18 4h12l2 10M18 4l-2 10M16 34l2 10h12l2-10" />
      <rect x="13" y="14" width="22" height="20" rx="6" />
      <path d="M18 24h3l2-4 3 8 2-4h3" />
    </svg>
  );
}

function BluetoothIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m7 7 10 10-5 5V2l5 5L7 17" />
    </svg>
  );
}

/** Where the crew member is in the four steps. Text and number, never colour alone. */
function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex flex-wrap gap-2" aria-label={flow.connect.title}>
      {flow.connect.steps.map((label, i) => {
        const state = i < step ? 'done' : i === step ? 'current' : 'next';
        return (
          <li key={label} aria-current={state === 'current' ? 'step' : undefined}
            className={`flex min-h-10 items-center gap-2 rounded-full px-3 text-[15px] ${state === 'current' ? 'bg-brand font-bold text-on-brand' : state === 'done' ? 'bg-surface-2 text-ink' : 'text-ink-2'}`}>
            <span className="tabular">{state === 'done' ? '✓' : i + 1}</span>{label}
          </li>
        );
      })}
    </ol>
  );
}

function Notice({ title, hint, children }: { title: string; hint: string; children?: ReactNode }) {
  return (
    <div className={`${PANEL} hatch flex flex-col gap-3`} role="status">
      <p className="flex items-center gap-2 text-[20px] font-bold text-stale"><StatusIcon status="stale" /><span className="text-ink">{title}</span></p>
      <p className="text-ink-2">{hint}</p>
      {children}
    </div>
  );
}

/** Live link chip: icon + word. Connection state is not a health status. */
function LinkChip({ fresh, nowTs, lastTs }: { fresh: Freshness; nowTs: number; lastTs: number | null }) {
  if (fresh === 'live') {
    return (
      <span className="inline-flex items-center gap-2 self-start rounded-full bg-brand-bg px-3 py-1 font-bold text-brand-ink">
        <span className="relative flex h-3 w-3" aria-hidden>
          <span className="absolute inline-flex h-full w-full rounded-full bg-brand-ink opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-ink" />
        </span>
        {flow.connect.live}
      </span>
    );
  }
  if (fresh === 'waiting') return <span className="inline-flex items-center gap-2 self-start rounded-full bg-surface-2 px-3 py-1 font-bold"><BluetoothIcon />{flow.connect.waiting}</span>;
  return <StatusBadge status="stale" label={fill(flow.connect.stale, { age: ago(nowTs - (lastTs ?? nowTs)) })} />;
}

function LivePanel() {
  const nowTs = useWallClock();
  const lang = useLang();
  const { deviceName, battery, connectedTs, lastTs, samples, phase, attempt } = useBand();
  const disconnect = useBand((s) => s.disconnect);
  const fresh = freshness(lastTs, nowTs);
  const latest = samples[samples.length - 1];
  const showNumber = latest && (fresh === 'live' || fresh === 'stale');

  return (
    <div className={`${CARD} flex flex-col gap-5`}>
      <div className="flex flex-wrap items-center gap-3">
        <BluetoothIcon />
        <h2 className="text-[22px] font-bold">{deviceName}</h2>
        <span className="text-ink-2">{battery === null ? flow.connect.batteryUnknown : fill(flow.connect.battery, { pct: battery })}</span>
        {connectedTs && <span className="text-ink-2">{fill(flow.connect.connectedFor, { age: ago(nowTs - connectedTs, lang) })}</span>}
      </div>

      {phase === 'reconnecting' && (
        <p role="status" className="font-bold">{fill(flow.connect.reconnecting, { n: attempt, max: BAND_LINK.reconnectAttempts })}</p>
      )}

      <div className={`flex flex-col gap-3 ${fresh === 'stale' || fresh === 'lost' ? 'hatch rounded-card p-3' : ''}`}>
        <LinkChip fresh={fresh} nowTs={nowTs} lastTs={lastTs} />
        <p className="flex items-baseline gap-3" aria-live="polite">
          <span className={`tabular text-[96px] font-bold leading-none ${showNumber && fresh === 'live' ? '' : 'text-ink-2'}`} data-testid="band-bpm">
            {showNumber ? latest.bpm : '–'}
          </span>
          <span className="text-[22px] text-ink-2">{flow.watch.units.heartRate}</span>
        </p>
        {fresh === 'waiting' && <p className="text-ink-2">{flow.connect.waitingHint}</p>}
        {fresh === 'stale' && <p className="text-ink-2">{flow.connect.staleHint}</p>}
      </div>

      {samples.length > 1 && (
        <div className="flex flex-col gap-1">
          <h3 className="font-bold">{flow.connect.lastTwoMin}</h3>
          <Thread values={samples.map((s) => s.bpm)} min={40} max={180} tone={fresh === 'live' ? 'ink' : 'stale'} height={80} label={flow.connect.lastTwoMin} />
        </div>
      )}

      <p className="text-[15px] text-ink-2">{flow.connect.onlyHr}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/watch" className={BTN_PRIMARY}>{flow.connect.openWatch}</Link>
        <button type="button" className={BTN_SECONDARY} onClick={disconnect}>{flow.connect.disconnect}</button>
      </div>
    </div>
  );
}

/**
 * Step before the Watch: pair a heart-rate band. Four steps, modelled on how phone
 * fitness apps add a device: start → get ready → choose from the system list → live.
 */
export function ConnectScreen() {
  const { support, phase, problem } = useBand();
  const { checkSupport, prepare, back, connect, retry } = useBand.getState();

  useEffect(() => {
    void checkSupport();
  }, [checkSupport]);

  const step = phase === 'idle' ? 0 : phase === 'ready' ? 1 : phase === 'connecting' ? 2 : phase === 'failed' ? 2 : 3;

  let body: ReactNode;
  if (phase === 'connected' || phase === 'reconnecting') {
    body = <LivePanel />;
  } else if (phase === 'connecting') {
    body = (
      <div className={`${CARD} flex flex-col items-center gap-4 py-12 text-center`} role="status">
        <span className="text-brand-ink motion-safe:animate-pulse"><BandGlyph /></span>
        <p className="text-[24px] font-bold">{flow.connect.connecting}</p>
        <p className="text-ink-2">{flow.connect.connectingHint}</p>
      </div>
    );
  } else if (phase === 'failed' && problem) {
    const p = flow.connect.problems[problem];
    body = (
      <div className={`${CARD} flex flex-col gap-4`}>
        <Notice title={p.title} hint={p.hint} />
        <div className="grid gap-3 sm:grid-cols-3">
          <button type="button" className={BTN_PRIMARY} onClick={() => void retry()}>{flow.connect.tryAgain}</button>
          <button type="button" className={BTN_SECONDARY} onClick={() => void connect()}>{flow.connect.chooseAnother}</button>
          <Link href="/watch" className={BTN_SECONDARY}>{flow.connect.demo}</Link>
        </div>
      </div>
    );
  } else if (phase === 'ready') {
    body = (
      <div className={`${CARD} flex flex-col gap-4`}>
        <h2 className="text-[24px] font-bold">{flow.connect.readyTitle}</h2>
        <ol className="flex flex-col gap-2">
          {flow.connect.readyList.map((item, i) => (
            <li key={item} className={`${PANEL} flex gap-3`}>
              <span className="tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand font-bold text-on-brand">{i + 1}</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
        {problem === 'cancelled' && <p role="status" className="font-bold">{flow.connect.problems.cancelled.title}. {flow.connect.problems.cancelled.hint}</p>}
        <p className="text-ink-2">{flow.connect.readyNote}</p>
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <button type="button" className={BTN_PRIMARY} onClick={() => void connect()}>{flow.connect.openList}</button>
          <button type="button" className={BTN_SECONDARY} onClick={back}>{flow.connect.back}</button>
        </div>
      </div>
    );
  } else {
    const blocked = support !== 'ok' && support !== 'checking' ? flow.connect.unsupported[support] : null;
    body = (
      <div className={`${CARD} flex flex-col items-center gap-4 py-10 text-center`}>
        <span className="text-ink-2"><BandGlyph /></span>
        <p className="text-[24px] font-bold">{flow.connect.none}</p>
        <p className="max-w-[46ch] text-ink-2">{flow.connect.noneHint}</p>
        {blocked && <div className="w-full max-w-[560px] text-left"><Notice title={blocked.title} hint={blocked.hint} /></div>}
        <div className="grid w-full max-w-[560px] gap-3">
          <button type="button" className={BTN_PRIMARY} disabled={support !== 'ok'} onClick={prepare}>
            {support === 'checking' ? flow.connect.checking : flow.connect.connect}
          </button>
          <Link href="/watch" className={BTN_SECONDARY}>{flow.connect.demo}</Link>
        </div>
      </div>
    );
  }

  return (
    <Screen>
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
        <header className="flex flex-col gap-2">
          <h1 className="text-[28px] font-bold">{flow.connect.title}</h1>
          <p className="text-ink-2">{flow.connect.intro}</p>
          <Stepper step={step} />
        </header>
        {body}
        <p className="text-[15px] text-ink-2">{flow.connect.prototype}</p>
      </div>
    </Screen>
  );
}
