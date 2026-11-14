// src/domain/indicators.ts
import { IndicatorDef, Source, BodyZone } from './types';

export const BODY_ZONES: BodyZone[] = [
  'eyes', 'brain', 'inner_ear', 'heart', 'lungs',
  'bones', 'muscles', 'kidneys', 'skin_immune', 'gut'
];

// Agrupamos las fuentes para exportarlas, como P1 espera.
export const SRC = {
  BONE: { label: 'NASA HRP Bone', url: 'https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/', official: true },
  FITNESS: { label: 'NASA HRP Fitness', url: 'https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/', official: true },
  SANS: { label: 'NASA HRP SANS', url: 'https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/', official: true },
  HYPOXIA: { label: 'NASA HRP Hypoxia', url: 'https://www.nasa.gov/reference/risk-of-hypoxia/', official: true },
  CARDIO: { label: 'NASA HRP Cardiovascular', url: 'https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/', official: true },
  IMMUNE: { label: 'NASA HRP Immune', url: 'https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/', official: true },
  STD_3001: { label: 'NASA-STD-3001 Vol 2', url: 'https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-2-rev-d-with-signature.pdf', official: true },
  PROTO: { label: 'Prototype value (not NASA)', url: 'https://www.spaceappschallenge.org/', official: false }
};

// Definimos los umbrales estrictamente para que TypeScript no de error
export interface Threshold {
  status: 'green' | 'yellow' | 'red';
  min?: number;
  max?: number;
  source: Source;
  sdFromBaseline?: number;
}

export interface ExtendedIndicatorDef extends IndicatorDef {
  thresholds: Threshold[];
}

export const INDICATOR_IDS = [
  'bp_systolic', 'bp_diastolic', 'heart_rate', 'glucose', 'body_temp', 'sleep_hours', 'mood',
  'headache_score', 'symptom_dizziness', 'symptom_vision', 'symptom_confusion', 'symptom_joint_pain', 'symptom_skin',
  'spo2', 'cabin_co2', 'exercise_min', 'water_ml', 'strength_self_pct',
];

