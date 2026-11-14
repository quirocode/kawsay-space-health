import { useMemo } from 'react';
import { Link } from 'wouter';
import copy from '../../../content/orbit.json';
import ui from '../../../content/ui.json';
import type { MissionContext, Status } from '../../domain/types';
import { fill } from '../../features/future-self/zones';
import { engine } from '../engine';
import { ENV_LABEL } from '../format';
import { useApp } from '../store';
import { Icon, type IconName } from './icons';
import { buildOrbit, type Chip, type OrbitModel, type RightNow, type Station, type StationId } from './orbit';

/**
 * Services Orbit (P1) — the hub: the Earth-independent loop as six stations around Future Self.
 * Design: "S8 v2 · Services Orbit" (1280 × 800, night). Every value comes from buildOrbit().
 */

const TONE: Record<Status, { text: string; color: string; icon: IconName }> = {
  green: { text: 'text-ok', color: 'var(--status-ok)', icon: 'circle-check' },
  yellow: { text: 'text-watch', color: 'var(--status-watch)', icon: 'triangle-alert' },
  red: { text: 'text-act', color: 'var(--status-act)', icon: 'octagon-alert' },
  stale: { text: 'text-stale', color: 'var(--status-stale)', icon: 'hourglass' },
};

/** Medallion symbol per service. `photo` is an optional bundled image that replaces the glyph. */
const SYMBOL: Record<StationId | 'core', { icon: IconName; photo?: string }> = {
  measure: { icon: 'heart-pulse' },
  understand: { icon: 'person' },
  act: { icon: 'dumbbell' },
  verify: { icon: 'target' },
  escalate: { icon: 'send' },
  environment: { icon: 'globe' },
  core: { icon: 'user' },
};

// Stage geometry, in the design's 700 × 583 space. Stations sit on the main ring, 60° apart.
const STAGE = { w: 700, h: 583, cx: 350, cy: 262, rx: 280, ry: 186 };
const ANGLE: Record<StationId, number> = { measure: -90, understand: -30, act: 30, verify: 90, escalate: 150, environment: 210 };
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/** Deterministic starfield (seeded LCG — no Math.random, same sky on every render). */
const STARS = (() => {
  let s = 142;
  const next = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  return Array.from({ length: 80 }, () => ({ x: next() * 100, y: next() * 100, big: next() > 0.85 }));
})();

function Medallion({ size, inset, progress, status, symbol }: { size: number; inset: number; progress: number; status: Status; symbol: { icon: IconName; photo?: string } }) {
  const t = size * 0.06;
  const r = (size - t) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative block" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={t} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TONE[status].color} strokeWidth={t} strokeDasharray={`${c * Math.max(0, Math.min(1, progress))} ${c}`} />
      </svg>
      <span
        className="absolute grid place-items-center overflow-hidden rounded-full border-2 border-bg bg-surface-2 text-ink"
        style={{ inset, backgroundImage: 'radial-gradient(circle at 30% 25%, color-mix(in srgb, var(--brand) 28%, transparent), transparent 70%)' }}
      >
        {symbol.photo ? <img src={symbol.photo} alt="" className="h-full w-full object-cover" /> : <Icon name={symbol.icon} size={Math.round(size * 0.36)} />}
      </span>
    </span>
  );
}

