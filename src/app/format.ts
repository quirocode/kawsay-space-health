import type { Environment, MissionContext } from '../domain/types';

export const ENV_LABEL: Record<Environment, string> = {
  iss: 'ISS',
  orion: 'Orion',
  moon: 'Moon surface',
  mars_transit: 'Mars transit',
  mars_surface: 'Mars surface',
};

export function missionLabel(ctx: MissionContext): string {
  return `Sol ${ctx.missionDay} of ${ctx.arrivalDay} · ${ENV_LABEL[ctx.environment]}`;
}

export function delayLabel(min: number): string {
  if (!Number.isFinite(min)) return 'No contact with Earth (conjunction)';
  if (min < 1) return 'Earth delay: seconds';
  return `Earth delay ${Math.round(min)} min`;
}

/** Ship time (UTC) as HH:MM. */
export function clock(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}
