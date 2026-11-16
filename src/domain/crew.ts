/**
 * Multi-Crew Profiles (4 Astronauts), Pre-existing Conditions & Silent Spaceflight Risk Engine.
 * Designed for 4-crew deep-space missions (Orion / Gateway / Mars Transit) where each crew
 * member has distinct pre-flight baselines, latent pre-existing susceptibilities, and silent
 * in-flight conditions that would otherwise go unnoticed until a life-threatening crisis.
 */
import type { BodyZone, MissionContext, Reading, Status } from './types';

export type CrewRole = 'CDR' | 'PLT' | 'CMO' | 'MS';

export interface PreExistingCondition {
  id: string;
  name: { en: string; es: string };
  category: 'cardiovascular' | 'renal_bone' | 'neuro_ocular' | 'immunological' | 'vascular_thrombotic';
  clinicalNote: { en: string; es: string };
  silentTrigger: { en: string; es: string };
}

export interface SilentRiskAlert {
  id: string;
  crewId: string;
  status: 'yellow' | 'red';
  zone: BodyZone;
  title: { en: string; es: string };
  whyUnnoticed: { en: string; es: string };
  physiologicalMechanism: { en: string; es: string };
  preventiveAction: { en: string; es: string };
  metricLabel: string;
  metricValue: string;
}

export interface AdvancedSpaceIndicator {
  id: 'hrv_rmssd' | 'radiation_msv' | 'urine_hydration' | 'ijv_flow_score' | 'pvt_reaction_ms';
  name: { en: string; es: string };
  unit: string;
  zone: BodyZone;
  watchThreshold: string;
  actThreshold: string;
  silentDiseaseCaught: { en: string; es: string };
}

export interface CrewMemberProfile {
  id: string;
  role: CrewRole;
  roleTitle: { en: string; es: string };
  name: string;
  age: number;
  callsign: string;
  assignedDevice: string;
  baseline: {
    restingHrBpm: number;
    systolicMmHg: number;
    diastolicMmHg: number;
    hrvRmssdMs: number;
    weightKg: number;
  };
  preExisting: PreExistingCondition[];
  advancedMetrics: {
    hrv_rmssd: number;
    radiation_msv: number;
    urine_hydration: number;
    ijv_flow_score: number;
    pvt_reaction_ms: number;
  };
  /** Delta applied to the seeded history when switching to this crew member so each has distinct physiology. */
  readingOffsets: Partial<Record<string, number>>;
}

