/**
 * Closing the loop (P3-06): Act → Verify → Escalate. After an action, a new measurement says
 * whether it worked; if needed, a one-screen brief goes to the flight surgeon, aware of the
 * communication delay. Pure: time always comes in as nowTs.
 */
import { INDICATORS } from './indicators';
import { fmt } from './evaluate';
import type { Environment, Finding, FlightSurgeonBrief, LandingReadiness, MissionContext, Reading, VerificationResult } from './types';

/** Which direction is "better" for each indicator. */
export const BETTER: Record<string, 'lower' | 'higher' | 'in_range'> = {
  headache_score: 'lower', cabin_co2: 'lower', symptom_dizziness: 'lower', symptom_vision: 'lower',
  symptom_confusion: 'lower', symptom_joint_pain: 'lower', symptom_skin: 'lower',
  bp_systolic: 'lower', bp_diastolic: 'lower', heart_rate: 'lower', body_temp: 'lower',
  spo2: 'higher', mood: 'higher', sleep_hours: 'higher', water_ml: 'higher', exercise_min: 'higher', strength_self_pct: 'higher',
  glucose: 'in_range',
};

/**
 * Typical one-way delay per environment, in minutes. Mars values sit inside NASA's
 * "up to 20 min one way"; ISS, Orion and Moon delays are seconds, shown as 0.
 */
export const DELAY_MIN: Record<Environment, number> = { iss: 0, orion: 0, moon: 0, mars_transit: 14, mars_surface: 20 };

/**
 * Smallest change that counts, where 10 % of the value would be too coarse to notice a real
 * change (oxygen near 100 %, temperature near 37 °C). Prototype values.
 */
export const MIN_CHANGE: Record<string, number> = { spo2: 2, body_temp: 0.5 };

const byId = new Map(INDICATORS.map((d) => [d.id, d]));

export function verify(before: Reading, after: Reading): VerificationResult {
  if (before.indicatorId !== after.indicatorId) throw new Error('verify: indicator mismatch');
  const def = byId.get(before.indicatorId);
  const delta = after.value - before.value;
  const meaningful = def?.input === 'boolean' ? delta !== 0 : Math.abs(delta) >= (MIN_CHANGE[before.indicatorId] ?? Math.max(1, Math.abs(before.value) * 0.1));
  const rule = BETTER[before.indicatorId] ?? 'lower';
  const lowerIsBetter = rule === 'in_range' ? before.value > 100 : rule === 'lower';
  const outcome: VerificationResult['outcome'] = !meaningful ? 'unchanged' : delta < 0 === lowerIsBetter ? 'improved' : 'worse';
  const name = def?.name ?? before.indicatorId;
  const unit = def && def.input === 'number' ? ` ${def.unit}` : '';
  const reason =
    outcome === 'improved' ? `${name} went from ${fmt(before.value)} to ${fmt(after.value)}${unit} — improved.`
    : outcome === 'worse' ? `${name} went from ${fmt(before.value)} to ${fmt(after.value)}${unit} — worse, we'll tell Earth.`
    : `${name} stayed at ${fmt(after.value)}${unit} — no better, we'll tell Earth.`;
  return { indicatorId: before.indicatorId, before: before.value, after: after.value, outcome, escalate: outcome !== 'improved', reason };
}

export function brief(input: {
  findings: Finding[];
  verifications: VerificationResult[];
  readiness: LandingReadiness;
  ctx: MissionContext;
  nowTs: number;
}): FlightSurgeonBrief {
  const { findings, verifications, readiness, ctx, nowTs } = input;
  const ordered = [...findings.filter((f) => f.status === 'red'), ...findings.filter((f) => f.status !== 'red')];
  const top = ordered[0];
  const verificationOf = (f: Finding) => {
    const ids = new Set(f.actions.map((a) => a.recheckIndicatorId));
    for (let i = verifications.length - 1; i >= 0; i--) if (ids.has(verifications[i].indicatorId)) return verifications[i];
    return undefined;
  };
  const topV = top ? verificationOf(top) : undefined;
  const headline = !top ? 'No new findings. Routine brief.'
    : `${top.title}${topV ? (topV.outcome === 'improved' ? '; improved after action.' : '; not improved after action.') : '.'}`;
  const needsDecision = verifications.some((v) => v.escalate) || ordered.some((f) => f.status === 'red');
  const escalated = ordered.filter((f) => f.actions.some((a) => a.escalate) || verificationOf(f)?.escalate);
  return {
    generatedTs: nowTs,
    missionDay: ctx.missionDay,
    environment: ctx.environment,
    commDelayMin: ctx.commDelayMin,
    arrivesAtTs: Number.isFinite(ctx.commDelayMin) ? nowTs + ctx.commDelayMin * 60_000 : null,
    headline,
    changed: ordered.flatMap((f) => f.because).slice(0, 5),
    actionsTaken: verifications.map((v) => {
      const f = ordered.find((x) => x.actions.some((a) => a.recheckIndicatorId === v.indicatorId));
      return `${f?.actions[0].text ?? 'Action taken'} → ${v.outcome}`;
    }),
    decisionRequested: needsDecision ? `Please review: ${top?.title ?? 'latest readings'}. Advise on next step.` : 'No decision needed. For your awareness.',
    findings: escalated.length ? escalated : ordered,
    readiness: { score: readiness.score, scoreIfPlanFollowed: readiness.scoreIfPlanFollowed },
  };
}
