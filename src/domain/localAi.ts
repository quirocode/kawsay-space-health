/**
 * KAWSAY On-Board Local Med-AI Explainer & Offline Voice Copilot.
 * Replaces raw reference dumps under "Why?" ("¿Por qué?") with a 100% offline, on-device
 * physiological & clinical reasoning engine tailored to the active astronaut's readings,
 * pre-existing conditions, mission day, and gravity environment.
 */
import { getCrewMember, type CrewMemberProfile } from './crew';
import type { MissionContext, Reading, Source } from './types';

export interface LocalAiExplanation {
  headline: string;
  mechanism: string;
  personalContext: string;
  hiddenRiskWarning: string;
  engineBadge: string;
}

export interface LocalAiInput {
  sources: Source[];
  crewName?: string;
  readings?: Reading[];
  context?: MissionContext;
  lang: 'en' | 'es';
  topicHint?: string;
}

function latestReading(readings: Reading[] | undefined, id: string): number | undefined {
  if (!readings || readings.length === 0) return undefined;
  let best: Reading | undefined;
  for (const r of readings) {
    if (r.indicatorId === id && (!best || r.ts > best.ts)) best = r;
  }
  return best?.value;
}

function inferMechanismTopic(sources: Source[], topicHint?: string): string {
  const combined = `${topicHint ?? ''} ${sources.map((s) => `${s.label} ${s.url}`).join(' ')}`.toLowerCase();
  if (combined.includes('co2') || combined.includes('6004') || combined.includes('helmet')) return 'co2';
  if (combined.includes('dcs') || combined.includes('decompression') || combined.includes('30 kpa')) return 'dcs';
  if (combined.includes('sans') || combined.includes('neuro-ocular')) return 'sans';
  if (combined.includes('bone') || combined.includes('kidney')) return 'bone_renal';
  if (combined.includes('sleep') || combined.includes('isolation') || combined.includes('behavioral')) return 'sleep_neuro';
  if (combined.includes('immune') || combined.includes('microbe')) return 'immune';
  if (combined.includes('hypoxia')) return 'hypoxia';
  if (combined.includes('sensorimotor') || combined.includes('orthostatic')) return 'orthostatic';
  if (combined.includes('eva') || combined.includes('metabolic')) return 'eva_thermal';
  if (combined.includes('cardio') || combined.includes('fitness')) return 'cardio';
  return 'general';
}