export const ADVANCED_SPACE_INDICATORS: readonly AdvancedSpaceIndicator[] = [
  {
    id: 'hrv_rmssd',
    name: { en: 'Heart Rate Variability (HRV RMSSD)', es: 'Variabilidad Cardíaca (HRV RMSSD)' },
    unit: 'ms',
    zone: 'heart',
    watchThreshold: '< 32 ms',
    actThreshold: '< 22 ms',
    silentDiseaseCaught: {
      en: 'Detects subclinical infection/sepsis and autonomic exhaustion 24–48 h before fever appears.',
      es: 'Detecta infección/sepsis subclínica y agotamiento autonómico 24–48 h antes de que aparezca fiebre.',
    },
  },
  {
    id: 'radiation_msv',
    name: { en: 'Personal Radiation Dose Rate', es: 'Tasa de Dosis de Radiación Personal' },
    unit: 'mSv/d',
    zone: 'skin_immune',
    watchThreshold: '≥ 1.5 mSv/d',
    actThreshold: '≥ 5.0 mSv/d',
    silentDiseaseCaught: {
      en: 'Catches Solar Particle Event (SPE) surges and prodromal hematopoietic suppression.',
      es: 'Detecta picos de Tormentas Solares (SPE) y supresión hematopoyética/inmune prodromal.',
    },
  },
  {
    id: 'urine_hydration',
    name: { en: 'Urinary Specific Gravity / Calcium Saturation', es: 'Densidad Urinaria / Saturación Cálcica' },
    unit: '1–5',
    zone: 'kidneys',
    watchThreshold: '≥ 3 / 5',
    actThreshold: '≥ 4 / 5',
    silentDiseaseCaught: {
      en: 'Catches silent calcium-oxalate crystallization and urinary retention before renal colic.',
      es: 'Detecta cristalización silenciosa de oxalato de calcio y retención urinaria antes del cólico renal.',
    },
  },
  {
    id: 'ijv_flow_score',
    name: { en: 'Internal Jugular Vein (IJV) Stagnation Index', es: 'Índice de Estasis Venosa Yugular Interna (IJV)' },
    unit: '1–5',
    zone: 'heart',
    watchThreshold: '≥ 3 / 5',
    actThreshold: '≥ 4 / 5',
    silentDiseaseCaught: {
      en: 'Screens for asymptomatic Internal Jugular Vein (IJV) thrombosis caused by 0 g cephalad fluid stasis.',
      es: 'Cribado de Trombosis Venosa Yugular Interna (IJV) asintomática por estasis cefálica de sangre en 0 g.',
    },
  },
  {
    id: 'pvt_reaction_ms',
    name: { en: 'Psychomotor Vigilance (PVT Reaction Time)', es: 'Vigilancia Psicomotora (Tiempo de Reacción PVT)' },
    unit: 'ms',
    zone: 'brain',
    watchThreshold: '≥ 340 ms',
    actThreshold: '≥ 420 ms',
    silentDiseaseCaught: {
      en: 'Objectively catches silent CO₂ narcosis, mild hypoxia and microsleeps when the astronaut feels fine.',
      es: 'Detecta objetivamente narcosis silenciosa por CO₂, hipoxia leve y microsueños cuando el astronauta cree estar bien.',
    },
  },
] as const;

