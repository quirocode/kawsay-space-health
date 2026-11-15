import { useId } from 'react';
import { ui, useLang } from '../../app/i18n';
import { fill } from '../../app/format';

/**
 * The woven timeline (signature element, design/PEN_PROMPT.md §4): one thread per mission day.
 * Past threads are as tall as that day's exercise vs the 90 min target, so skipped days show
 * as short, light threads. Future threads are drawn in the "future" colour. A native range
 * input sits on top, so it works with touch, gloves (big thumb) and keyboard.
 */
export function WovenTimeline({
  today,
  arrival,
  value,
  onChange,
  exercise,
  targetMin = 90,
}: {
  today: number;
  arrival: number;
  value: number;
  onChange: (day: number) => void;
  exercise: Map<number, number>;
  targetMin?: number;
}) {
  const id = useId();
  const lang = useLang();
  const W = 1000;
  const H = 64;
  const step = W / (arrival + 1);
  const threads = [];
  for (let d = 1; d <= arrival; d++) {
    const past = d <= today;
    const k = past ? Math.min(1, (exercise.get(d) ?? targetMin / 2) / targetMin) : 1;
    const h = 14 + 40 * k;
    threads.push(
      <rect
        key={d}
        x={d * step}
        y={(H - h) / 2}
        width={Math.max(1.5, step * 0.62)}
        height={h}
        rx={1.5}
        fill={past ? (k < 0.75 ? 'var(--status-watch)' : 'var(--ink-2)') : 'var(--future)'}
        opacity={past ? (k < 0.75 ? 0.9 : 0.35) : d <= value ? 0.75 : 0.22}
      />,
    );
  }
  const dayLabel = (day: number) => fill(ui.future.dayLabel, { day });
  const selectedDay = dayLabel(value);

  return (
    <div className="projection-slider">
      <label className="sr-only" htmlFor={id}>{lang === 'es' ? 'Día a previsualizar' : 'Day to preview'}</label>
      <input id={id} type="range" min={today} max={arrival} step={1} value={value}
        disabled={today === arrival} onChange={(e) => onChange(Number(e.target.value))} aria-valuetext={selectedDay} />
      <div className="projection-slider-labels">
        <span>{ui.future.today} · {dayLabel(today)}</span>
        <output htmlFor={id}>{selectedDay}</output>
        <span>{ui.future.arrival} · {dayLabel(arrival)}</span>
      </div>
      <details>
        <summary>{lang === 'es' ? 'Ver historial de actividad' : 'View activity history'}</summary>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-12 w-full" aria-hidden>
          {threads}
        </svg>
      </details>
    </div>
  );
}