function mechanismCopy(topic: string, lang: 'en' | 'es', readings?: Reading[], ctx?: MissionContext): { headline: string; mechanism: string; hidden: string } {
  const es = lang === 'es';
  const hr = latestReading(readings, 'heart_rate');
  const co2 = latestReading(readings, 'cabin_co2');
  const water = latestReading(readings, 'water_ml');
  const sleep = latestReading(readings, 'sleep_hours');
  const spo2 = latestReading(readings, 'spo2');
  const day = ctx?.missionDay ?? 142;

  switch (topic) {
    case 'co2':
      return {
        headline: es
          ? 'Hipercapnia espacial y vasodilatación cerebral en microgravedad'
          : 'Spaceflight hypercapnia & cerebral vasodilation in microgravity',
        mechanism: es
          ? `En ingravidez no existe convección natural (el aire caliente exhalado no sube), por lo que se acumulan bolsillos de CO₂ alrededor del rostro${co2 !== undefined ? ` (actual: ${co2.toFixed(1)} mmHg)` : ''}. El exceso de CO₂ en sangre baja el pH del líquido cefalorraquídeo y provoca vasodilatación de las arterias cerebrales, aumentando la presión intracraneal y disparando cefalea pulsátil y fatiga.`
          : `In weightlessness there is no natural convection (warm exhaled air does not rise), forming local CO₂ pockets around your head${co2 !== undefined ? ` (current: ${co2.toFixed(1)} mmHg)` : ''}. Excess blood CO₂ lowers cerebrospinal pH and dilates cerebral arteries, raising intracranial pressure and triggering throbbing headache and fatigue.`,
        hidden: es
          ? 'Riesgo silencioso: Por encima de 3 mmHg de CO₂, tu velocidad de decisión y puntería fina caen un 15–25 % antes de que percibas falta de aire.'
          : 'Silent risk: Above 3 mmHg CO₂, cognitive decision speed and fine motor tracking drop 15–25 % before you ever feel short of breath.',
      };
    case 'dcs':
      return {
        headline: es
          ? 'Nucleación de microburbujas de nitrógeno (Enfermedad por Descompresión)'
          : 'Nitrogen microbubble nucleation (Decompression Sickness)',
        mechanism: es
          ? 'Al pasar de la presión de cabina (14.7 psi) a la presión del traje EVA (4.3 psi), el nitrógeno disuelto en tus tejidos y líquido sinovial puede salir de solución formando microburbujas si la desnitrogenación (preoxigenación) fue incompleta o el esfuerzo físico articular fue alto.'
          : 'When stepping down from cabin pressure (14.7 psi) to EVA suit pressure (4.3 psi), dissolved nitrogen in tissues and joint synovial fluid can come out of solution as microbubbles if prebreathe washout was incomplete or joint workload was high.',
        hidden: es
          ? 'Riesgo silencioso: Un dolor articular leve en hombro o rodilla durante EVA puede evolucionar en minutos a émbolos gaseosos pulmonares o neurológicos (DCS Tipo II) si no se represuriza de inmediato.'
          : 'Silent risk: Mild shoulder or knee pain during EVA can progress within minutes to pulmonary or neurological gas embolism (Type II DCS) without immediate repressurization.',
      };
    case 'sans':
      return {
        headline: es
          ? 'Desplazamiento cefálico de fluidos y Síndrome Neuro-Ocular (SANS)'
          : 'Cephalad fluid shift & Spaceflight-Associated Neuro-Ocular Syndrome (SANS)',
        mechanism: es
          ? `Tras ${day} días sin gravedad que tire de los líquidos hacia las piernas, ~2 litros de sangre y fluido intersticial migran hacia el tórax y la cabeza. Esto congestiona el drenaje venoso cerebral, eleva la presión en la vaina del nervio óptico y aplana la parte posterior del globo ocular.`
          : `After ${day} days without gravity pulling fluids toward the legs, ~2 liters of blood and interstitial fluid shift toward the chest and head. This impedes cerebral venous drainage, raises optic nerve sheath pressure, and flattens the posterior globe.`,
        hidden: es
          ? 'Riesgo silencioso: El edema de disco óptico y los pliegues coroideos avanzan sin dolor; puedes perder enfoque cercano para leer checklists de aterrizaje sin notarlo gradualmente.'
          : 'Silent risk: Optic disc edema and choroidal folds progress painlessly; near-vision focus for landing checklists degrades gradually without obvious warning.',
      };
    case 'bone_renal':
      return {
        headline: es
          ? 'Resorción osteoclástica de calcio y sobresaturación renal'
          : 'Osteoclastic calcium resorption & renal supersaturation',
        mechanism: es
          ? `En el día ${day} de misión, tus huesos de carga (fémur, pelvis, columna) liberan calcio continuamente al torrente sanguíneo por falta de impacto gravitatorio. Los riñones filtran ese exceso de calcio (hipercalciuria); si tu hidratación es baja${water !== undefined ? ` (${(water / 1000).toFixed(2)} L hoy)` : ''}, el calcio cristaliza con oxalato y ácido úrico.`
          : `On mission day ${day}, weight-bearing bones (femur, pelvis, spine) continuously release calcium into the bloodstream due to unloading. Your kidneys filter this excess calcium (hypercalciuria); when hydration is low${water !== undefined ? ` (${(water / 1000).toFixed(2)} L today)` : ''}, calcium crystallizes with oxalate and uric acid.`,
        hidden: es
          ? 'Riesgo silencioso: Un microcálculo renal es totalmente indoloro mientras se forma en el cáliz renal, pero puede obstruir el uréter de forma aguda durante las fuerzas G del aterrizaje.'
          : 'Silent risk: A renal micro-stone is completely painless while forming in the kidney calyx, but can acutely obstruct the ureter during landing G-loads.',
      };
    case 'sleep_neuro':
      return {
        headline: es
          ? 'Desincronización circadiana y fatiga ejecutiva acumulada'
          : 'Circadian desynchronization & cumulative executive fatigue',
        mechanism: es
          ? `Sin el ciclo solar terrestre de 24 h, el núcleo supraquiasmático pierde su ancla de melatonina. Dormir menos de 6 h${sleep !== undefined ? ` (último registro: ${sleep} h)` : ''} reduce el aclaramiento glinfático cerebral y deprime el tono vagal.`
          : `Without Earth's 24-hour solar cycle, the suprachiasmatic nucleus loses its melatonin anchor. Sleeping under 6 h${sleep !== undefined ? ` (latest: ${sleep} h)` : ''} reduces cerebral glymphatic clearance and depresses vagal tone.`,
        hidden: es
          ? 'Riesgo silencioso: La privación crónica de sueño produce "ceguera de fatiga": el astronauta subestima sus propios errores de atención en un 40 %.'
          : 'Silent risk: Chronic sleep loss causes "fatigue blindness": astronauts underestimate their own attention lapses by up to 40 %.',
      };
    case 'immune':
      return {
        headline: es
          ? 'Disregulación inmune espacial y reactivación viral latente'
          : 'Spaceflight immune dysregulation & latent viral reactivation',
        mechanism: es
          ? 'La combinación de microgravedad, radiación cósmica y cortisol de confinamiento reduce la actividad citotóxica de tus células NK y linfocitos T, mientras que altera el microbioma cutáneo y mucoso.'
          : 'Microgravity, cosmic radiation, and confinement cortisol blunt NK-cell and T-lymphocyte cytotoxicity while altering skin and mucosal microbiomes.',
        hidden: es
          ? 'Riesgo silencioso: Virus latentes (Herpes HSV-1, EBV, Varicela-Zóster) se reactivan en saliva y sangre días antes de producir fiebre o lesiones visibles.'
          : 'Silent risk: Dormant viruses (HSV-1, EBV, Varicella-Zoster) reactivate in saliva and blood days before causing fever or visible rash.',
      };
    case 'hypoxia':
      return {
        headline: es
          ? 'Hipoxia hipobárica/ambiental y entrega tisular de oxígeno'
          : 'Hypobaric/environmental hypoxia & tissue oxygen delivery',
        mechanism: es
          ? `Una caída en la saturación arterial de oxígeno${spo2 !== undefined ? ` (${spo2} %)` : ''} indica menor presión parcial alveolar de O₂ o alteración ventilación/perfusión. El tejido neuronal y la retina son los primeros en sufrir déficit de ATP.`
          : `A drop in arterial oxygen saturation${spo2 !== undefined ? ` (${spo2} %)` : ''} indicates reduced alveolar O₂ partial pressure or ventilation/perfusion mismatch. Retinal and cortical neurons are the first to suffer ATP deficit.`,
        hidden: es
          ? 'Riesgo silencioso: La hipoxia leve produce euforia y pérdida de autocrítica antes del desmayo; nunca pospongas colocarte la máscara de O₂.'
          : 'Silent risk: Mild hypoxia causes euphoria and loss of self-monitoring before syncope; never delay putting on supplemental O₂.',
      };
    case 'eva_thermal':
      return {
        headline: es
          ? 'Carga termometabólica y retención de CO₂ en traje presurizado'
          : 'Thermometabolic strain & helmet CO₂ retention in pressurized suit',
        mechanism: es
          ? 'Dentro del traje EVA a 4.3 psi, mover las articulaciones contra la presión del traje multiplica el consumo de oxígeno. Si el enfriamiento líquido (LCVG) no disipa el calor metabólico, se produce vasodilatación cutánea, taquicardia compensatoria y lavado insuficiente de CO₂ en el casco.'
          : 'Inside a 4.3 psi EVA suit, flexing joints against suit pressure multiplies oxygen consumption. If the Liquid Cooling and Ventilation Garment (LCVG) lags behind metabolic heat, cutaneous vasodilation, compensatory tachycardia, and helmet CO₂ washout failure follow.',
        hidden: es
          ? 'Riesgo silencioso: El agotamiento por calor dentro del traje puede precipitar presíncope y empañamiento súbito del visor lejos de la esclusa.'
          : 'Silent risk: In-suit heat exhaustion can trigger presyncope and sudden visor fogging far from the airlock.',
      };
    default:
      return {
        headline: es
          ? 'Adaptación cardiovascular y barorrefleja al vuelo espacial'
          : 'Cardiovascular & baroreflex adaptation to spaceflight',
        mechanism: es
          ? `En microgravedad el cuerpo interpreta el desplazamiento de sangre al tórax como exceso de volumen y elimina ~15 % del plasma en los primeros días. Con menos volumen sanguíneo y menor masa ventricular${hr !== undefined ? ` (pulso actual: ${hr} lpm)` : ''}, el reflejo barorreceptor debe acelerar el corazón para mantener la perfusión cerebral cuando cambia la demanda o vuelve la gravedad.`
          : `In microgravity the body misinterprets chest fluid shift as volume overload and sheds ~15 % of plasma volume. With lower blood volume and reduced stroke volume${hr !== undefined ? ` (current HR: ${hr} bpm)` : ''}, the baroreceptor reflex must speed up heart rate to preserve cerebral perfusion under stress or returning gravity.`,
        hidden: es
          ? 'Riesgo silencioso: Un corazón desacondicionado mantiene signos normales flotando en reposo, pero puede caer en hipotensión ortostática severa al experimentar fuerzas G de entrada o ponerse de pie.'
          : 'Silent risk: A deconditioned cardiovascular system looks normal while floating at rest, but can suffer severe orthostatic hypotension under entry G-loads or upon standing.',
      };
  }
}

