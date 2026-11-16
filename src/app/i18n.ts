/**
 * Bilingual copy (P1). English stays the source of truth; Spanish is a translation layer.
 * Screen copy lives in content/*.json and is swapped here. Engine copy is translated with
 * tr(): an exact dictionary for fixed sentences plus patterns for sentences with numbers.
 * Pure and offline: no network, no auto-translate at runtime.
 */
import uiEn from '../../content/ui.json';
import uiEs from '../../content/ui.es.json';
import flowEn from '../../content/flow.json';
import flowEs from '../../content/flow.es.json';
import indEn from '../../content/indicators.json';
import indEs from '../../content/indicators.es.json';
import { useApp } from './store';
import { TR } from './translate.es';

export type Lang = 'en' | 'es';

export interface Copy {
  ui: typeof uiEn;
  flow: typeof flowEn;
  indicators: typeof indEn;
}

const BUNDLE: Record<Lang, Copy> = {
  en: { ui: uiEn, flow: flowEn, indicators: indEn },
  es: {
    ui: uiEs as unknown as typeof uiEn,
    flow: flowEs as unknown as typeof flowEn,
    indicators: indEs as unknown as typeof indEn,
  },
};

export function copyFor(lang: Lang): Copy {
  return BUNDLE[lang];
}

/** Copy for the language the crew member picked in the header. */
export function useCopy(): Copy {
  return BUNDLE[useApp((s) => s.lang)];
}

export function useLang(): Lang {
  return useApp((s) => s.lang);
}

// ── Module-level copy proxies ────────────────────────────────────────────────
// Components keep reading `ui.x` / `flow.x` exactly as before. App calls syncLang()
// before rendering children and remounts them with a key, so every string is read
// again in the new language without touching 30 components.
let active: Lang = 'en';

export function syncLang(lang: Lang): Lang {
  active = lang;
  return lang;
}

function bundleProxy<K extends keyof Copy>(key: K): Copy[K] {
  return new Proxy({} as Copy[K], {
    get: (_t, prop) => (BUNDLE[active][key] as Record<PropertyKey, unknown>)[prop as string],
    has: (_t, prop) => prop in (BUNDLE[active][key] as object),
    ownKeys: () => Reflect.ownKeys(BUNDLE[active][key] as object),
    getOwnPropertyDescriptor: (_t, prop) => ({
      enumerable: true,
      configurable: true,
      value: (BUNDLE[active][key] as Record<PropertyKey, unknown>)[prop as string],
    }),
  });
}

export const ui: Copy['ui'] = bundleProxy('ui');
export const flow: Copy['flow'] = bundleProxy('flow');
export const indicators: Copy['indicators'] = bundleProxy('indicators');

