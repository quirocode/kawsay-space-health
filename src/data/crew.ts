/**
 * The four crew members of the demo mission (added 15 Nov). Fictional people; their risk notes
 * summarise published spaceflight findings and point to NASA risk pages. Deterministic data.
 */
import { SRC } from '../domain/indicators';
import type { Reading, Source } from '../domain/types';
import { generateSol142 } from './sol142';

export type CrewId = 'elena' | 'amara' | 'mateo' | 'kenji';
export const CREW_IDS: readonly CrewId[] = ['elena', 'amara', 'mateo', 'kenji'];
export const DEFAULT_CREW: CrewId = 'elena';

type Bi = { en: string; es: string };

export interface CrewProfile {
  id: CrewId;
  name: string;
  short: string;
  initials: string;
  sex: 'female' | 'male';
  age: number;
  role: Bi;
  /** Crew medical officer: sees everyone's status on the crew screen. */
  cmo: boolean;
  /** What UPRIGHT watches more closely for this person, and why. */
  notes: { text: Bi; source: Source }[];
}

export const CREW: Record<CrewId, CrewProfile> = {
  elena: {
    id: 'elena', name: 'Elena Rostova', short: 'E. Rostova', initials: 'ER', sex: 'female', age: 41, cmo: false,
    role: { en: 'Commander', es: 'Comandante' },
    notes: [
      { text: { en: 'Menstrual suppression with a progestin-only method: NASA prefers it to estrogen pills because estrogen raises the risk of blood clots.', es: 'Supresión menstrual con un método solo de progestina: NASA lo prefiere a las pastillas con estrógeno porque el estrógeno sube el riesgo de coágulos.' }, source: SRC.cardio },
      { text: { en: 'Women faint more often when standing after landing, so her landing plan starts fluid loading earlier.', es: 'Las mujeres se desmayan más al ponerse de pie tras aterrizar, así que su plan de aterrizaje empieza antes la carga de líquidos.' }, source: SRC.cardio },
    ],
  },
  amara: {
    id: 'amara', name: 'Amara Okafor', short: 'A. Okafor', initials: 'AO', sex: 'female', age: 36, cmo: true,
    role: { en: 'Mission specialist · Crew medical officer', es: 'Especialista de misión · Oficial médica' },
    notes: [
      { text: { en: 'Urinary infections are more frequent in women in space; some motion-sickness medicines cause urine retention, which raises infection risk further.', es: 'Las infecciones urinarias son más frecuentes en mujeres en el espacio; algunos medicamentos contra el mareo retienen orina, lo que sube aún más el riesgo.' }, source: SRC.immune },
      { text: { en: 'Radiation: organs such as breast and ovaries make the cancer risk per dose higher for women, so her dose is tracked against a personal limit.', es: 'Radiación: órganos como mama y ovarios hacen que el riesgo de cáncer por dosis sea mayor en mujeres, así que su dosis se compara con un límite personal.' }, source: SRC.radiation_cancer },
    ],
  },
  mateo: {
    id: 'mateo', name: 'Mateo Vargas', short: 'M. Vargas', initials: 'MV', sex: 'male', age: 45, cmo: false,
    role: { en: 'Pilot', es: 'Piloto' },
    notes: [
      { text: { en: 'Eye changes from fluid moving to the head (SANS) have been more severe in men; he had a small vision shift on his last flight.', es: 'Los cambios oculares por el líquido que sube a la cabeza (SANS) han sido más graves en hombres; tuvo un pequeño cambio de visión en su vuelo anterior.' }, source: SRC.sans },
      { text: { en: 'Arteries stiffen and blood sugar control worsens during long flights; his glucose is watched more closely.', es: 'Las arterias se endurecen y el control del azúcar empeora en vuelos largos; su glucosa se vigila más de cerca.' }, source: SRC.cardio },
    ],
  },
  kenji: {
    id: 'kenji', name: 'Kenji Sato', short: 'K. Sato', initials: 'KS', sex: 'male', age: 39, cmo: false,
    role: { en: 'Flight engineer', es: 'Ingeniero de vuelo' },
    notes: [
      { text: { en: 'Carries dormant viruses (like most adults) that stress in space can wake up, often without symptoms at first.', es: 'Porta virus latentes (como la mayoría de adultos) que el estrés en el espacio puede despertar, a menudo sin síntomas al principio.' }, source: SRC.immune },
      { text: { en: 'Works night shifts on engineering tasks: short sleep and slower reactions are his main risk.', es: 'Hace turnos de noche en tareas de ingeniería: dormir poco y reaccionar más lento son su principal riesgo.' }, source: SRC.sleep },
    ],
  },
};

/** Personal shifts applied to the seeded history so each person has their own baseline. */
const SHIFT: Record<CrewId, Partial<Record<string, number>>> = {
  elena: {},
  amara: { heart_rate: -3, bp_systolic: -6, bp_diastolic: -4, glucose: -4, sleep_hours: 0.4, water_ml: 300, exercise_min: 15 },
  mateo: { heart_rate: 6, bp_systolic: 9, bp_diastolic: 5, glucose: 9, sleep_hours: -0.2, water_ml: 200, exercise_min: 20 },
  kenji: { heart_rate: 10, bp_systolic: 3, bp_diastolic: 2, glucose: 2, sleep_hours: -0.6, mood: -0.4, water_ml: 100, exercise_min: 5 },
};

/** The seeded history of one crew member (Elena wears the demo watch and has the original story). */
export function crewHistory(id: CrewId): Reading[] {
  const history = generateSol142().history;
  const shift = SHIFT[id];
  if (id === DEFAULT_CREW) return history;
  return history.map((r) => {
    const d = shift[r.indicatorId];
    if (d === undefined) return r;
    const value = r.indicatorId === 'mood' ? Math.min(5, Math.max(1, Math.round(r.value + d))) : Math.round((r.value + d) * 10) / 10;
    return { ...r, value };
  });
}