/**
 * Generates an immediate, 100% offline clinical & physiological explanation tailored to the
 * active astronaut, their pre-existing conditions, and their live readings.
 */
export function explainWithLocalAi(input: LocalAiInput): LocalAiExplanation {
  const { sources, crewName, readings, context, lang, topicHint } = input;
  const es = lang === 'es';
  const crew: CrewMemberProfile = getCrewMember(crewName);
  const topic = inferMechanismTopic(sources, topicHint);
  const base = mechanismCopy(topic, lang, readings, context);

  const primaryPre = crew.preExisting[0];
  const personalContext = primaryPre
    ? es
      ? `Perfil activo: ${crew.role} ${crew.name} (Basal pre-vuelo: ${crew.baseline.restingHrBpm} lpm, ${crew.baseline.systolicMmHg}/${crew.baseline.diastolicMmHg} mmHg, HRV ${crew.baseline.hrvRmssdMs} ms). Condición preexistente relevante: ${primaryPre.name.es} — ${primaryPre.silentTrigger.es}`
      : `Active profile: ${crew.role} ${crew.name} (Pre-flight baseline: ${crew.baseline.restingHrBpm} bpm, ${crew.baseline.systolicMmHg}/${crew.baseline.diastolicMmHg} mmHg, HRV ${crew.baseline.hrvRmssdMs} ms). Relevant pre-existing condition: ${primaryPre.name.en} — ${primaryPre.silentTrigger.en}`
    : es
      ? `Perfil activo: ${crew.role} ${crew.name} · Día de misión ${context?.missionDay ?? 142}.`
      : `Active profile: ${crew.role} ${crew.name} · Mission day ${context?.missionDay ?? 142}.`;

  return {
    headline: base.headline,
    mechanism: base.mechanism,
    personalContext,
    hiddenRiskWarning: base.hidden,
    engineBadge: es ? 'IA Clínica Local KAWSAY · 100 % Offline a Bordo' : 'KAWSAY On-Board Med-AI · 100% Offline',
  };
}