/** Spanish for fixed engine sentences that the dictionary covers but the source lists miss. */
const TR_EXTRA: Record<string, string> = {
  "Neck swelling or fullness": "Cuello hinchado o lleno",
  "Flank or lower back pain": "Dolor en el costado o la espalda baja",
  "Radiation dose today": "Dosis de radiación de hoy",
  "Reaction time test": "Prueba de tiempo de reacción",
  "10 mSv or more in a day": "10 mSv o más en un día",
  "1 mSv or more in a day": "1 mSv o más en un día",
  "450 ms or slower": "450 ms o más lento",
  "350–449 ms": "350–449 ms",
  "Possible blood flow problem in a neck vein": "Posible problema de flujo en una vena del cuello",
  "Neck swelling or fullness reported.": "Cuello hinchado o lleno reportado.",
  "Headache reported at the same time.": "Dolor de cabeza reportado al mismo tiempo.",
  "Tell the crew medical officer: a neck vein ultrasound is needed today. Avoid straining until then.": "Avisa al oficial médico: hoy hace falta una ecografía de la vena del cuello. Evita esfuerzos hasta entonces.",
  "Possible kidney stone": "Posible cálculo renal",
  "Flank or lower back pain reported.": "Dolor en el costado o la espalda baja reportado.",
  "Temperature is raised.": "La temperatura está elevada.",
  "Tell the crew medical officer now and drink water steadily. A kidney ultrasound confirms it.": "Avisa ahora al oficial médico y bebe agua de forma constante. Una ecografía renal lo confirma.",
  "Solar storm: high radiation dose": "Tormenta solar: dosis de radiación alta",
  "This reaches the whole crew, not one person.": "Esto alcanza a toda la tripulación, no a una persona.",
  "Go to the storm shelter with the whole crew and stay until the dose rate falls.": "Ve al refugio contra tormentas con toda la tripulación y quédate hasta que baje la tasa de dosis.",
  "Your reactions are slower than safe": "Tus reacciones son más lentas de lo seguro",
  "No critical tasks (piloting, EVA, robotics) until a repeat test is under 350 ms. Sleep first.": "Ninguna tarea crítica (pilotar, EVA, robótica) hasta que una prueba repetida dé menos de 350 ms. Primero duerme.",
  "Several crew members with headache: check the cabin air": "Varios tripulantes con dolor de cabeza: revisa el aire de la cabina",
  "When several people feel it at once, the cause is usually shared (CO₂, ventilation, a leak), not personal.": "Cuando varias personas lo sienten a la vez, la causa suele ser compartida (CO₂, ventilación, una fuga), no personal.",
  "Check the CO₂ scrubber and fans, and the air near the sleeping quarters.": "Revisa el depurador de CO₂ y los ventiladores, y el aire cerca de los camarotes.",
  "Possible infection on board: protect the others": "Posible infección a bordo: protege a los demás",
  "Immune defences are weaker in space and germs spread easily in a closed cabin.": "Las defensas son más débiles en el espacio y los gérmenes se contagian fácilmente en una cabina cerrada.",
  "No shared towels, cups or food; wipe the exercise equipment after each use; everyone checks temperature tonight.": "Nada de toallas, vasos o comida compartidos; limpia el equipo de ejercicio tras cada uso; todos miden su temperatura esta noche.",
  "Solar storm: the whole crew to the shelter": "Tormenta solar: toda la tripulación al refugio",
  "A solar storm reaches everyone on board.": "Una tormenta solar alcanza a todos a bordo.",
  "Everyone to the storm shelter now. Log each personal dosimeter when the dose rate falls.": "Todos al refugio contra tormentas ahora. Registra cada dosímetro personal cuando baje la tasa de dosis.",
  'Insufficient data for the 1-hour cabin CO₂ average.': 'Datos insuficientes para el promedio de CO₂ de cabina de una hora.',
  'Cabin CO₂ (1-hour average)': 'CO₂ de cabina (promedio de una hora)',
  'Log the symptoms and tell the crew so they can review the situation.': 'Registra los síntomas y avisa a la tripulación para que revise la situación.',
  'Headache + short sleep + high cabin CO₂': 'Dolor de cabeza + poco sueño + CO₂ alto en la cabina',
  'Headache + high cabin CO₂': 'Dolor de cabeza + CO₂ alto en la cabina',
  'Headache + short sleep': 'Dolor de cabeza + poco sueño',
  'high cabin CO₂': 'CO₂ alto en la cabina',

  // Indicator names and threshold bands
  'Blood pressure (systolic)': 'Presión arterial (sistólica)',
  'Blood pressure (diastolic)': 'Presión arterial (diastólica)',
  'Resting heart rate': 'Frecuencia cardíaca en reposo',
  'Heart rate': 'Frecuencia cardíaca',
  'Blood glucose': 'Glucosa en sangre',
  'Body temperature': 'Temperatura corporal',
  'Sleep last night': 'Sueño de anoche',
  'Cabin CO₂': 'CO₂ de la cabina',
  'Exercise today': 'Ejercicio de hoy',
  'Water today': 'Agua de hoy',
  'Strength self-test': 'Autoprueba de fuerza',
  'Blood oxygen': 'Oxígeno en sangre',
  'Heart rate variability': 'Variabilidad cardíaca',
  'Skin temperature': 'Temperatura de la piel',
  'Breathing': 'Respiración',
  'Resting': 'En reposo',
  'Sleeping': 'Durmiendo',
  'Active': 'Activo',
  'Exercising': 'Ejercitando',
  'Reported': 'Reportado',
  'Low': 'Bajo',
  'Very low': 'Muy bajo',
  // NASA's five hazards
  'Space radiation': 'Radiación espacial',
  'Isolation': 'Aislamiento',
  'Distance from Earth': 'Distancia a la Tierra',
  'Gravity fields': 'Campos de gravedad',
  'Hostile environment': 'Entorno hostil',
  // Small words and choices
  'Yes': 'Sí',
  'No': 'No',
  'to': 'a',
  'Prototype': 'Prototipo',
  'Severe': 'Severo',
  'Moderate to strong': 'Moderado a fuerte',
  '4 to 6 h': '4 a 6 h',
  'of 5': 'de 5',
  'Top number': 'Número superior',
  'Bottom number': 'Número inferior',
  'Heart rate, last 10 minutes': 'Frecuencia cardíaca, últimos 10 minutos',
  // Body zones and metrics (Future Self)
  'Eyes': 'Ojos',
  'Brain': 'Cerebro',
  'Balance': 'Equilibrio',
  'Heart': 'Corazón',
  'Lungs': 'Pulmones',
  'Bones and spine': 'Huesos y columna',
  'Muscles': 'Músculos',
  'Kidneys': 'Riñones',
  'Skin and immunity': 'Piel e inmunidad',
  'Digestion': 'Digestión',
  'Bone density': 'Densidad ósea',
  'Leg strength': 'Fuerza de piernas',
  'Standing tolerance': 'Tolerancia de pie',
  'Vision': 'Visión',
  'Alertness': 'Estado de alerta',
  'no projection': 'sin proyección',
  // Projection models (engine)
  'Bone loses 1.0–1.5 % per month in microgravity (NASA). We interpolate by your exercise vs the 90 min/day target (prototype).':
    'El hueso pierde 1,0–1,5 % al mes en microgravedad (NASA). Interpolamos según tu ejercicio frente al objetivo de 90 min al día (prototipo).',
  'Fitness drops 10–12 % on a 6-month mission on average; some crew lose more than 20 % (NASA). Scaled by your exercise (prototype).':
    'La forma física baja 10–12 % en promedio en una misión de 6 meses; algunos tripulantes pierden más de 20 % (NASA). Escalado por tu ejercicio (prototipo).',
  'Low blood pressure can cause fainting at landing; fluids and compression garments help (NASA). Effect sizes are prototype values.':
    'La presión arterial baja puede causar desmayos al aterrizar; los líquidos y las prendas de compresión ayudan (NASA). Los tamaños de efecto son valores de prototipo.',
  'About 70 % of ISS astronauts show some eye swelling (SANS, NASA). Each day with blurred vision lowers this (prototype).':
    'Cerca del 70 % de los astronautas de la ISS muestra algo de hinchazón ocular (SANS, NASA). Cada día con visión borrosa lo reduce (prototipo).',
  'Short sleep slows decisions (NASA sleep risk). −8 points per hour under 7 h (prototype).':
    'El sueño corto ralentiza las decisiones (riesgo de sueño de la NASA). −8 puntos por cada hora bajo 7 h (prototipo).',
  'KAWSAY prototype value (general adult reference, not a NASA figure)':
    'Valor de prototipo de KAWSAY (referencia de adulto general, no una cifra de NASA)',
  '1.5 to 2 L': '1,5 a 2 L',
  'Below 4 h': 'Menos de 4 h',
  'Under 1.5 L': 'Menos de 1,5 L',
  'Under 45 min': 'Menos de 45 min',
  'Under the NASA target of 90 min a day': 'Bajo el objetivo NASA de 90 min al día',
  'Above the NASA limit of 3 mmHg (1-hour average)': 'Sobre el límite NASA de 3 mmHg (promedio de 1 hora)',
  'Unusual for you (more than 2 SD from your recent days)': 'Inusual para ti (más de 2 DE respecto a tus últimos días)',
  'More than 20 % below pre-flight': 'Más de 20 % bajo tu nivel pre-vuelo',
  '10–20 % below pre-flight': '10–20 % bajo tu nivel pre-vuelo',
  '% of pre-flight': '% de tu nivel pre-vuelo',
  // Watch protocol
  'Measure your blood pressure': 'Mide tu presión arterial',
  'Breathe slowly for 2 minutes': 'Respira lento durante 2 minutos',
  'Drink 250 ml of water': 'Bebe 250 ml de agua',
  'Put on the oxygen mask': 'Ponte la mascarilla de oxígeno',
  'Sit upright and breathe steadily for 2 minutes': 'Siéntate derecho y respira con calma durante 2 minutos',
  'Check the strap, then the battery': 'Revisa la correa y luego la batería',
  'Sit still for one minute · Cuff on the upper arm, at heart level · Press start':
    'Quédate quieto un minuto · Brazalete en el brazo, a la altura del corazón · Pulsa start',
  'In for 4 seconds, out for 6. Keep the watch on.': 'Inhala 4 segundos, exhala 6. Mantén el reloj puesto.',
  'Small sips. Stay where you are.': 'Sorbos pequeños. No te muevas de donde estás.',
  'Check the cabin air reading on the way. Tell a crewmate.':
    'Revisa el CO₂ de la cabina en el camino. Avísale a un tripulante.',
  'Keep the watch on so we can see the change.': 'Mantén el reloj puesto para ver el cambio.',
  'Snug, one finger above the wrist bone.': 'Ajustada, un dedo sobre el hueso de la muñeca.',
  'Do you have any of these right now?': '¿Tienes alguno de estos síntomas ahora?',
  'Choose all that apply.': 'Elige todos los que apliquen.',
  'Chest pain or pressure': 'Dolor u opresión en el pecho',
  'Trouble breathing': 'Dificultad para respirar',
  'Heart pounding or skipping': 'Corazón acelerado o con saltos',
  'Dizzy or about to faint': 'Mareado o a punto de desmayarte',
  'None of these': 'Ninguno',
  // Likely contributors (watch)
  'dehydration': 'deshidratación',
  'fatigue': 'fatiga',
  'low oxygen': 'oxígeno bajo',
  'fever': 'fiebre',
};