function StationNode({ s, active }: { s: Station; active: boolean }) {
  const tone = TONE[s.status];
  const size = active ? 84 : 72;
  const a = (ANGLE[s.id] * Math.PI) / 180;
  const left = pct(STAGE.cx + STAGE.rx * Math.cos(a), STAGE.w);
  const top = pct(STAGE.cy + STAGE.ry * Math.sin(a), STAGE.h);
  return (
    <li className="absolute w-[150px]" style={{ left, top, transform: `translate(-50%, -${size / 2}px)` }}>
      <Link
        href={s.href}
        aria-current={active ? 'step' : undefined}
        aria-label={`${s.step}. ${s.stage}: ${s.name}. ${copy.status[s.status]}. ${s.datum}`}
        className="group flex flex-col items-center gap-1.5 rounded-card text-center"
      >
        <span className="relative block transition-transform duration-200 group-hover:scale-105" style={{ width: size, height: size }}>
          {active && (
            <>
              <span className="orbit-pulse absolute rounded-full border" style={{ inset: -22, borderColor: `color-mix(in srgb, ${tone.color} 15%, transparent)` }} />
              <span className="orbit-pulse absolute rounded-full border-[1.5px]" style={{ inset: -11, borderColor: `color-mix(in srgb, ${tone.color} 33%, transparent)`, animationDelay: '-1.2s' }} />
              <span className="absolute rounded-full blur-[18px]" style={{ inset: -6, background: `color-mix(in srgb, ${tone.color} 25%, transparent)` }} />
            </>
          )}
          <Medallion size={size} inset={active ? 8 : 6} progress={s.progress} status={s.status} symbol={SYMBOL[s.id]} />
          <span className="absolute -left-1 -top-1 grid h-[22px] w-[22px] place-items-center rounded-full border border-line bg-bg font-mono text-[11px] font-bold leading-none text-ink">
            {s.step}
          </span>
        </span>
        <span className="font-mono text-[10px] uppercase leading-[13px] tracking-[1.5px] text-ink-2">{s.stage}</span>
        <span className="text-[15px] font-bold leading-[18px] text-ink">{s.name}</span>
        <span className="flex items-center justify-center gap-[5px] whitespace-nowrap text-[12px] leading-[15px]">
          <Icon name={tone.icon} size={13} className={tone.text} />
          <span className={`font-semibold ${tone.text}`}>{copy.status[s.status]}</span>
          <span className="text-ink-2" aria-hidden>·</span>
          <span className="text-ink-2">{s.datum}</span>
        </span>
      </Link>
    </li>
  );
}