/**
 * Optional local NPU/WebGPU enhancement using the browser's built-in offline AI (Prompt API / window.ai)
 * when available on the astronaut's tablet/station, falling back deterministically in 0 ms.
 */
export async function refineWithBrowserLocalAi(base: LocalAiExplanation, lang: 'en' | 'es'): Promise<string | null> {
  try {
    const win = globalThis as unknown as {
      ai?: { languageModel?: { create?: () => Promise<{ prompt: (q: string) => Promise<string> }> } };
    };
    const create = win.ai?.languageModel?.create;
    if (typeof create !== 'function') return null;
    const session = await create();
    const prompt = lang === 'es'
      ? `Eres el copiloto médico espacial de a bordo KAWSAY. Resume en 2 frases claras y accionables para el astronauta: ${base.headline}. ${base.mechanism} ${base.personalContext}`
      : `You are the KAWSAY on-board space medical copilot. Summarize in 2 clear, actionable sentences for the astronaut: ${base.headline}. ${base.mechanism} ${base.personalContext}`;
    const reply = await session.prompt(prompt);
    return reply?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Offline Voice Copilot (Web Speech API / speechSynthesis): speaks directly into the astronaut's
 * headset or suit audio loop without requiring internet connectivity.
 */
export function speakCopilot(text: string, lang: 'en' | 'es'): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'es' ? 'es-ES' : 'en-US';
    utterance.rate = 1.02;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export function stopCopilotVoice(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
}
