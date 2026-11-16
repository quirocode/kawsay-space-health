import { useState, type ReactNode } from 'react';
import { ui, useLang } from '../app/i18n';
import { useApp } from '../app/store';
import { explainWithLocalAi, refineWithBrowserLocalAi, speakCopilot, stopCopilotVoice } from '../domain/localAi';
import type { Source } from '../domain/types';

/** Shared building blocks (P2). Colours come from the design tokens, never hard-coded. */
export const BTN_PRIMARY = 'workspace-primary flex min-h-[72px] items-center justify-center rounded-card bg-brand px-6 text-[20px] font-bold text-on-brand disabled:opacity-40';
export const BTN_SECONDARY = 'workspace-secondary flex min-h-[72px] items-center justify-center rounded-card border-2 border-brand-ink px-6 text-[18px] font-bold text-brand-ink disabled:opacity-40';
export const CARD = 'workspace-card rounded-sheet bg-surface p-6 shadow-sm';
export const PANEL = 'rounded-card bg-surface-2 p-4';

/** NASA (official figure) or Prototype (our value). Honest numbers, at a glance. */
export function SourceTag({ official }: { official: boolean }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-chip px-2 py-0.5 text-[15px] font-bold ${official ? 'bg-brand text-on-brand' : 'border border-line text-ink-2'}`}>
      {official ? ui.source.official : ui.source.prototype}
    </span>
  );
}

/**
 * The "Why?" panel: explains the physiological & clinical mechanism using the 100% offline
 * On-Board Local Med-AI engine (tailored to the active astronaut's readings and pre-existing
 * conditions), instead of merely dumping reference URLs.
 */
export function SourceList({ sources, topicHint }: { sources: Source[]; topicHint?: string }) {
  const lang = useLang();
  const es = lang === 'es';
  const crewName = useApp((s) => s.mission.crew);
  const readings = useApp((s) => s.readings);
  const context = useApp((s) => s.context);
  const [speaking, setSpeaking] = useState(false);
  const [localLlmNote, setLocalLlmNote] = useState<string | null>(null);

  const seen = new Set<string>();
  const unique = sources.filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true)));
  const ai = explainWithLocalAi({ sources: unique, crewName, readings, context, lang, topicHint });

  const handleSpeak = () => {
    if (speaking) {
      stopCopilotVoice();
      setSpeaking(false);
      return;
    }
    const text = `${ai.headline}. ${ai.mechanism} ${ai.personalContext} ${ai.hiddenRiskWarning}`;
    const ok = speakCopilot(text, lang);
    setSpeaking(ok);
  };

  const handleRefine = async () => {
    const res = await refineWithBrowserLocalAi(ai, lang);
    setLocalLlmNote(
      res ??
        (es
          ? 'Síntesis local completada por el motor determinista de a bordo (0 ms offline).'
          : 'Local synthesis completed by the on-board deterministic engine (0 ms offline).'),
    );
  };

  return (
    <details className="text-[15px] text-ink-2">
      <summary className="inline-flex min-h-12 cursor-pointer items-center gap-2 font-bold text-brand-ink">
        <span>{ui.why.title}</span>
        <span className="rounded-full border border-brand-ink px-2 py-0.5 text-[12px] font-semibold">
          {es ? 'IA Local · Fisiología' : 'Local AI · Physiology'}
        </span>
      </summary>
      <div className="mt-2 flex flex-col gap-2.5 rounded-card border border-line bg-surface p-3.5 text-ink">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full bg-brand-bg px-2.5 py-0.5 text-[12px] font-bold text-brand-ink">
            {ai.engineBadge}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={handleSpeak}
              className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[12px] font-bold text-brand-ink hover:border-brand-ink"
            >
              {speaking ? (es ? 'Detener voz' : 'Stop voice') : (es ? 'Escuchar explicación' : 'Speak explanation')}
            </button>
            <button
              type="button"
              onClick={() => void handleRefine()}
              className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[12px] font-semibold text-ink-2 hover:text-ink"
            >
              {es ? 'Sintetizar (NPU Local)' : 'Synthesize (Local NPU)'}
            </button>
          </div>
        </div>
        <p className="text-[16px] font-bold text-ink">{ai.headline}</p>
        <p className="text-[15px] leading-relaxed text-ink">{ai.mechanism}</p>
        <p className="rounded-lg bg-surface-2 p-2.5 text-[14px] text-ink-2">{ai.personalContext}</p>
        <p className="rounded-lg border border-watch bg-watch-bg px-3 py-2 text-[14px] font-semibold text-ink">
          {ai.hiddenRiskWarning}
        </p>
        {localLlmNote && <p className="text-[13px] italic text-brand-ink">{localLlmNote}</p>}
        <details className="mt-1 border-t border-line pt-2 text-[13px] text-ink-2">
          <summary className="cursor-pointer font-semibold">
            {es ? 'Ver respaldo normativo y umbrales técnicos' : 'View technical & standard backing'}
          </summary>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {unique.map((s) => (
              <li key={s.url} className="flex items-start gap-2">
                <SourceTag official={s.official} />
                <span>{s.label}</span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </details>
  );
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** Big-key number pad for gloved hands. `extra` is the bottom-left key: '.', '/' (next field) or nothing. */
export function NumberPad({ onKey, extra }: { onKey: (key: string) => void; extra?: '.' | '/' }) {
  const lang = useLang();
  const key = 'flex min-h-[88px] items-center justify-center rounded-card bg-surface-2 text-[30px] tabular active:bg-surface-3';
  return (
    <div className="grid h-full grid-cols-3 gap-3" role="group" aria-label={lang === 'es' ? 'Teclado numérico' : 'Number pad'}>
      {KEYS.map((k) => (
        <button key={k} type="button" className={key} onClick={() => onKey(k)}>{k}</button>
      ))}
      {extra ? (
        <button type="button" className={key} onClick={() => onKey(extra)} aria-label={extra === '/' ? (lang === 'es' ? 'Campo siguiente' : 'Next field') : (lang === 'es' ? 'Punto decimal' : 'Decimal point')}>{extra}</button>
      ) : <span />}
      <button type="button" className={key} onClick={() => onKey('0')}>0</button>
      <button type="button" className={key} onClick={() => onKey('back')} aria-label={lang === 'es' ? 'Borrar' : 'Delete'}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 5h11v14H9l-6-7z" /><path d="m12 9 5 6m0-6-5 6" />
        </svg>
      </button>
    </div>
  );
}

/**
 * A trace as one thread, over a faint band that marks the usual range.
 * Knots mark alerts. Pure SVG, no chart library.
 */
export function Thread({
  values, band, knots = [], min, max, tone = 'ink', height = 56, label,
}: {
  values: number[];
  band?: [number, number];
  knots?: { index: number; size: number }[];
  min: number;
  max: number;
  tone?: 'ink' | 'ok' | 'watch' | 'act' | 'stale';
  height?: number;
  label: string;
}) {
  const W = 300;
  const x = (i: number) => (values.length > 1 ? (i / (values.length - 1)) * W : 0);
  const y = (v: number) => height - 3 - ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * (height - 6);
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const stroke = { ink: 'var(--ink-2)', ok: 'var(--status-ok)', watch: 'var(--status-watch)', act: 'var(--status-act)', stale: 'var(--status-stale)' }[tone];
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" role="img" aria-label={label} className="block w-full" style={{ height }}>
      {band && <rect x="0" width={W} y={y(band[1])} height={Math.max(2, y(band[0]) - y(band[1]))} fill="var(--surface-3)" opacity="0.7" rx="3" />}
      <path d={d} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {knots.map((k) => (
        <circle key={k.index} cx={x(k.index)} cy={y(values[k.index] ?? min)} r={k.size} fill="var(--surface)" stroke={stroke} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

export function Screen({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <section className={`mx-auto flex min-h-full flex-col gap-5 p-5 ${wide ? 'max-w-[1400px]' : 'max-w-[1200px]'}`}>{children}</section>;
}
