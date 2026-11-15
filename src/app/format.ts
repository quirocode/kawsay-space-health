import type { Environment, MissionContext } from '../domain/types';
import { shipTime } from '../data/sol142';
import uiEn from '../../content/ui.json';
import uiEs from '../../content/ui.es.json';

export type Lang = 'en' | 'es';

const ENV_LABEL: Record<Environment, Record<Lang, string>> = {
  iss: { en: 'ISS', es: 'ISS' },
  orion: { en: 'Orion', es: 'Orión' },
  moon: { en: 'Moon surface', es: 'Superficie lunar' },
  mars_transit: { en: 'Mars transit', es: 'Tránsito a Marte' },
  mars_surface: { en: 'Mars surface', es: 'Superficie de Marte' },
};

export function envLabel(env: Environment, lang: Lang = 'en'): string {
  return ENV_LABEL[env][lang];
}

const MISSION = { en: uiEn.mission, es: uiEs.mission };

/** Days left until landing, never negative. */
export function daysToLanding(ctx: Pick<MissionContext, 'missionDay' | 'arrivalDay'>): number {
  return Math.max(0, ctx.arrivalDay - ctx.missionDay);
}

/** "Day 142 of 180". Mission days count from launch; landing is on `arrivalDay`. */
export function missionLabel(ctx: MissionContext, lang: Lang = 'en'): string {
  return fill(MISSION[lang].label, { day: ctx.missionDay, total: ctx.arrivalDay });
}

/** "38 days to landing", "landing tomorrow" or "landing day". */
export function landingLabel(ctx: MissionContext, lang: Lang = 'en'): string {
  const days = daysToLanding(ctx);
  const m = MISSION[lang];
  return days === 0 ? m.landingToday : days === 1 ? m.landingTomorrow : fill(m.toLanding, { days });
}

export function delayLabel(min: number, lang: Lang = 'en'): string {
  if (!Number.isFinite(min)) return lang === 'es' ? 'Sin contacto con Tierra (conjunción)' : 'No contact with Earth (conjunction)';
  if (min < 1) return lang === 'es' ? 'Retraso con Tierra: segundos' : 'Earth delay: seconds';
  return lang === 'es' ? `Retraso con Tierra ${Math.round(min)} min` : `Earth delay ${Math.round(min)} min`;
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
export function ago(ms: number, lang: Lang = 'en'): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 172_800) return `${Math.floor(s / 3600)} h`;
  const days = Math.floor(s / 86_400);
  return lang === 'es' ? `${days} ${days === 1 ? 'día' : 'días'}` : `${days} days`;
}

/** Decimal separator for the active language: 1.5 becomes 1,5 in Spanish. */
export function dec(value: number | string, lang: Lang = 'en'): string {
  const s = String(value);
  return lang === 'es' ? s.replace('.', ',') : s;
}

/** Fill {placeholders} in a copy string from content/. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}
