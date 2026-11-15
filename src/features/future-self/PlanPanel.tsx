import { ui, useLang } from '../../app/i18n';
import { dec } from '../../app/format';
import type { CountermeasurePlan } from '../../domain/types';

type Key = 'exerciseMinPerDay' | 'waterMlPerDay' | 'sleepHours';

/** Big +/− steppers (gloves): every change moves the arrival body immediately. */
export function PlanPanel({
  plan,
  current,
  onChange,
}: {
  plan: CountermeasurePlan;
  current: Record<Key, number>;
  onChange: (p: CountermeasurePlan) => void;
}) {
  const lang = useLang();
  const rows: { key: Key; label: string; unit: string; step: number; min: number; max: number; fmt: (v: number) => string; note?: string }[] = [
    { key: 'exerciseMinPerDay', label: ui.future.planExercise, unit: 'min', step: 10, min: 0, max: 150, fmt: (v) => `${v}`, note: ui.future.nasaTarget },
    { key: 'waterMlPerDay', label: ui.future.planWater, unit: 'L', step: 250, min: 1000, max: 4000, fmt: (v) => dec((v / 1000).toFixed(2).replace(/0$/, ''), lang) },
    { key: 'sleepHours', label: ui.future.planSleep, unit: 'h', step: 0.5, min: 4, max: 9, fmt: (v) => dec(v.toFixed(1), lang) },
  ];
  return (
    <div className="grid gap-3" role="group" aria-label={ui.future.adjustPlan}>
      {rows.map((r) => {
        const v = plan[r.key] ?? current[r.key];
        const set = (nv: number) => onChange({ [r.key]: Math.min(r.max, Math.max(r.min, Math.round(nv / r.step) * r.step)) });
        return (
          <div key={r.key} className="flex items-center gap-3 rounded-card bg-surface-2 p-3">
            <div className="min-w-0 flex-1">
              <p className="font-bold">{r.label}</p>
              <p className="text-[15px] text-ink-2">
                {ui.future.now} <span className="tabular">{r.fmt(current[r.key])} {r.unit}</span>
                {r.note && (
                  <>
                    {' · '}
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[13px] font-bold text-brand">NASA</span> {r.note}
                  </>
                )}
              </p>
            </div>
            <button type="button" aria-label={lang === 'es' ? `Menos ${r.label.toLowerCase()}` : `Less ${r.label.toLowerCase()}`} onClick={() => set(v - r.step)} className="size-14 rounded-full border-2 border-line bg-surface text-2xl font-bold">
              −
            </button>
            <output className="tabular w-20 text-center text-[22px] font-semibold" aria-live="polite">
              {r.fmt(v)}
              <span className="ml-1 text-[15px] text-ink-2">{r.unit}</span>
            </output>
            <button type="button" aria-label={lang === 'es' ? `Más ${r.label.toLowerCase()}` : `More ${r.label.toLowerCase()}`} onClick={() => set(v + r.step)} className="size-14 rounded-full border-2 border-line bg-surface text-2xl font-bold">
              +
            </button>
          </div>
        );
      })}
    </div>
  );
}
