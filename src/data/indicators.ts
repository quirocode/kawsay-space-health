// src/data/indicators.ts
import { IndicatorDef } from '../domain/types';

/**
 * KAWSAY — Indicator Definitions (P3 Science Engine)
 * 18 indicators mapped to NASA HRP risks and body zones.
 * Source rule: official=true only for NASA-published figures.
 */

const SRC_BONE: Source = { label: 'NASA HRP Bone', url: 'https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/', official: true };
const SRC_FITNESS: Source = { label: 'NASA HRP Fitness', url: 'https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/', official: true };
const SRC_SANS: Source = { label: 'NASA HRP SANS', url: 'https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/', official: true };
const SRC_DELAY: Source = { label: 'NASA HRP Distance from Earth', url: 'https://www.nasa.gov/hrp/hazard-distance-from-earth/', official: true };
const SRC_HYPOXIA: Source = { label: 'NASA HRP Hypoxia', url: 'https://www.nasa.gov/reference/risk-of-hypoxia/', official: true };
const SRC_DCS: Source = { label: 'NASA HRP DCS', url: 'https://www.nasa.gov/reference/risk-of-decompression-sickness/', official: true };
const SRC_CARDIO: Source = { label: 'NASA HRP Cardiovascular', url: 'https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/', official: true };
const SRC_IMMUNE: Source = { label: 'NASA HRP Immune', url: 'https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/', official: true };
const SRC_KIDNEY: Source = { label: 'NASA HRP Gravity (Kidney)', url: 'https://www.nasa.gov/hrp/hazard-gravity-fields/', official: true };
const SRC_STD_3001: Source = { label: 'NASA-STD-3001 Vol 2', url: '', official: true }; // TODO verify (P5)

const SRC_PROTO: Source = { label: 'Prototype value (not NASA)', url: '', official: false };

