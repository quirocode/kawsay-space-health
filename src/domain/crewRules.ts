/**
 * Crew-level rules (added 15 Nov). Four people breathe the same air and share the same
 * shelter: some problems only show when you look at everyone at once. Pure and deterministic.
 * Every cut-off here is a PROTOTYPE value.
 */
import { SRC } from './indicators';
import { latest } from './rules';
import type { Finding, MissionContext, Reading } from './types';

const P = SRC.prototype;

export interface CrewFinding extends Finding {
  /** Crew member ids this finding is about. */
  crew: string[];
}

function today(readings: Reading[], id: string, ctx: MissionContext): number | undefined {
  return latest(readings.filter((r) => r.missionDay === ctx.missionDay), id)?.value;
}

/** `byCrew`: crew member id → that person's readings. `names`: id → display name. */
export function crewFindings(byCrew: Record<string, Reading[]>, names: Record<string, string>, ctx: MissionContext): CrewFinding[] {
  const ids = Object.keys(byCrew);
  const out: CrewFinding[] = [];
  const list = (crew: string[]) => crew.map((id) => names[id] ?? id).join(', ');

  const headaches = ids.filter((id) => (today(byCrew[id], 'headache_score', ctx) ?? 1) >= 3);
  if (headaches.length >= 2) {
    out.push({
      ruleId: 'crew_shared_headache', title: 'Several crew members with headache: check the cabin air', status: headaches.length >= 3 ? 'red' : 'yellow',
      because: [`Headache today: ${list(headaches)}.`, 'When several people feel it at once, the cause is usually shared (CO₂, ventilation, a leak), not personal.'],
      risks: ['hypoxia'], hazards: ['environment'], zones: ['brain', 'lungs'],
      actions: [{ id: 'crew_shared_headache.primary', text: 'Check the CO₂ scrubber and fans, and the air near the sleeping quarters.', recheckIndicatorId: 'cabin_co2', recheckInMin: 30, escalate: headaches.length >= 3 }],
      sources: [SRC.co2, SRC.environment, P], crew: headaches,
    });
  }

  const fever = ids.filter((id) => (today(byCrew[id], 'body_temp', ctx) ?? 0) >= 37.8 || today(byCrew[id], 'symptom_skin', ctx) === 1);
  if (fever.length >= 1) {
    out.push({
      ruleId: 'crew_infection_watch', title: 'Possible infection on board: protect the others', status: fever.length >= 2 ? 'red' : 'yellow',
      because: [`Fever or a new sore today: ${list(fever)}.`, 'Immune defences are weaker in space and germs spread easily in a closed cabin.'],
      risks: ['immune', 'microbes'], hazards: ['environment'], zones: ['skin_immune'],
      actions: [{ id: 'crew_infection_watch.primary', text: 'No shared towels, cups or food; wipe the exercise equipment after each use; everyone checks temperature tonight.', recheckIndicatorId: 'body_temp', recheckInMin: 720, escalate: fever.length >= 2 }],
      sources: [SRC.immune, SRC.microbes, P], crew: fever,
    });
  }

  const dosed = ids.filter((id) => (today(byCrew[id], 'radiation_msv', ctx) ?? 0) >= 10);
  if (dosed.length >= 1) {
    out.push({
      ruleId: 'crew_radiation_shelter', title: 'Solar storm: the whole crew to the shelter', status: 'red',
      because: [`High dose today on: ${list(dosed)}.`, 'A solar storm reaches everyone on board.'],
      risks: ['radiation_cancer'], hazards: ['radiation'], zones: ['skin_immune', 'bones'],
      actions: [{ id: 'crew_radiation_shelter.primary', text: 'Everyone to the storm shelter now. Log each personal dosimeter when the dose rate falls.', recheckIndicatorId: 'radiation_msv', recheckInMin: 120, escalate: true }],
      sources: [SRC.radiation, SRC.radiation_cancer, P], crew: ids,
    });
  }
  return [...out.filter((f) => f.status === 'red'), ...out.filter((f) => f.status !== 'red')];
}