function OrbitStage({ m, day }: { m: OrbitModel; day: number }) {
  const tone = TONE[m.core.status];
  return (
    <nav
      aria-label={copy.title}
      className="relative aspect-[700/583] min-h-[540px] w-full overflow-hidden rounded-card border border-line bg-surface lg:aspect-auto"
      style={{ backgroundImage: 'radial-gradient(45% 45% at 50% 48%, color-mix(in srgb, var(--brand) 18%, transparent), transparent)' }}
    >
      <div aria-hidden className="absolute inset-0">
        {STARS.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.big ? 3 : 1.5, height: s.big ? 3 : 1.5, background: `color-mix(in srgb, var(--ink) ${s.big ? 53 : 33}%, transparent)` }}
          />
        ))}
        {/* Mars horizon */}
        <span
          className="absolute rounded-[50%]"
          style={{ left: pct(-260, STAGE.w), top: pct(500, STAGE.h), width: pct(1220, STAGE.w), height: pct(420, STAGE.h), background: 'linear-gradient(to bottom, color-mix(in srgb, var(--brand) 32%, transparent), transparent 40%)' }}
        />
        <svg viewBox={`0 0 ${STAGE.w} ${STAGE.h}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" fill="none">
          <ellipse cx={STAGE.cx} cy={STAGE.cy} rx={314} ry={210} stroke="color-mix(in srgb, var(--ink) 8%, transparent)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <ellipse cx={STAGE.cx} cy={STAGE.cy} rx={STAGE.rx} ry={STAGE.ry} stroke="color-mix(in srgb, var(--brand) 35%, transparent)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          <ellipse cx={STAGE.cx} cy={STAGE.cy} rx={210} ry={136} stroke="color-mix(in srgb, var(--ink) 6%, transparent)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      <p className="absolute left-5 top-[18px] flex items-center gap-2 font-mono text-[11px] uppercase leading-[15px] tracking-[1.5px] text-ink-2">
        <Icon name="refresh" size={14} />
        {fill(copy.loopLabel, { day })}
      </p>

      <ol className="contents">
        {m.stations.map((s) => (
          <StationNode key={s.id} s={s} active={m.active === s.id} />
        ))}
      </ol>

      <Link
        href="/"
        aria-label={`${copy.core.open}. ${ui.future.readiness} ${m.core.score} ${copy.core.of}. ${copy.status[m.core.status]}`}
        className="group absolute flex w-[240px] flex-col items-center gap-2 rounded-card text-center"
        style={{ left: '50%', top: pct(STAGE.cy, STAGE.h), transform: 'translate(-50%, -70px)' }}
      >
        <span className="relative block h-[136px] w-[136px] transition-transform duration-200 group-hover:scale-[1.03]">
          <span className="absolute -inset-5 rounded-full blur-[30px]" style={{ background: 'color-mix(in srgb, var(--brand) 20%, transparent)' }} />
          <Medallion size={136} inset={12} progress={m.core.score / 100} status={m.core.status} symbol={SYMBOL.core} />
        </span>
        <span className="font-mono text-[10px] uppercase leading-[13px] tracking-[1.5px] text-ink-2">{copy.core.overline}</span>
        <span className="flex items-end gap-1.5">
          <span className={`text-[34px] font-bold leading-none ${tone.text}`} data-testid="orbit-score">{m.core.score}</span>
          <span className="flex items-center gap-1 text-[13px] leading-4 text-ink-2">
            {copy.core.of} ·
            <Icon name={tone.icon} size={13} className={tone.text} />
            {copy.status[m.core.status]}
          </span>
        </span>
      </Link>
    </nav>
  );
}

const CHIP: Record<Chip['kind'], { icon: IconName; cls: string }> = {
  gain: { icon: 'trending-up', cls: 'bg-ok-bg font-semibold text-ok' },
  time: { icon: 'timer', cls: 'bg-surface-3 font-semibold text-ink' },
  prototype: { icon: 'flask', cls: 'border border-line text-ink-2' },
  official: { icon: 'circle-check', cls: 'border border-line text-ink-2' },
};

function RightNowCard({ r }: { r: RightNow }) {
  const tone = TONE[r.status];
  return (
    <section
      aria-labelledby="orbit-now-title"
      className="flex flex-1 flex-col justify-between gap-3.5 rounded-card border bg-surface p-6"
      style={{
        borderColor: `color-mix(in srgb, ${tone.color} 50%, transparent)`,
        backgroundImage: `radial-gradient(80% 80% at 100% 0%, color-mix(in srgb, ${tone.color} 18%, transparent), transparent)`,
      }}
    >
      <div className="flex items-center gap-2">
        <Icon name="zap" size={16} className={tone.text} />
        <span className={`font-mono text-[12px] font-bold uppercase tracking-[2px] ${tone.text}`}>{copy.rightNow.kicker}</span>
        <span className="ml-auto font-mono text-[11px] uppercase tracking-[1.5px] text-ink-2">{r.stepLabel}</span>
      </div>
      <h1 id="orbit-now-title" className="text-[24px] font-bold leading-[1.2] text-ink">{r.title}</h1>
      <p className="text-[14px] leading-[1.45] text-ink-2">{r.why}</p>
      {r.chips.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2">
          {r.chips.map((c) => (
            <li key={c.label} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px] leading-4 ${CHIP[c.kind].cls}`}>
              <Icon name={CHIP[c.kind].icon} size={14} />
              {c.label}
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2.5">
        <Link href={r.cta.href} className="flex h-[52px] flex-1 items-center justify-center gap-3 rounded-card bg-brand px-7 text-[18px] font-semibold text-on-brand">
          <Icon name="play" size={22} />
          {r.cta.label}
        </Link>
        <Link href={r.whyHref} className="flex h-[52px] items-center justify-center gap-3 rounded-card border border-line bg-surface-2 px-7 text-[18px] font-semibold text-ink">
          <Icon name="help" size={22} />
          {copy.rightNow.why}
        </Link>
      </div>
    </section>
  );
}