export const INDICATORS: IndicatorDef[] = [
  // ── 1. The 6 Official Challenge Indicators + CO2 ────────────────────────────
  {
    id: 'bp_systolic',
    name: 'Systolic Blood Pressure',
    unit: 'mmHg',
    zone: 'heart',
    risks: ['cardio'],
    hazards: ['gravity'],
    input: 'number',
    cadence: 'daily',
    staleAfterHours: 24,
    howToMeasure: 'Sit still for 5 minutes, place the cuff on your upper arm at heart level, and press start.',
    whyItMatters: 'Low blood pressure increases the risk of fainting when returning to gravity.',
    sources: [SRC_CARDIO, SRC_PROTO]
  },
  {
    id: 'bp_diastolic',
    name: 'Diastolic Blood Pressure',
    unit: 'mmHg',
    zone: 'heart',
    risks: ['cardio'],
    hazards: ['gravity'],
    input: 'number',
    cadence: 'daily',
    staleAfterHours: 24,
    howToMeasure: 'Measure at the same time as systolic pressure, while seated and relaxed.',
    whyItMatters: 'Helps understand how your heart and blood vessels are adapting to microgravity.',
    sources: [SRC_CARDIO, SRC_PROTO]
  },
  {
    id: 'hr_rest',
    name: 'Resting Heart Rate',
    unit: 'bpm',
    zone: 'heart',
    risks: ['cardio', 'fitness'],
    hazards: ['gravity'],
    input: 'number',
    cadence: 'daily',
    staleAfterHours: 24,
    howToMeasure: 'Wear the Bio-Monitor or pulse oximeter while resting quietly for 2 minutes.',
    whyItMatters: 'An elevated heart rate at rest can signal cardiovascular stress or dehydration.',
    sources: [SRC_CARDIO, SRC_PROTO]
  },
  {
    id: 'glucose_fasting',
    name: 'Fasting Blood Glucose',
    unit: 'mg/dL',
    zone: 'gut',
    risks: ['nutrition'],
    hazards: ['environment'],
    input: 'number',
    cadence: 'daily',
    staleAfterHours: 24,
    howToMeasure: 'Use the fingerstick device before eating your first meal of the day.',
    whyItMatters: 'Monitors nutritional status and metabolic response in a confined environment.',
    sources: [SRC_PROTO] // TODO verify: check ADA guidelines for official source
  },
  {
    id: 'temp_core',
    name: 'Core Body Temperature',
    unit: '°C',
    zone: 'skin_immune',
    risks: ['immune'],
    hazards: ['environment'],
    input: 'number',
    cadence: 'daily',
    staleAfterHours: 24,
    howToMeasure: 'Use the temporal thermometer, ensuring the sensor is flush against the forehead.',
    whyItMatters: 'Early warning for infections or immune system changes in space.',
    sources: [SRC_IMMUNE, SRC_PROTO]
  },
  {
    id: 'sleep_hours',
    name: 'Sleep Duration',
    unit: 'hours',
    zone: 'brain',
    risks: ['sleep', 'behavioral'],
    hazards: ['isolation'],
    input: 'number',
    cadence: 'daily',
    staleAfterHours: 24,
    howToMeasure: 'Record the total time slept, confirmed by the Actiwatch data.',
    whyItMatters: 'Sleep loss impairs cognitive performance and immune function during long missions.',
    sources: [SRC_PROTO]
  },
  {
    id: 'mood',
    name: 'Mood / Behavioral Health',
    unit: 'scale 1-5',
    zone: 'brain',
    risks: ['behavioral'],
    hazards: ['isolation'],
    input: 'scale_1_5',
    cadence: 'daily',
    staleAfterHours: 24,
    howToMeasure: 'Rate your overall mood today from 1 (very low) to 5 (excellent).',
    whyItMatters: 'Isolation and confinement can affect behavioral health over months.',
    sources: [SRC_PROTO]
  },
  {
    id: 'cabin_co2',
    name: 'Cabin CO2 Concentration',
    unit: 'mmHg',
    zone: 'lungs',
    risks: ['hypoxia'],
    hazards: ['environment'],
    input: 'number',
    cadence: 'daily',
    staleAfterHours: 1, // CO2 changes fast
    howToMeasure: 'Check the continuous cabin sensor reading on the life support panel.',
    whyItMatters: 'High CO2 causes headaches and cognitive impairment; NASA limits it to 3 mmHg.',
    sources: [SRC_STD_3001]
  },

  // ── 2. The Next 11 Indicators ───────────────────────────────────────────────
  {
    id: 'spo2',
    name: 'Blood Oxygen Saturation',
    unit: '%',
    zone: 'lungs',
    risks: ['hypoxia', 'dcs'],
    hazards: ['environment'],
    input: 'number',
    cadence: 'daily',
    staleAfterHours: 24,
    howToMeasure: 'Clip the pulse oximeter to your finger and wait for the signal to stabilize.',
    whyItMatters: 'Low oxygen may indicate hypoxia or decompression sickness.',
    sources: [SRC_HYPOXIA, SRC_PROTO]
  },
  {
    id: 'radiation_dose_cum',
    name: 'Cumulative Radiation Dose',
    unit: 'mSv',
    zone: 'brain',
    risks: ['radiation_cancer'],
    hazards: ['radiation'],
    input: 'number',
    cadence: 'daily',
    staleAfterHours: 24,
    howToMeasure: 'Sync the personal dosimeter with the app to read the accumulated dose.',
    whyItMatters: 'Radiation is invisible but increases long-term cancer risk; NASA sets a 600 mSv career limit.',
    sources: [SRC_STD_3001]
  },
  {
    id: 'exercise_min',
    name: 'Daily Exercise Duration',
    unit: 'min',
    zone: 'muscles',
    risks: ['fitness', 'bone'],
    hazards: ['gravity'],
    input: 'number',
    cadence: 'daily',
    staleAfterHours: 24,
    howToMeasure: 'Log the total minutes of resistive and aerobic exercise completed today.',
    whyItMatters: 'NASA requires 1.5 hours per day to prevent bone and muscle loss.',
    sources: [SRC_FITNESS]
  },
  {
    id: 'hydration_urine',
    name: 'Hydration Status',
    unit: 'scale 1-8',
    zone: 'kidneys',
    risks: ['bone'],
    hazards: ['gravity'],
    input: 'scale_1_5', // Will treat 1-8 scale mapped to UI
    cadence: 'daily',
    staleAfterHours: 24,
    howToMeasure: 'Compare your urine color to the hydration chart (1 is clear, 8 is dark).',
    whyItMatters: 'Dehydration combined with bone calcium loss increases the risk of kidney stones.',
    sources: [SRC_KIDNEY, SRC_PROTO]
  },
  {
    id: 'vision_amsler',
    name: 'Amsler Grid Visual Test',
    unit: 'boolean',
    zone: 'eyes',
    risks: ['sans'],
    hazards: ['gravity'],
    input: 'boolean',
    cadence: 'weekly',
    staleAfterHours: 168,
    howToMeasure: 'Look at the Amsler grid on the screen. Note if any lines appear wavy or distorted.',
    whyItMatters: 'Vision changes may indicate SANS, which affects ~70% of ISS astronauts.',
    sources: [SRC_SANS]
  },
  {
    id: 'headache',
    name: 'Headache Severity',
    unit: 'scale 1-5',
    zone: 'brain',
    risks: ['hypoxia', 'sans'],
    hazards: ['environment'],
    input: 'scale_1_5',
    cadence: 'daily',
    staleAfterHours: 24,
    howToMeasure: 'Rate any headache you are feeling from 1 (none) to 5 (severe).',
    whyItMatters: 'Headaches can be an early symptom of elevated CO2 or SANS.',
    sources: [SRC_HYPOXIA, SRC_PROTO]
  },
  {
    id: 'dizziness',
    name: 'Dizziness / Vertigo',
    unit: 'scale 1-5',
    zone: 'inner_ear',
    risks: ['sensorimotor'],
    hazards: ['gravity'],
    input: 'scale_1_5',
    cadence: 'daily',
    staleAfterHours: 24,
    howToMeasure: 'Rate any dizziness or loss of balance from 1 (none) to 5 (severe).',
    whyItMatters: 'Inner ear disturbances are common during gravity transitions.',
    sources: [SRC_PROTO]
  },
  {
    id: 'fitness_self_eval',
    name: 'Fitness Self-Evaluation',
    unit: '%',
    zone: 'muscles',
    risks: ['fitness'],
    hazards: ['gravity'],
    input: 'number',
    cadence: 'weekly',
    staleAfterHours: 168,
    howToMeasure: 'Rate your current strength and aerobic capacity compared to pre-flight (100%).',
    whyItMatters: 'Crew members lose an average of 10-12% fitness; early detection helps.',
    sources: [SRC_FITNESS]
  },
  {
    id: 'appetite',
    name: 'Appetite Level',
    unit: 'scale 1-5',
    zone: 'gut',
    risks: ['nutrition'],
    hazards: ['environment'],
    input: 'scale_1_5',
    cadence: 'daily',
    staleAfterHours: 24,
    howToMeasure: 'Rate your appetite today from 1 (none) to 5 (very hungry).',
    whyItMatters: 'Reduced appetite may lead to inadequate nutrition and "menu fatigue".',
    sources: [SRC_PROTO]
  },
  {
    id: 'skin_lesion',
    name: 'Skin Lesion or Rash',
    unit: 'boolean',
    zone: 'skin_immune',
    risks: ['immune', 'microbes'],
    hazards: ['environment'],
    input: 'boolean',
    cadence: 'daily',
    staleAfterHours: 24,
    howToMeasure: 'Check your skin for new cold sores, rashes, or atypical lesions.',
    whyItMatters: 'Immune changes in space can reactivate latent viruses or cause allergic reactions.',
    sources: [SRC_IMMUNE]
  },
  {
    id: 'bone_density_proj',
    name: 'Projected Bone Density Loss',
    unit: '%',
    zone: 'bones',
    risks: ['bone'],
    hazards: ['gravity'],
    input: 'number',
    cadence: 'weekly',
    staleAfterHours: 168,
    howToMeasure: 'System calculated based on exercise adherence (no in-flight scan).',
    whyItMatters: 'Astronauts lose 1-1.5% bone density per month in weight-bearing bones.',
    sources: [SRC_BONE]
  }
];
