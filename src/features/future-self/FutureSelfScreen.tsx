import { useMemo } from 'react';
import { Link } from 'wouter';
import ui from '../../../content/ui.json';
import { engine } from '../../app/engine';
import { useApp } from '../../app/store';
import { StatusBadge } from '../../components/StatusBadge';

/**
 * Future Self (P1). Phase 0 version: readiness + landing tasks wired to the engine.
 * Phase 3 adds the double body, the time slider and the live plan.
 */
export function FutureSelfScreen() {
  const readings = useApp((s) => s.readings);
  const ctx = useApp((s) => s.context);
  const plan = useApp((s) => s.plan);

  const readiness = useMemo(() => engine.project(readings, ctx, plan), [readings, ctx, plan]);

  return (
    <section className="mx-auto grid max-w-6xl gap-6 p-6 md:grid-cols-[1fr_1.2fr]">
      <div className="rounded-card bg-surface p-6 shadow-sm">
        <h1 className="text-[26px] font-bold">{ui.home.readiness}</h1>
        <p className="mt-2 flex items-baseline gap-3">
          <span className="tabular text-[56px] font-semibold leading-none" data-testid="readiness-score">{readiness.score}</span>
          <span className="text-xl text-future">
            → <span className="tabular font-semibold">{readiness.scoreIfPlanFollowed}</span> {ui.home.withPlan}
          </span>
        </p>
        <Link href="/check" className="mt-6 flex min-h-[72px] items-center justify-center rounded-card bg-brand px-6 text-xl font-bold text-on-brand">
          {ui.home.startCheck}
        </Link>
      </div>

      <ul className="grid gap-3" aria-label="Landing day tasks">
        {readiness.tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-4 rounded-card bg-surface p-4 shadow-sm">
            <div className="flex-1">
              <p className="text-[20px] font-bold">{t.label}</p>
              <p className="text-[15px] text-ink-2">{t.why}</p>
            </div>
            <StatusBadge status={t.status} />
            <span aria-hidden className="text-ink-2">→</span>
            <StatusBadge status={t.statusIfPlan} size="sm" />
          </li>
        ))}
      </ul>
    </section>
  );
}