function Stat({ icon, value, label, brand }: { icon: IconName; value: string; label: string; brand?: boolean }) {
  return (
    <li className="flex flex-1 flex-col gap-1.5 rounded-card border border-line bg-surface p-4">
      <Icon name={icon} size={18} className={brand ? 'text-brand' : 'text-ink'} />
      <span className="text-[22px] font-bold leading-[27px] text-ink">{value}</span>
      <span className="text-[12px] leading-[15px] text-ink-2">{label}</span>
    </li>
  );
}

function LoopToday({ m }: { m: OrbitModel }) {
  const tone = TONE[m.rightNow.status];
  return (
    <section aria-labelledby="orbit-loop-title" className="flex flex-col gap-3.5 rounded-card border border-line bg-surface px-5 py-[18px]">
      <div className="flex items-center">
        <h2 id="orbit-loop-title" className="text-[15px] font-bold leading-[18px] text-ink">{copy.loop.title}</h2>
        <span className="ml-auto font-mono text-[11px] text-ink-2">{fill(copy.loop.progress, { done: m.loop.done, total: m.loop.steps.length })}</span>
      </div>
      <ol className="flex">
        {m.loop.steps.map((s, i) => (
          <li key={s.id} className={`flex ${i < m.loop.steps.length - 1 ? 'flex-1' : ''}`}>
            <span className="flex flex-col items-center gap-2">
              <span
                className={`grid h-[22px] w-[22px] place-items-center rounded-full text-bg ${s.state === 'done' ? 'border border-line bg-ok' : s.state === 'todo' ? 'border border-line bg-surface-3' : ''}`}
                style={s.state === 'current' ? { background: tone.color, boxShadow: `0 0 0 4px color-mix(in srgb, ${tone.color} 33%, transparent)` } : undefined}
              >
                {s.state === 'done' && <Icon name="check" size={12} />}
                {s.state === 'current' && <Icon name="zap" size={12} />}
              </span>
              <span className={`text-[12px] leading-[15px] ${s.state === 'current' ? 'font-bold text-ink' : s.state === 'done' ? 'font-medium text-ink' : 'font-medium text-ink-2'}`}>
                {s.label}
                <span className="sr-only"> ({copy.loop[s.state]})</span>
              </span>
            </span>
            {i < m.loop.steps.length - 1 && <span aria-hidden className={`mx-1 mt-2.5 h-0.5 min-w-3 flex-1 rounded-[1px] ${s.state === 'done' ? 'bg-ok' : 'bg-line'}`} />}
          </li>
        ))}
      </ol>
    </section>
  );
}

const BAND_STEPS = 36;
const BAND_HEIGHTS = [4, 6, 8, 6];

