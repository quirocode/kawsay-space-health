import { useMemo } from 'react';
import ui from '../../../content/ui.json';
import flow from '../../../content/flow.json';
import type { FlightSurgeonBrief } from '../../domain/types';
import { engine } from '../../app/engine';
import { briefInput, useApp } from '../../app/store';
import { clock, fill } from '../../app/format';
import { BTN_PRIMARY, CARD, Screen } from '../../components/ui';
import { StatusBadge } from '../../components/StatusBadge';

/** One screen for the flight surgeon: what changed, what was done, what is being asked. */
export function BriefScreen() {
  const readings = useApp((s) => s.readings);
  const ctx = useApp((s) => s.context);
  const nowTs = useApp((s) => s.nowTs);
  const plan = useApp((s) => s.plan);
  const cases = useApp((s) => s.cases);
  const alerts = useApp((s) => s.alerts);
  const briefs = useApp((s) => s.briefs);
  const queueBrief = useApp((s) => s.queueBrief);

  const input = useMemo(() => briefInput({ cases, briefs, readings, context: ctx, alerts }), [cases, briefs, readings, ctx, alerts]);
  const readiness = useMemo(() => engine.project(readings, ctx, plan), [readings, ctx, plan]);
  const draft = useMemo(() => engine.brief({ ...input, readiness, ctx, nowTs }), [input, readiness, ctx, nowTs]);

  const last = briefs[briefs.length - 1];
  const nothingNew = input.findings.length === 0 && last !== undefined;
  const shown: FlightSurgeonBrief = nothingNew ? last : draft;
  const sent = nothingNew;
  const conjunction = !Number.isFinite(ctx.commDelayMin);
  const delay = Math.round(shown.commDelayMin);
  const handledOnBoard = shown.decisionRequested.startsWith('No decision');

  return (
    <Screen>
      <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
        <article className={`${CARD} flex flex-col gap-4`}>
          <header className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-[22px] font-bold">{fill(flow.brief.heading, { day: shown.missionDay, crew: flow.crew.name })}</h1>
            <p className="tabular text-[15px] text-ink-2">{fill(sent ? flow.brief.sent : flow.brief.draft, { time: clock(shown.generatedTs) })}</p>
          </header>

          <div className="rounded-card bg-brand-bg p-4">
            {shown.arrivesAtTs === null ? (
              <p className="text-[24px] font-bold text-stale">{fill(ui.brief.conjunction, { day: shown.missionDay + 16 })}</p>
            ) : delay < 1 ? (
              <p className="text-[24px] font-bold text-brand-ink">{flow.brief.arrivesSeconds}</p>
            ) : (
              <>
                <p className="text-[24px] font-bold text-brand-ink">{fill(ui.brief.arrives, { min: delay, time: clock(shown.arrivesAtTs) })}</p>
                <p className="text-[15px] text-ink-2">{fill(ui.brief.replyEarliest, { time: clock(shown.arrivesAtTs + delay * 60_000) })}</p>
              </>
            )}
          </div>

          <p className="text-[22px] font-bold leading-snug">{shown.headline}</p>

          <div className="grid gap-5 sm:grid-cols-2">
            <section>
              <h2 className="font-bold text-ink-2">{ui.brief.whatChanged}</h2>
              <ul className="mt-1 list-disc pl-5 text-[18px]">
                {shown.changed.length ? shown.changed.map((c) => <li key={c}>{c}</li>) : <li>{flow.brief.nothingChanged}</li>}
              </ul>
            </section>
            <section>
              <h2 className="font-bold text-ink-2">{ui.brief.whatCrewDid}</h2>
              <ul className="mt-1 list-disc pl-5 text-[18px]">
                {shown.actionsTaken.length ? shown.actionsTaken.map((a) => <li key={a}>{a}</li>) : <li>{flow.brief.nothingDone}</li>}
              </ul>
              <h2 className="mt-3 font-bold text-ink-2">{ui.brief.decision}</h2>
              <p className="text-[18px]">{shown.decisionRequested}</p>
            </section>
          </div>

          <p className="text-ink-2">
            {flow.brief.readiness}{' '}
            <span className="tabular text-[20px] font-bold text-ink">{shown.readiness.score} → {shown.readiness.scoreIfPlanFollowed}</span> {flow.brief.withPlan}
          </p>

          {shown.arrivesAtTs !== null && delay >= 1 && (
            <p className="mt-auto text-[15px] text-ink-2">
              {handledOnBoard
                ? fill(ui.brief.footer, { roundTrip: delay * 2 })
                : fill(flow.brief.footerDecision, { time: clock(shown.arrivesAtTs + delay * 60_000) })}
            </p>
          )}
        </article>

        <aside className="flex flex-col gap-5">
          <div className={`${CARD} flex flex-col gap-3`}>
            <h2 className="text-[20px] font-bold">{sent ? flow.brief.queuedTitle : flow.brief.readyTitle}</h2>
            <p className="text-ink-2">{sent ? fill(flow.brief.queuedText, { time: clock(last.generatedTs) }) : flow.brief.readyText}</p>
            <button type="button" className={BTN_PRIMARY} disabled={sent} onClick={() => queueBrief()}>{ui.brief.queue}</button>
          </div>

          {conjunction && (
            <div className="flex flex-col gap-2 rounded-sheet bg-surface-2 p-6">
              <StatusBadge status="stale" label={flow.brief.noContact} size="sm" />
              <h2 className="text-[20px] font-bold">{flow.brief.conjunctionTitle}</h2>
              <p>{flow.brief.conjunctionText}</p>
            </div>
          )}

          {briefs.length > 0 && (
            <div className={`${CARD} flex flex-col gap-2`}>
              <h2 className="font-bold text-ink-2">{flow.brief.earlier}</h2>
              <ul className="flex flex-col gap-2 text-[15px]">
                {[...briefs].reverse().map((b) => (
                  <li key={b.generatedTs}><span className="tabular text-ink-2">{clock(b.generatedTs)}</span> · {b.headline}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </Screen>
  );
}