export const CREW_ROSTER: readonly CrewMemberProfile[] = [
  {
    id: 'quispe',
    role: 'CDR',
    roleTitle: { en: 'Mission Commander (CDR)', es: 'Comandante de Misión (CDR)' },
    name: 'A. Quispe',
    age: 38,
    callsign: 'Inti-CDR',
    assignedDevice: 'Huawei Band 8 (BLE 0x180D) + Tablet CDR',
    baseline: { restingHrBpm: 56, systolicMmHg: 112, diastolicMmHg: 70, hrvRmssdMs: 58, weightKg: 66 },
    preExisting: [
      {
        id: 'ortho_borderline',
        name: {
          en: 'Pre-existing borderline orthostatic intolerance & low baroreflex gain',
          es: 'Intolerancia ortostática limítrofe preexistente y baja ganancia barorrefleja',
        },
        category: 'cardiovascular',
        clinicalNote: {
          en: 'Pre-flight tilt-table test showed a +26 bpm heart-rate jump and −14 mmHg systolic dip.',
          es: 'La mesa basculante pre-vuelo mostró un salto de +26 lpm y caída sistólica de −14 mmHg.',
        },
        silentTrigger: {
          en: 'Plasma volume loss in 0 g silently compounds with incomplete ARED exercise, risking syncope on landing.',
          es: 'La pérdida de volumen plasmático en 0 g se suma silenciosamente al déficit de ejercicio ARED, arriesgando síncope al aterrizar.',
        },
      },
      {
        id: 'latent_herpes_vzv',
        name: {
          en: 'Latent HSV-1 / Varicella-Zoster (VZV) seropositivity',
          es: 'Portadora latente de HSV-1 / Varicela-Zóster (VZV)',
        },
        category: 'immunological',
        clinicalNote: {
          en: 'Dormant viral carrier; T-cell down-regulation in spaceflight triggers subclinical shedding.',
          es: 'Portadora viral latente; la inmunosupresión de linfocitos T en el espacio reactiva el virus sin síntomas iniciales.',
        },
        silentTrigger: {
          en: 'HRV drop + sleep < 6 h + radiation stress triggers viral reactivation 48 h before skin lesions appear.',
          es: 'Caída de HRV + sueño < 6 h + estrés por radiación reactiva el virus 48 h antes de que aparezcan lesiones en piel.',
        },
      },
    ],
    advancedMetrics: { hrv_rmssd: 28, radiation_msv: 1.2, urine_hydration: 3, ijv_flow_score: 2, pvt_reaction_ms: 355 },
    readingOffsets: {},
  },
  {
    id: 'vance',
    role: 'PLT',
    roleTitle: { en: 'Spacecraft Pilot (PLT)', es: 'Piloto de Nave (PLT)' },
    name: 'M. Vance',
    age: 35,
    callsign: 'Inti-PLT',
    assignedDevice: 'Garmin Enduro BLE + HUD Puesto de Pilotaje',
    baseline: { restingHrBpm: 62, systolicMmHg: 118, diastolicMmHg: 76, hrvRmssdMs: 52, weightKg: 78 },
    preExisting: [
      {
        id: 'sans_choroidal',
        name: {
          en: 'Pre-existing optic nerve head crowding & SANS susceptibility (B6/folate polymorphism)',
          es: 'Apiñamiento de papila óptica preexistente y susceptibilidad a SANS (polimorfismo folato/B6)',
        },
        category: 'neuro_ocular',
        clinicalNote: {
          en: 'Prior 30-day analog study showed +0.50 D hyperopic shift and mild choroidal folds.',
          es: 'Estudio previo mostró desplazamiento hipermetrópico de +0,50 D y pliegues coroideos leves.',
        },
        silentTrigger: {
          en: 'Cabin CO₂ > 3 mmHg dilates cerebral vessels, silently raising intracranial pressure on the optic nerve.',
          es: 'El CO₂ de cabina > 3 mmHg dilata los vasos cerebrales, elevando silenciosamente la presión intracraneal sobre el nervio óptico.',
        },
      },
    ],
    advancedMetrics: { hrv_rmssd: 44, radiation_msv: 1.1, urine_hydration: 2, ijv_flow_score: 3, pvt_reaction_ms: 390 },
    readingOffsets: { bp_systolic: 8, bp_diastolic: 5, heart_rate: 6, symptom_vision: 1, water_ml: 350, exercise_min: 15 },
  },
  {
    id: 'lin',
    role: 'CMO',
    roleTitle: { en: 'Crew Medical Officer (CMO)', es: 'Oficial Médico de Tripulación (CMO)' },
    name: 'Dra. S. Lin',
    age: 41,
    callsign: 'Inti-CMO',
    assignedDevice: 'Empatica EmbracePlus + Consola Médica SSC',
    baseline: { restingHrBpm: 64, systolicMmHg: 110, diastolicMmHg: 68, hrvRmssdMs: 60, weightKg: 59 },
    preExisting: [
      {
        id: 'hypercalciuria_renal',
        name: {
          en: 'Familial absorptive hypercalciuria & hypocitraturia (Renal stone predisposition)',
          es: 'Hipercalciuria absortiva familiar e hipocitraturia (Predisposición a litiasis renal)',
        },
        category: 'renal_bone',
        clinicalNote: {
          en: 'Requires > 2.5 L/day hydration and potassium citrate prophylaxis during microgravity bone resorption.',
          es: 'Requiere hidratación > 2,5 L/día y citrato de potasio profiláctico durante la resorción ósea en microgravedad.',
        },
        silentTrigger: {
          en: 'Bone calcium loss (1.2%/month) + urine concentration ≥ 4/5 forms silent micro-calculi before flank pain.',
          es: 'La pérdida de calcio óseo (1,2 %/mes) + orina concentrada ≥ 4/5 forma microcálculos silenciosos antes del dolor lumbar.',
        },
      },
    ],
    advancedMetrics: { hrv_rmssd: 51, radiation_msv: 1.0, urine_hydration: 4, ijv_flow_score: 1, pvt_reaction_ms: 285 },
    readingOffsets: { water_ml: -250, sleep_hours: 1.2, mood: 1, headache_score: -1 },
  },
  {
    id: 'okafor',
    role: 'MS',
    roleTitle: { en: 'Mission Specialist & EVA Lead (MS)', es: 'Especialista de Misión y Líder EVA (MS)' },
    name: 'K. Okafor',
    age: 33,
    callsign: 'Inti-EVA',
    assignedDevice: 'Camiseta Bio-Monitor CSA + HUD Traje EVA',
    baseline: { restingHrBpm: 49, systolicMmHg: 122, diastolicMmHg: 74, hrvRmssdMs: 70, weightKg: 84 },
    preExisting: [
      {
        id: 'ijv_stasis_thrombosis',
        name: {
          en: 'Sluggish left Internal Jugular Vein (IJV) valve flow in head-down tilt',
          es: 'Flujo valvular lento en Vena Yugular Interna (IJV) izquierda en inclinación cefálica',
        },
        category: 'vascular_thrombotic',
        clinicalNote: {
          en: 'Susceptible to 0 g venous blood stagnation in the neck (ISS 2019 asymptomatic IJV thrombus pattern).',
          es: 'Susceptible a estancamiento venoso cervical en 0 g (patrón real de trombosis yugular asintomática en la ISS 2019).',
        },
        silentTrigger: {
          en: 'Cephalad fluid shift + dehydration thickens blood viscosity, risking a completely painless neck vein clot.',
          es: 'El desplazamiento cefálico de fluidos + deshidratación aumenta la viscosidad sanguínea, arriesgando un coágulo yugular totalmente indoloro.',
        },
      },
    ],
    advancedMetrics: { hrv_rmssd: 56, radiation_msv: 1.9, urine_hydration: 3, ijv_flow_score: 4, pvt_reaction_ms: 310 },
    readingOffsets: { heart_rate: -8, exercise_min: 25, sleep_hours: 0.8, water_ml: -150 },
  },
] as const;