const OUTCOME: Record<string, string> = {
  improved: 'mejoró',
  unchanged: 'sin cambios',
  worse: 'empeoró',
};

const RANGE: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Below (.+)$/, (m) => `Por debajo de ${m[1]}`],
  [/^Above (.+)$/, (m) => `Por encima de ${m[1]}`],
  [/^(.+) or more$/, (m) => `${m[1]} o más`],
  [/^(.+) or less$/, (m) => `${m[1]} o menos`],
];

/** Sentences the engine builds with numbers. Order matters: first match wins. */
const PATTERNS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Cabin CO₂ \(1-hour average\): (.+) mmHg\. NASA habitat limit: 3 mmHg\.$/, (m) => `CO₂ de cabina (promedio de una hora): ${m[1]} mmHg. Límite NASA para el hábitat: 3 mmHg.`],

  // Verification
  [/^(.+) went from (.+) to (.+?)( .+)? — improved\.$/, (m) => `${tr(m[1], 'es')} pasó de ${m[2]} a ${m[3]}${m[4] ?? ''} — mejoró.`],
  [/^(.+) went from (.+) to (.+?)( .+)? — worse, we'll tell Earth\.$/, (m) => `${tr(m[1], 'es')} pasó de ${m[2]} a ${m[3]}${m[4] ?? ''} — empeoró, avisaremos a Tierra.`],
  [/^(.+) stayed at (.+?) — no better, we'll tell Earth\.$/, (m) => `${tr(m[1], 'es')} se mantuvo en ${m[2]} — sin mejora, avisaremos a Tierra.`],
  // Brief
  [/^(.+); improved after action\.$/, (m) => `${tr(m[1], 'es')}; mejoró tras la acción.`],
  [/^(.+); not improved after action\.$/, (m) => `${tr(m[1], 'es')}; no mejoró tras la acción.`],
  [/^Please review: (.+)\. Advise on next step\.$/, (m) => `Revisa por favor: ${tr(m[1], 'es')}. Indica el siguiente paso.`],
  [/^(.+) → (improved|unchanged|worse)$/, (m) => `${tr(m[1], 'es')} → ${OUTCOME[m[2]]}`],
  // Evaluation
  [/^Last reading is (.+) old\.$/, (m) => `La última lectura es de hace ${tr(m[1], 'es')}.`],
  [/^(.+) is in the expected range\.$/, (m) => `${tr(m[1], 'es')} está en el rango esperado.`],
  [/^(.+) is unusual for you \(more than 2 SD from your last (\d+) days\)\.$/, (m) => `${tr(m[1], 'es')} es inusual para ti (más de 2 DE respecto a tus últimos ${m[2]} días).`],
  [/^(.+) reported: (.+)\.$/, (m) => `${tr(m[1], 'es')}: ${label(m[2])}.`],
  [/^Mission day (\d+) in weightlessness: blood pools in the neck veins\.$/, (m) => `Día de misión ${m[1]} en ingravidez: la sangre se acumula en las venas del cuello.`],
  [/^Radiation dose today: (.+) mSv\.$/, (m) => `Dosis de radiación de hoy: ${m[1]} mSv.`],
  [/^Reaction time (.+) ms\.$/, (m) => `Tiempo de reacción ${m[1]} ms.`],
  [/^Headache today: (.+)\.$/, (m) => `Dolor de cabeza hoy: ${m[1]}.`],
  [/^Fever or a new sore today: (.+)\.$/, (m) => `Fiebre o una lesión nueva hoy: ${m[1]}.`],
  [/^High dose today on: (.+)\.$/, (m) => `Dosis alta hoy en: ${m[1]}.`],
  [/^Mission day (\d+): bone has been releasing calcium for weeks\.$/, (m) => `Día de misión ${m[1]}: los huesos llevan semanas liberando calcio.`],
  [/^(.+?) ([-\d.,]+) ?([A-Za-z%°]+)?: (.+)\.$/, (m) => `${tr(m[1], 'es')} ${m[2]}${m[3] ? ' ' + m[3] : ''}: ${label(m[4])}.`],
  // Compound findings
  [/^Headache reported \((.+) of 5\)\.$/, (m) => `Dolor de cabeza reportado (${m[1]} de 5).`],
  [/^Cabin CO₂ (.+) mmHg — NASA limit is 3 mmHg\.$/, (m) => `CO₂ de la cabina ${m[1]} mmHg — el límite NASA es 3 mmHg.`],
  [/^Sleep averaged (.+) h over (\d+) nights?\.$/, (m) => `Sueño promedio de ${m[1]} h en ${m[2]} noches.`],
  [/^Short sleep: (.+) h average over (\d+) nights\.$/, (m) => `Sueño corto: promedio de ${m[1]} h en ${m[2]} noches.`],
  [/^Water averaged (.+) L over (\d+) days\.$/, (m) => `Agua promedio de ${m[1]} L en ${m[2]} días.`],
  [/^Low water (today|over 3 days): (.+) L of 2\.5 L\.$/, (m) => `Poca agua ${m[1] === 'today' ? 'hoy' : 'en 3 días'}: ${m[2]} L de 2,5 L.`],
  [/^Exercise averaged (.+) min over (\d+) days — NASA target is 90\.$/, (m) => `Ejercicio promedio de ${m[1]} min en ${m[2]} días — el objetivo NASA es 90.`],
  [/^Mood (.+) of (\d+)\.$/, (m) => `Estado de ánimo ${m[1]} de ${m[2]}.`],
  [/^Blood oxygen (.+) %\.$/, (m) => `Oxígeno en sangre ${m[1]} %.`],
  // Alarm headline
  [/^Your heart rate is (.+) and you are resting\.$/, (m) => `Tu frecuencia cardíaca es de ${m[1]} y estás en reposo.`],
  [/^(.+): ([-\d.,]+) ?(bpm|%)\.$/, (m) => `${tr(m[1], 'es')}: ${m[2]} ${m[3]}.`],
  // Watch
  [/^Heart rate (.+) bpm while resting\.$/, (m) => `Frecuencia cardíaca ${m[1]} bpm en reposo.`],
  [/^Heart rate (.+) bpm while awake and resting\.$/, (m) => `Frecuencia cardíaca ${m[1]} bpm despierto y en reposo.`],
  [/^At or above (\d+) for (\d+) min\.$/, (m) => `En o sobre ${m[1]} durante ${m[2]} min.`],
  [/^Below (.+?) % for (\d+) min\.$/, (m) => `Por debajo de ${m[1]} % durante ${m[2]} min.`],
  [/^Below (.+?) for (\d+) min\.$/, (m) => `Por debajo de ${m[1]} durante ${m[2]} min.`],
  [/^No usable reading for (\d+) min\.$/, (m) => `Sin lectura útil durante ${m[1]} min.`],
  [/^Skin temperature (.+) °C above your usual\.$/, (m) => `Temperatura de la piel ${m[1]} °C sobre tu valor habitual.`],
  [/^Likely: (.+?)\.$/, (m) => `Probable: ${m[1].split(/, | and /).map((s) => tr(s, 'es')).join(' y ')}.`],
  [/^No clear cause yet\. That is why we check step by step\.$/, () => 'Aún no hay una causa clara. Por eso revisamos paso a paso.'],
];

function label(text: string): string {
  if (TR[text] ?? TR_EXTRA[text]) return tr(text, 'es');
  for (const [re, f] of RANGE) {
    const m = text.match(re);
    if (m) return f(m);
  }
  return tr(text, 'es');
}

/** Translate engine copy. Unknown strings fall back to English instead of breaking the screen. */
export function tr(text: string, lang: Lang = 'en'): string {
  if (lang !== 'es' || !text) return text;
  const localize = (s: string) => s.replace(/(\d)\.(\d)/g, '$1,$2');
  const direct = TR_EXTRA[text] ?? TR[text];
  if (direct) return localize(direct);
  for (const [re, f] of PATTERNS) {
    const m = text.match(re);
    if (m) return localize(f(m));
  }
  // Engine sentences often add a trailing period to a fixed title ("… risk.").
  if (text.endsWith('.')) {
    const base = TR_EXTRA[text.slice(0, -1)] ?? TR[text.slice(0, -1)];
    if (base) return localize(`${base}.`);
  }
  return text;
}

export function trList(list: string[], lang: Lang): string[] {
  return list.map((s) => tr(s, lang));
}

/** Translate an engine string into the language currently on screen (see syncLang). */
export function te(text: string): string {
  return tr(text, active);
}

export function teList(list: string[]): string[] {
  return list.map((s) => te(s));
}