export const INDICATORS: ExtendedIndicatorDef[] = [
  {
    id: 'bp_systolic', name: 'Systolic Blood Pressure', unit: 'mmHg', zone: 'heart', risks: ['cardio'], hazards: ['gravity'],
    input: 'number', cadence: 'daily', staleAfterHours: 24,
    howToMeasure: 'Sit still, place cuff on upper arm at heart level.',
    whyItMatters: 'Low BP increases fainting risk on return to gravity.',
    sources: [SRC.CARDIO, SRC.PROTO],
    thresholds: [
      { status: 'green', min: 100, max: 129, source: SRC.PROTO },
      { status: 'yellow', min: 90, max: 139, source: SRC.PROTO },
      { status: 'red', max: 89, source: SRC.PROTO },
      { status: 'red', min: 140, source: SRC.PROTO }
    ]
  },
  {
    id: 'bp_diastolic', name: 'Diastolic Blood Pressure', unit: 'mmHg', zone: 'heart', risks: ['cardio'], hazards: ['gravity'],
    input: 'number', cadence: 'daily', staleAfterHours: 24,
    howToMeasure: 'Measure while seated and relaxed.', whyItMatters: 'Adaptation to microgravity.',
    sources: [SRC.CARDIO, SRC.PROTO],
    thresholds: [
      { status: 'green', min: 60, max: 84, source: SRC.PROTO },
      { status: 'yellow', min: 50, max: 89, source: SRC.PROTO },
      { status: 'red', max: 49, source: SRC.PROTO },
      { status: 'red', min: 90, source: SRC.PROTO }
    ]
  },
  {
    id: 'heart_rate', name: 'Resting Heart Rate', unit: 'bpm', zone: 'heart', risks: ['cardio', 'fitness'], hazards: ['gravity'],
    input: 'number', cadence: 'daily', staleAfterHours: 24,
    howToMeasure: 'Use Bio-Monitor while resting.', whyItMatters: 'Signals cardiovascular stress.',
    sources: [SRC.CARDIO, SRC.PROTO],
    thresholds: [
      { status: 'green', min: 50, max: 90, source: SRC.PROTO },
      { status: 'yellow', min: 40, max: 110, source: SRC.PROTO },
      { status: 'red', max: 39, source: SRC.PROTO },
      { status: 'red', min: 111, source: SRC.PROTO }
    ]
  },
  {
    id: 'glucose', name: 'Fasting Blood Glucose', unit: 'mg/dL', zone: 'gut', risks: ['nutrition'], hazards: ['environment'],
    input: 'number', cadence: 'daily', staleAfterHours: 24,
    howToMeasure: 'Fingerstick before first meal.', whyItMatters: 'Metabolic response.',
    sources: [SRC.PROTO],
    thresholds: [
      { status: 'green', min: 70, max: 99, source: SRC.PROTO },
      { status: 'yellow', min: 60, max: 125, source: SRC.PROTO },
      { status: 'red', max: 59, source: SRC.PROTO },
      { status: 'red', min: 126, source: SRC.PROTO }
    ]
  },
  {
    id: 'body_temp', name: 'Core Body Temperature', unit: '°C', zone: 'skin_immune', risks: ['immune'], hazards: ['environment'],
    input: 'number', cadence: 'daily', staleAfterHours: 24,
    howToMeasure: 'Temporal thermometer.', whyItMatters: 'Early warning for infections.',
    sources: [SRC.IMMUNE, SRC.PROTO],
    thresholds: [
      { status: 'green', min: 36.1, max: 37.5, source: SRC.PROTO },
      { status: 'yellow', min: 35.5, max: 38.0, source: SRC.PROTO },
      { status: 'red', max: 35.4, source: SRC.PROTO },
      { status: 'red', min: 38.1, source: SRC.PROTO }
    ]
  },
  {
    id: 'sleep_hours', name: 'Sleep Duration', unit: 'hours', zone: 'brain', risks: ['sleep', 'behavioral'], hazards: ['isolation'],
    input: 'number', cadence: 'daily', staleAfterHours: 24,
    howToMeasure: 'Record total sleep time.', whyItMatters: 'Impairs cognitive performance.',
    sources: [SRC.PROTO],
    thresholds: [
      { status: 'green', min: 7, source: SRC.PROTO },
      { status: 'yellow', min: 5.5, max: 6.9, source: SRC.PROTO },
      { status: 'red', max: 5.4, source: SRC.PROTO }
    ]
  },
  {
    id: 'mood', name: 'Mood', unit: 'scale 1-5', zone: 'brain', risks: ['behavioral'], hazards: ['isolation'],
    input: 'scale_1_5', cadence: 'daily', staleAfterHours: 24,
    howToMeasure: 'Rate overall mood.', whyItMatters: 'Isolation affects behavioral health.',
    sources: [SRC.PROTO],
    thresholds: [
      { status: 'green', min: 4, max: 5, source: SRC.PROTO },
      { status: 'yellow', min: 3, max: 3, source: SRC.PROTO },
      { status: 'red', min: 1, max: 2, source: SRC.PROTO }
    ]
  },
  {
    id: 'headache_score', name: 'Headache Severity', unit: 'scale 1-5', zone: 'brain', risks: ['hypoxia', 'sans'], hazards: ['environment'],
    input: 'scale_1_5', cadence: 'daily', staleAfterHours: 24,
    howToMeasure: 'Rate headache.', whyItMatters: 'Early symptom of CO2 or SANS.',
    sources: [SRC.HYPOXIA, SRC.PROTO],
    thresholds: [
      { status: 'green', min: 1, max: 1, source: SRC.PROTO },
      { status: 'yellow', min: 2, max: 3, source: SRC.PROTO },
      { status: 'red', min: 4, max: 5, source: SRC.PROTO }
    ]
  },
  {
    id: 'symptom_dizziness', name: 'Dizziness', unit: 'scale 1-5', zone: 'inner_ear', risks: ['sensorimotor'], hazards: ['gravity'],
    input: 'scale_1_5', cadence: 'daily', staleAfterHours: 24,
    howToMeasure: 'Rate dizziness.', whyItMatters: 'Inner ear disturbances.',
    sources: [SRC.PROTO],
    thresholds: [
      { status: 'green', min: 1, max: 1, source: SRC.PROTO },
      { status: 'yellow', min: 2, max: 3, source: SRC.PROTO },
      { status: 'red', min: 4, max: 5, source: SRC.PROTO }
    ]
  },
  {
    id: 'symptom_vision', name: 'Vision Distortion', unit: 'boolean', zone: 'eyes', risks: ['sans'], hazards: ['gravity'],
    input: 'boolean', cadence: 'weekly', staleAfterHours: 168,
    howToMeasure: 'Amsler grid test.', whyItMatters: 'SANS affects ~70% of ISS crew.',
    sources: [SRC.SANS],
    thresholds: [
      { status: 'green', min: 0, max: 0, source: SRC.SANS },
      { status: 'red', min: 1, max: 1, source: SRC.SANS }
    ]
  },
  {
    id: 'symptom_confusion', name: 'Confusion', unit: 'boolean', zone: 'brain', risks: ['hypoxia'], hazards: ['environment'],
    input: 'boolean', cadence: 'daily', staleAfterHours: 24,
    howToMeasure: 'Report if feeling confused.', whyItMatters: 'Hypoxia symptom.',
    sources: [SRC.HYPOXIA],
    thresholds: [
      { status: 'green', min: 0, max: 0, source: SRC.HYPOXIA },
      { status: 'red', min: 1, max: 1, source: SRC.HYPOXIA }
    ]
  },
  {
    id: 'symptom_joint_pain', name: 'Joint Pain', unit: 'boolean', zone: 'bones', risks: ['dcs'], hazards: ['environment'],
    input: 'boolean', cadence: 'per_event', staleAfterHours: 1,
    howToMeasure: 'Report joint pain during EVA.', whyItMatters: 'DCS symptom.',
    sources: [SRC.PROTO],
    thresholds: [
      { status: 'green', min: 0, max: 0, source: SRC.PROTO },
      { status: 'red', min: 1, max: 1, source: SRC.PROTO }
    ]
  },
  {
    id: 'symptom_skin', name: 'Skin Lesion', unit: 'boolean', zone: 'skin_immune', risks: ['immune', 'microbes'], hazards: ['environment'],
    input: 'boolean', cadence: 'daily', staleAfterHours: 24,
    howToMeasure: 'Check for rashes or cold sores.', whyItMatters: 'Immune reactivation.',
    sources: [SRC.IMMUNE],
    thresholds: [
      { status: 'green', min: 0, max: 0, source: SRC.IMMUNE },
      { status: 'yellow', min: 1, max: 1, source: SRC.IMMUNE }
    ]
  },
  {
    id: 'spo2', name: 'SpO2', unit: '%', zone: 'lungs', risks: ['hypoxia'], hazards: ['environment'],
    input: 'number', cadence: 'daily', staleAfterHours: 24,
    howToMeasure: 'Pulse oximeter.', whyItMatters: 'Hypoxia warning.',
    sources: [SRC.HYPOXIA, SRC.PROTO],
    thresholds: [
      { status: 'green', min: 95, source: SRC.PROTO },
      { status: 'yellow', min: 92, max: 94, source: SRC.PROTO },
      { status: 'red', max: 91, source: SRC.PROTO }
    ]
  },
  {
    id: 'cabin_co2', name: 'Cabin CO2', unit: 'mmHg', zone: 'lungs', risks: ['hypoxia'], hazards: ['environment'],
    input: 'number', cadence: 'daily', staleAfterHours: 1,
    howToMeasure: 'Check life support panel.', whyItMatters: 'High CO2 causes cognitive impairment.',
    sources: [SRC.STD_3001],
    thresholds: [
      { status: 'green', max: 2.4, source: SRC.STD_3001 },
      { status: 'yellow', min: 3, max: 3, source: SRC.STD_3001 }, 
      { status: 'red', min: 3.1, source: SRC.PROTO } 
    ]
  },
  {
    id: 'exercise_min', name: 'Daily Exercise', unit: 'min', zone: 'muscles', risks: ['fitness', 'bone'], hazards: ['gravity'],
    input: 'number', cadence: 'daily', staleAfterHours: 24,
    howToMeasure: 'Log exercise time.', whyItMatters: 'Prevents bone and muscle loss.',
    sources: [SRC.FITNESS],
    thresholds: [
      { status: 'green', min: 90, source: SRC.FITNESS },
      { status: 'yellow', min: 60, max: 89, source: SRC.PROTO },
      { status: 'red', max: 59, source: SRC.PROTO }
    ]
  },
  {
    id: 'water_ml', name: 'Hydration', unit: 'ml', zone: 'kidneys', risks: ['bone'], hazards: ['gravity'],
    input: 'number', cadence: 'daily', staleAfterHours: 24,
    howToMeasure: 'Log water intake.', whyItMatters: 'Prevents kidney stones.',
    sources: [SRC.PROTO],
    thresholds: [
      { status: 'green', min: 2000, source: SRC.PROTO },
      { status: 'yellow', min: 1500, max: 1999, source: SRC.PROTO },
      { status: 'red', max: 1499, source: SRC.PROTO }
    ]
  },
  {
    id: 'strength_self_pct', name: 'Fitness Self-Eval', unit: '%', zone: 'muscles', risks: ['fitness'], hazards: ['gravity'],
    input: 'number', cadence: 'weekly', staleAfterHours: 168,
    howToMeasure: 'Rate strength vs pre-flight.', whyItMatters: 'Crew loses 10-12% fitness.',
    sources: [SRC.FITNESS],
    thresholds: [
      { status: 'green', min: 90, source: SRC.FITNESS },
      { status: 'yellow', min: 80, max: 89, source: SRC.PROTO },
      { status: 'red', max: 79, source: SRC.PROTO }
    ]
  }
];

export function getIndicator(id: string): ExtendedIndicatorDef | undefined {
  return INDICATORS.find((i) => i.id === id);
}