export function getCrewMember(idOrName?: string): CrewMemberProfile {
  if (!idOrName) return CREW_ROSTER[0];
  return (
    CREW_ROSTER.find((c) => c.id === idOrName || c.name.toLowerCase() === idOrName.toLowerCase()) ??
    CREW_ROSTER[0]
  );
}

/**
 * Generates a crew-specific reading history from the base mission readings so each of the 4
 * astronauts has their own distinct physiological trajectory without corrupting another's baseline.
 */
export function buildCrewReadings(baseReadings: Reading[], crew: CrewMemberProfile): Reading[] {
  if (crew.id === 'quispe') return baseReadings;
  return baseReadings.map((r) => {
    const delta = crew.readingOffsets[r.indicatorId];
    if (delta === undefined) return r;
    let next = r.value + delta;
    if (r.indicatorId === 'mood' || r.indicatorId === 'headache_score') next = Math.max(1, Math.min(5, Math.round(next)));
    if (r.indicatorId.startsWith('symptom_')) next = next >= 1 ? 1 : 0;
    if (r.indicatorId === 'water_ml') next = Math.max(800, Math.round(next));
    if (r.indicatorId === 'exercise_min') next = Math.max(0, Math.min(120, Math.round(next)));
    if (r.indicatorId === 'sleep_hours') next = Math.max(3.5, Math.min(9, Math.round(next * 10) / 10));
    return { ...r, value: next };
  });
}

/**
 * Evaluates silent in-flight and pre-existing complications that an astronaut would NEVER notice
 * on their own until an acute emergency occurs.
 */