function MissionBand({ ctx }: { ctx: MissionContext }) {
  const left = Math.max(0, ctx.arrivalDay - ctx.missionDay);
  const now = Math.min(BAND_STEPS - 1, Math.floor((ctx.missionDay / ctx.arrivalDay) * BAND_STEPS));
  const day = fill(copy.band.day, { day: ctx.missionDay, arrival: ctx.arrivalDay });
  const remaining = fill(copy.band.remaining, { n: left });
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2.5">
      <div className="flex items-end justify-between">
        <span className="text-[15px] font-semibold leading-[18px] text-brand">{day}</span>
        <span className="text-[13px] leading-4 text-ink-2">{remaining}</span>
      </div>
      <div className="flex h-3 items-center gap-1" role="img" aria-label={`${day}. ${remaining}.`}>
        {Array.from({ length: BAND_STEPS }, (_, i) => (
          <span
            key={i}
            className={`flex-1 rounded-[1px] ${i > now ? 'bg-surface-3' : 'bg-brand'} ${i < now ? 'opacity-35' : ''}`}
            style={{ height: i === now ? 12 : BAND_HEIGHTS[i % 4] }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[12px] leading-[15px] text-ink-2">
        <span>{copy.band.launch}</span>
        <span>{fill(copy.band.landing, { arrival: ctx.arrivalDay })}</span>
      </div>
    </div>
  );
}

export function OrbitScreen() {
  const readings = useApp((s) => s.readings);
  const ctx = useApp((s) => s.context);
  const nowTs = useApp((s) => s.nowTs);
  const plan = useApp((s) => s.plan);
  const planAccepted = useApp((s) => s.planAccepted);
  const pending = useApp((s) => s.pending);
  const verifications = useApp((s) => s.verifications);
  const briefQueuedTs = useApp((s) => s.briefQueuedTs);
  const palette = useApp((s) => s.palette);

  const m = useMemo(
    () => buildOrbit({ readings, ctx, nowTs, plan, planAccepted, pending, verifications, briefQueuedTs }, engine),
    [readings, ctx, nowTs, plan, planAccepted, pending, verifications, briefQueuedTs],
  );

  const delay = ctx.commDelayMin;
  const linked = Number.isFinite(delay);
  const delayValue = !linked ? copy.stats.delayNone : delay < 1 ? copy.stats.delaySeconds : fill(copy.stats.delayValue, { n: Math.round(delay) });
  const linkLine = !linked ? copy.bottom.linkNone : delay < 1 ? copy.bottom.linkSeconds : fill(copy.bottom.link, { n: Math.round(delay) });

  return (
    // The orbit is a space scene: always drawn in the night theme, with the palette the crew member picked.
    <div data-theme="night" data-palette={palette} className="flex min-h-full flex-col bg-bg text-ink">
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col">
        <header className="flex items-center gap-6 px-4 py-4 sm:gap-12 sm:px-10">
          <div className="flex flex-col gap-0.5">
            <span className="text-[20px] font-bold leading-6 tracking-[3px] text-ink">{ui.app.name}</span>
            <span className="whitespace-nowrap text-[13px] leading-4 text-ink-2">{fill(copy.wordmarkSub, { day: ctx.missionDay, env: ENV_LABEL[ctx.environment] })}</span>
          </div>
          <MissionBand ctx={ctx} />
        </header>

        <main className="grid flex-1 gap-6 px-4 pt-2 sm:px-10 lg:min-h-0 lg:grid-cols-[minmax(0,700fr)_minmax(0,476fr)]">
          <OrbitStage m={m} day={ctx.missionDay} />
          <div className="flex flex-col gap-4">
            <RightNowCard r={m.rightNow} />
            <ul className="flex gap-3">
              <Stat icon="flame" brand value={String(m.stats.streak)} label={copy.stats.streak} />
              <Stat icon="satellite-dish" value={delayValue} label={copy.stats.delay} />
              <Stat icon="plane-landing" value={fill(copy.stats.landingValue, { n: m.stats.solsToLanding })} label={copy.stats.landing} />
            </ul>
            <LoopToday m={m} />
          </div>
        </main>

        <footer className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 pb-7 pt-5 sm:px-10">
          <Link href="/check" className="flex h-16 items-center justify-center gap-3 rounded-card bg-brand px-7 text-[18px] font-semibold text-on-brand">
            <Icon name="clipboard-check" size={22} />
            {copy.bottom.cta}
          </Link>
          <span className="flex items-center gap-2 px-3.5 py-2.5 text-[14px] leading-[17px] text-ink-2">
            <Icon name="satellite-dish" size={18} />
            {linkLine}
          </span>
          <span className="ml-auto text-[13px] leading-4 text-ink-2">{copy.bottom.disclaimer}</span>
        </footer>
      </div>
    </div>
  );
}
