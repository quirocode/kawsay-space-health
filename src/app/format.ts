import type { Environment, MissionContext } from '../domain/types';
import { shipTime } from '../data/sol142';

export const ENV_LABEL: Record<Environment, string> = {
  iss: 'ISS',
  orion: 'Orion',
  moon: 'Moon surface',
  mars_transit: 'Mars transit',
  mars_surface: 'Mars surface',
};

export function missionLabel(ctx: MissionContext): string {
  return `Sol ${ctx.missionDay} of ${ctx.arrivalDay}`;
}

export function delayLabel(min: number): string {
  if (!Number.isFinite(min)) return 'No contact with Earth (conjunction)';
  if (min < 1) return 'Earth delay: seconds';
  return `Earth delay ${Math.round(min)} min`;
}

const two = (n: number) => String(n).padStart(2, '0');

/** Ship time as HH:MM (hours since the mission day began). */
export function clock(ts: number): string {
  const { secOfDay } = shipTime(ts);
  return `${two(Math.floor(secOfDay / 3600))}:${two(Math.floor((secOfDay % 3600) / 60))}`;
}

/** A duration as M:SS, never negative. */
export function countdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${two(s % 60)}`;
}

/** How long ago, in the largest unit that fits: '2 s', '14 min', '7 h', '3 days'. */
export function ago(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 172_800) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86_400)} days`;
}

/** Fill {placeholders} in a copy string from content/. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}