export function evaluateSilentSpaceRisks(
  crew: CrewMemberProfile,
  readings: Reading[],
  ctx: MissionContext,
  liveHrvMs?: number | null,
): SilentRiskAlert[] {
  const alerts: SilentRiskAlert[] = [];
  const hrv = liveHrvMs ?? crew.advancedMetrics.hrv_rmssd;
  const hrvDropPct = Math.round(((crew.baseline.hrvRmssdMs - hrv) / crew.baseline.hrvRmssdMs) * 100);

  const latestVal = (id: string): number | undefined => {
    let best: Reading | undefined;
    for (const r of readings) if (r.indicatorId === id && (!best || r.ts > best.ts)) best = r;
    return best?.value;
  };

  const co2 = latestVal('cabin_co2') ?? 2.6;
  const water = latestVal('water_ml') ?? 1800;

  // 1. Autonomic / Pre-symptomatic Viral Reactivation or Subclinical Sepsis (HRV drop > 35%)
  if (hrv < 32 || hrvDropPct >= 35) {
    alerts.push({
      id: `silent.hrv_autonomic.${crew.id}`,
      crewId: crew.id,
      status: hrv < 22 ? 'red' : 'yellow',
      zone: 'skin_immune',
      title: {
        en: 'Silent autonomic drop & latent viral reactivation risk',
        es: 'Caída autonómica silenciosa y riesgo de reactivación viral latente',
      },
      whyUnnoticed: {
        en: 'Body temperature is still normal (no fever yet). Without HRV RMSSD tracking, you feel only mild fatigue while T-cell immunity drops.',
        es: 'Tu temperatura corporal aún es normal (sin fiebre). Sin vigilar la caída de HRV RMSSD, solo sientes cansancio leve mientras tu inmunidad celular cae.',
      },
      physiologicalMechanism: {
        en: `HRV RMSSD dropped to ${hrv} ms (−${hrvDropPct}% vs your ${crew.baseline.hrvRmssdMs} ms pre-flight baseline). In microgravity, vagal withdrawal and cortisol surges precede HSV-1/VZV reactivation or subclinical infection by 24–48 hours.`,
        es: `Tu HRV RMSSD cayó a ${hrv} ms (−${hrvDropPct}% respecto a tu basal pre-vuelo de ${crew.baseline.hrvRmssdMs} ms). En microgravedad, la retirada vagal y el alza de cortisol anteceden en 24–48 horas a la reactivación de Herpes/VZV o una infección subclínica.`,
      },
      preventiveAction: {
        en: 'Start prophylactic rest window (+1 h sleep), check oral mucosa/skin, and avoid high-intensity EVA workload today.',
        es: 'Inicia ventana de descanso profiláctico (+1 h de sueño), revisa mucosa oral/piel y evita sobrecarga metabólica EVA hoy.',
      },
      metricLabel: 'HRV RMSSD',
      metricValue: `${hrv} ms (−${hrvDropPct}%)`,
    });
  }

  // 2. Asymptomatic Internal Jugular Vein (IJV) Stasis / Thrombosis Risk
  if (crew.advancedMetrics.ijv_flow_score >= 4) {
    alerts.push({
      id: `silent.ijv_thrombus.${crew.id}`,
      crewId: crew.id,
      status: 'red',
      zone: 'heart',
      title: {
        en: 'Asymptomatic Internal Jugular Vein (IJV) blood stasis alert',
        es: 'Alerta de estasis venosa silenciosa en Vena Yugular Interna (IJV)',
      },
      whyUnnoticed: {
        en: 'Jugular vein clots in 0 g produce ZERO pain or swelling because head/neck fullness feels "normal" in weightlessness.',
        es: 'Los coágulos en la vena yugular en 0 g producen CERO dolor porque la congestión facial/cervical se siente "normal" en ingravidez.',
      },
      physiologicalMechanism: {
        en: `Pre-existing sluggish left IJV valve flow (index ${crew.advancedMetrics.ijv_flow_score}/5) combined with ${ctx.missionDay} days of cephalad fluid shift and ${water} mL water intake increases blood viscosity and turbulent venous stasis.`,
        es: `Tu flujo valvular yugular lento preexistente (índice ${crew.advancedMetrics.ijv_flow_score}/5) sumado a ${ctx.missionDay} días de desplazamiento cefálico de fluidos e ingesta de ${water} mL eleva la viscosidad sanguínea y el riesgo de trombo mural.`,
      },
      preventiveAction: {
        en: 'Have the Crew Medical Officer (Dra. Lin) perform a 5-minute portable neck Doppler ultrasound and use Lower Body Negative Pressure (LBNP).',
        es: 'Solicita a la Oficial Médico (Dra. Lin) una ecografía Doppler cervical portátil de 5 min y aplica sesión de presión negativa en tren inferior (LBNP).',
      },
      metricLabel: 'IJV Stasis',
      metricValue: `${crew.advancedMetrics.ijv_flow_score}/5`,
    });
  }

  // 3. Silent Calcium-Oxalate Micro-Crystallization (Pre-existing hypercalciuria + bone resorption)
  if (crew.advancedMetrics.urine_hydration >= 4 && ctx.missionDay >= 30) {
    alerts.push({
      id: `silent.renal_crystalluria.${crew.id}`,
      crewId: crew.id,
      status: 'yellow',
      zone: 'kidneys',
      title: {
        en: 'Silent renal calcium-oxalate supersaturation',
        es: 'Sobresaturación silenciosa de oxalato de calcio renal',
      },
      whyUnnoticed: {
        en: 'Kidney stones form silently over weeks in microgravity; you feel nothing until a stone blocks the ureter during an EVA or entry.',
        es: 'Los cálculos renales se forman en silencio durante semanas en microgravedad; no sientes nada hasta que el cálculo obstruye el uréter en plena misión.',
      },
      physiologicalMechanism: {
        en: `Your pre-existing hypercalciuria + mission day ${ctx.missionDay} osteoclastic calcium release + concentrated urine (${crew.advancedMetrics.urine_hydration}/5) creates a supersaturated urinary environment.`,
        es: `Tu hipercalciuria preexistente + la liberación de calcio óseo del día ${ctx.missionDay} + orina concentrada (${crew.advancedMetrics.urine_hydration}/5) genera sobresaturación cristalina en la pelvis renal.`,
      },
      preventiveAction: {
        en: 'Take scheduled potassium citrate dose now and drink 500 mL water over the next 90 minutes.',
        es: 'Toma ahora la dosis pautada de citrato de potasio y bebe 500 mL de agua en los próximos 90 minutos.',
      },
      metricLabel: 'Urine Conc.',
      metricValue: `${crew.advancedMetrics.urine_hydration}/5`,
    });
  }

  // 4. Silent SANS Neuro-Ocular & Cognitive CO2 Drift
  if (crew.advancedMetrics.pvt_reaction_ms >= 350 || (crew.id === 'vance' && co2 > 3.0)) {
    alerts.push({
      id: `silent.sans_co2_pvt.${crew.id}`,
      crewId: crew.id,
      status: crew.advancedMetrics.pvt_reaction_ms >= 410 ? 'red' : 'yellow',
      zone: 'eyes',
      title: {
        en: 'Silent neuro-ocular (SANS) & CO₂ psychomotor slowing',
        es: 'Presión neuro-ocular (SANS) silenciosa y enlentecimiento psicomotor por CO₂',
      },
      whyUnnoticed: {
        en: 'Mild hypercapnia and optic disc swelling impair reaction time and contrast sensitivity before you notice blurry vision or confusion.',
        es: 'La hipercapnia leve y el edema de papila degradan tu tiempo de reacción en milisegundos mucho antes de que notes visión borrosa o confusión.',
      },
      physiologicalMechanism: {
        en: `PVT reaction time is ${crew.advancedMetrics.pvt_reaction_ms} ms (threshold 340 ms) with pre-existing choroidal crowding. Elevated CO₂ (${co2.toFixed(1)} mmHg) causes cerebral vasodilation, increasing intracranial pressure behind the retina.`,
        es: `Tu tiempo de reacción PVT es ${crew.advancedMetrics.pvt_reaction_ms} ms (umbral 340 ms) con susceptibilidad coroidea SANS. El CO₂ elevado (${co2.toFixed(1)} mmHg) causa vasodilatación cerebral, subiendo la presión intracraneal detrás de la retina.`,
      },
      preventiveAction: {
        en: 'Run 60-second Amsler grid check, increase local fan airflow at pilot station, and avoid precision docking maneuvers until PVT < 330 ms.',
        es: 'Realiza test de rejilla de Amsler de 60 s, aumenta ventilación local en el puesto de pilotaje y evita maniobras críticas hasta bajar PVT < 330 ms.',
      },
      metricLabel: 'PVT / SANS',
      metricValue: `${crew.advancedMetrics.pvt_reaction_ms} ms`,
    });
  }

  return alerts;
}

