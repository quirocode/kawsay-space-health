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
  const x = (d: number) => `${(d / (arrival + 1)) * 100}%`;

  return (
    <div className="relative select-none">
      <div className="mb-1 flex justify-between text-[15px] text-ink-2">
        <span>{lang === 'es' ? 'Lanzamiento' : 'Launch'}</span>
        <span>
          {ui.future.today} · <span className="tabular">{fill(ui.future.dayLabel, { day: today })}</span>
        </span>
        <span>
          {ui.future.arrival} · <span className="tabular">{fill(ui.future.dayLabel, { day: arrival })}</span>
        </span>
      </div>
      <div className="relative h-16">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          {threads}
        </svg>
        <div aria-hidden className="absolute top-0 bottom-0 w-[3px] bg-ink" style={{ left: x(today) }} />
        <label htmlFor={id} className="sr-only">
          {lang === 'es' ? 'Día a previsualizar' : 'Day to preview'}
        </label>
        <input
          id={id}
          type="range"
          min={today}
          max={arrival}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuetext={fill(ui.future.dayLabel, { day: value })}
          className="woven-range absolute inset-y-0 h-full"
          style={{ left: x(today), right: 0, width: 'auto' }}
        />
      </div>
    </div>
  );
}