export interface CohortInsight {
  id: string;
  status: Status;
  title: { en: string; es: string };
  detail: { en: string; es: string };
  affectedCrew: string[];
}

/**
 * Cross-checks all 4 astronauts simultaneously to distinguish an individual medical issue from
 * a shared spacecraft habitat failure (e.g., ECLSS CO₂ scrubber drift or radiation pass).
 */
export function analyzeCrewCohort(readings: Reading[], ctx: MissionContext): CohortInsight {
  const co2Readings = readings.filter((r) => r.indicatorId === 'cabin_co2');
  const latestCo2 = co2Readings.length ? co2Readings[co2Readings.length - 1].value : 2.6;

  if (latestCo2 > 3.0) {
    return {
      id: 'cohort.shared_co2',
      status: latestCo2 >= 5 ? 'red' : 'yellow',
      title: {
        en: `Shared Habitat Alert: Cabin CO₂ (${latestCo2.toFixed(1)} mmHg) is affecting all 4 crew members`,
        es: `Alerta Ambiental Compartida: El CO₂ de cabina (${latestCo2.toFixed(1)} mmHg) afecta a los 4 astronautas`,
      },
      detail: {
        en: 'Because all 4 astronauts share the same ECLSS air loop, CDR Quispe’s headache and PLT Vance’s SANS/PVT slowing stem from the same environmental root cause: inspect the CDRA CO₂ scrubber bed.',
        es: 'Dado que los 4 astronautas comparten el mismo circuito de aire ECLSS, la cefalea de CDR Quispe y el enlentecimiento visual/PVT de PLT Vance tienen una raíz ambiental común: revisar el filtro depurador de CO₂ (CDRA).',
      },
      affectedCrew: ['CDR A. Quispe', 'PLT M. Vance', 'CMO Dra. S. Lin', 'MS K. Okafor'],
    };
  }

  return {
    id: 'cohort.nominal_habitat',
    status: 'green',
    title: {
      en: `4-Crew Cohort Triage · Day ${ctx.missionDay}: Habitat air nominal, individual silent monitors active`,
      es: `Triage de Escuadrón (4 Astronautas) · Día ${ctx.missionDay}: Aire de cabina normal, vigilancia individual activa`,
    },
    detail: {
      en: 'Each crew member’s personal baseline and pre-existing conditions are isolated. Switching crew profiles loads their individual history and silent risk checks.',
      es: 'La línea base y las condiciones preexistentes de cada astronauta están aisladas. Cambiar de perfil carga su historial individual y sus alertas silenciosas.',
    },
    affectedCrew: ['CDR A. Quispe', 'PLT M. Vance', 'CMO Dra. S. Lin', 'MS K. Okafor'],
  };
}
