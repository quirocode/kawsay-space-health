// src/domain/indicators.ts
/**
 * KAWSAY — indicator catalog (P3-01). 18 indicators, the challenge's six first.
 * Integrated by P1 from P3's DeepSeek draft (src/data/indicators.ts): ids, paths and
 * thresholds aligned with docs/tasks/P3-01-indicators.md; P3's copy kept where it fit.
 * Official numbers used here: CO₂ 3 mmHg (SRC.co2) and exercise 90 min/day (SRC.fitness). Everything else is a prototype value.
 */
import type { IndicatorDef, Source, Threshold } from './types';

const nasa = (label: string, url: string): Source => ({ label, url, official: true });

export const SRC = {
  hazards: nasa('NASA HRP — Hazards of Human Spaceflight', 'https://www.nasa.gov/hrp/hazards/'),
  risks: nasa('NASA HRP — Human System Risks', 'https://www.nasa.gov/hrp/risks/'),
  bone: nasa('NASA — Risk of Spaceflight-Induced Bone Changes', 'https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/'),
  fitness: nasa('NASA — Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness', 'https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness/'),
  sans: nasa('NASA — Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)', 'https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/'),
  cardio: nasa('NASA — Risk of Cardiovascular Adaptations', 'https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/'),
  sensorimotor: nasa('NASA — Risk of Altered Sensorimotor and Vestibular Function', 'https://www.nasa.gov/reference/risk-of-altered-sensorimotor-and-vestibular-function/'),
  hypoxia: nasa('NASA — Risk of Hypoxia', 'https://www.nasa.gov/reference/risk-of-hypoxia/'),
  immune: nasa('NASA — Risk of Altered Immune System Responses', 'https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/'),
  microbes: nasa('NASA — Risk of Host-Microorganism Interactions', 'https://www.nasa.gov/reference/risk-of-host-microorganism-interactions/'),
  nutrition: nasa('NASA — Risk of Inadequate Food and Nutrition', 'https://www.nasa.gov/reference/risk-of-inadequate-food-and-nutrition/'),
  sleep: nasa('NASA — Risk of Inadequate Sleep and Irregular Schedules', 'https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/'),
  behavioral: nasa('NASA — Risk of Behavioral Conditions and Psychiatric Disorders', 'https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/'),
  dcs: nasa('NASA — Risk of Decompression Sickness', 'https://www.nasa.gov/reference/risk-of-decompression-sickness/'),
  eva: nasa('NASA — Risk of Injury and Compromised Performance from EVA', 'https://www.nasa.gov/reference/risk-of-injury-and-compromised-performance-from-extravehicular-activity-eva/'),
  radiation_cancer: nasa('NASA — Risk of Radiation-Induced Cancers', 'https://www.nasa.gov/reference/risk-of-radiation-induced-cancers/'),
  radiation: nasa('NASA HRP — Hazard: Space Radiation', 'https://www.nasa.gov/hrp/hazard-space-radiation/'),
  isolation: nasa('NASA HRP — Hazard: Isolation and Confinement', 'https://www.nasa.gov/hrp/hazard-isolation-and-confinement/'),
  distance: nasa('NASA HRP — Hazard: Distance from Earth', 'https://www.nasa.gov/hrp/hazard-distance-from-earth/'),
  gravity: nasa('NASA HRP — Hazard: Gravity Fields', 'https://www.nasa.gov/hrp/hazard-gravity-fields/'),
  environment: nasa('NASA HRP — Hazard: Hostile and Closed Environments', 'https://www.nasa.gov/hrp/hazard-hostile-closed-environments/'),
  co2: nasa('NASA-STD-3001 Technical Brief OCHMO-TB-004 — Carbon Dioxide', 'https://www.nasa.gov/ochmo-tb-004-carbon-dioxide-2/'),
  prototype: {
    label: 'KAWSAY prototype value (general adult reference, not a NASA figure)',
    url: 'https://github.com/quirocode/kawsay-space-health/blob/main/docs/04-recursos-nasa.md',
    official: false,
  },
} as const satisfies Record<string, Source>;

const P = SRC.prototype;
const red = (label: string, b: { min?: number; max?: number }, source: Source = P): Threshold => ({ status: 'red', label, source, ...b });
const yellow = (label: string, b: { min?: number; max?: number }, source: Source = P): Threshold => ({ status: 'yellow', label, source, ...b });
const unusual: Threshold = { status: 'yellow', sdFromBaseline: 2, label: 'Unusual for you (more than 2 SD from your recent days)', source: P };
const reported = [yellow('Reported', { min: 1 })];

export const INDICATORS: IndicatorDef[] = [
  // ── The challenge's six (blood pressure split in two) ──────────────────────
  {
    id: 'bp_systolic', name: 'Blood pressure (systolic)', unit: 'mmHg', zone: 'heart',
    risks: ['cardio'], hazards: ['gravity'], input: 'number', cadence: 'daily', staleAfterHours: 36,
    thresholds: [red('160 or more', { min: 160 }), red('Below 85', { max: 85 }), yellow('140–159', { min: 140, max: 160 }), yellow('85–94', { min: 85, max: 95 }), unusual],
    howToMeasure: 'Sit still for 5 minutes · Cuff on upper arm, at heart level · Press start · Enter both numbers',
    whyItMatters: 'Your heart and vessels adapt to weightlessness. Low pressure raises the risk of fainting when gravity returns.',
    sources: [SRC.cardio, P],
  },
  {
    id: 'bp_diastolic', name: 'Blood pressure (diastolic)', unit: 'mmHg', zone: 'heart',
    risks: ['cardio'], hazards: ['gravity'], input: 'number', cadence: 'daily', staleAfterHours: 36,
    thresholds: [red('100 or more', { min: 100 }), red('Below 50', { max: 50 }), yellow('90–99', { min: 90, max: 100 }), yellow('50–59', { min: 50, max: 60 })],
    howToMeasure: 'Measured with the systolic value · Stay seated and relaxed · Enter the lower number',
    whyItMatters: 'Shows how your blood vessels are adapting to microgravity, together with the systolic value.',
    sources: [SRC.cardio, P],
  },
  {
    id: 'heart_rate', name: 'Resting heart rate', unit: 'bpm', zone: 'heart',
    risks: ['cardio', 'fitness'], hazards: ['gravity'], input: 'number', cadence: 'daily', staleAfterHours: 36,
    thresholds: [red('120 or more', { min: 120 }), red('Below 40', { max: 40 }), yellow('100–119', { min: 100, max: 120 }), yellow('40–49', { min: 40, max: 50 }), unusual],
    howToMeasure: 'Rest quietly for 2 minutes · Put the sensor on your finger · Wait for a steady number · Enter it',
    whyItMatters: 'A resting rate higher than usual can signal stress on the heart or dehydration.',
    sources: [SRC.cardio, P],
  },
  {
    id: 'glucose', name: 'Blood glucose', unit: 'mg/dL', zone: 'gut',
    risks: ['nutrition'], hazards: ['distance'], input: 'number', cadence: 'daily', staleAfterHours: 36,
    thresholds: [red('250 or more', { min: 250 }), red('Below 60', { max: 60 }), yellow('140–249', { min: 140, max: 250 }), yellow('60–69', { min: 60, max: 70 })],
    howToMeasure: 'Before your first meal · Use the fingerstick device · Enter the number',
    whyItMatters: 'Tracks how your body handles food when meals are rationed and repetitive.',
    sources: [SRC.nutrition, P],
  },
  {
    id: 'body_temp', name: 'Body temperature', unit: '°C', zone: 'skin_immune',
    risks: ['immune', 'microbes'], hazards: ['environment'], input: 'number', cadence: 'daily', staleAfterHours: 36,
    thresholds: [red('39.0 °C or more', { min: 39 }), red('Below 35.0 °C', { max: 35 }), yellow('37.8–38.9 °C', { min: 37.8, max: 39 }), yellow('35.0–35.9 °C', { min: 35, max: 36 }), unusual],
    howToMeasure: 'Use the forehead thermometer · Keep the sensor flush on the skin · Enter the value',
    whyItMatters: 'An early warning for infection. The immune system changes in space and microbes spread more easily.',
    sources: [SRC.immune, SRC.microbes, P],
  },
  {
    id: 'sleep_hours', name: 'Sleep last night', unit: 'h', zone: 'brain',
    risks: ['sleep', 'behavioral'], hazards: ['isolation'], input: 'number', cadence: 'daily', staleAfterHours: 36,
    thresholds: [red('Below 4 h', { max: 4 }), yellow('4 to 6 h', { min: 4, max: 6 }), unusual],
    howToMeasure: 'Check your sleep watch · Enter total hours slept',
    whyItMatters: 'Sleep loss slows thinking and weakens immunity on long missions.',
    sources: [SRC.sleep, P],
  },
  {
    id: 'mood', name: 'Mood', unit: '1–5', zone: 'brain',
    risks: ['behavioral'], hazards: ['isolation'], input: 'scale_1_5', cadence: 'daily', staleAfterHours: 36,
    thresholds: [red('Very low', { max: 1.5 }), yellow('Low', { min: 1.5, max: 2.5 })],
    howToMeasure: 'Pick the level that fits right now',
    whyItMatters: 'Isolation, short sleep and heavy workload can lower mood. Noticing it early lets you act.',
    sources: [SRC.isolation, SRC.behavioral, P],
  },
  // ── Symptoms (per event) ───────────────────────────────────────────────────
  {
    id: 'headache_score', name: 'Headache', unit: '1–5', zone: 'brain',
    risks: ['hypoxia', 'behavioral'], hazards: ['environment'], input: 'scale_1_5', cadence: 'per_event', staleAfterHours: 12,
    thresholds: [red('Severe', { min: 5 }), yellow('Moderate to strong', { min: 3, max: 5 })],
    howToMeasure: 'Rate it from 1 (none) to 5 (severe)',
    whyItMatters: 'A headache can come from short sleep, high cabin CO₂ or low oxygen. KAWSAY checks them together.',
    sources: [SRC.hypoxia, SRC.co2, P],
  },
  {
    id: 'symptom_dizziness', name: 'Dizziness', unit: 'yes/no', zone: 'inner_ear',
    risks: ['sensorimotor', 'cardio'], hazards: ['gravity'], input: 'boolean', cadence: 'per_event', staleAfterHours: 24,
    thresholds: reported,
    howToMeasure: 'Tap yes if the room spins or you feel light-headed',
    whyItMatters: 'Balance and blood pressure are disturbed during gravity transitions.',
    sources: [SRC.sensorimotor, SRC.cardio, P],
  },
  {
    id: 'symptom_vision', name: 'Blurred vision', unit: 'yes/no', zone: 'eyes',
    risks: ['sans', 'hypoxia'], hazards: ['gravity'], input: 'boolean', cadence: 'per_event', staleAfterHours: 24,
    thresholds: reported,
    howToMeasure: 'Look at a far object, then a near one · Tap yes if either is blurry',
    whyItMatters: 'Fluid shifts toward the head can press on the eyes (SANS). About 70 % of ISS astronauts show some eye swelling.',
    sources: [SRC.sans, P],
  },
  {
    id: 'symptom_confusion', name: 'Confusion', unit: 'yes/no', zone: 'brain',
    risks: ['hypoxia'], hazards: ['environment'], input: 'boolean', cadence: 'per_event', staleAfterHours: 12,
    thresholds: reported,
    howToMeasure: 'Tap yes if simple tasks feel hard to follow',
    whyItMatters: 'Confusion with headache can be a sign of low oxygen. Tell a crewmate.',
    sources: [SRC.hypoxia, P],
  },
  {
    id: 'symptom_joint_pain', name: 'Joint pain', unit: 'yes/no', zone: 'bones',
    risks: ['dcs', 'eva'], hazards: ['environment'], input: 'boolean', cadence: 'per_event', staleAfterHours: 12,
    thresholds: reported,
    howToMeasure: 'Tap yes for new pain in a joint, especially around a spacewalk',
    whyItMatters: 'During or after a spacewalk, joint pain can be decompression sickness.',
    sources: [SRC.dcs, SRC.eva, P],
  },
  {
    id: 'symptom_skin', name: 'Rash or cold sore', unit: 'yes/no', zone: 'skin_immune',
    risks: ['immune', 'microbes'], hazards: ['environment'], input: 'boolean', cadence: 'per_event', staleAfterHours: 48,
    thresholds: reported,
    howToMeasure: 'Check lips and skin for new sores or rashes · Tap yes if you see one',
    whyItMatters: 'Immune changes in space can wake up dormant viruses, like cold sores.',
    sources: [SRC.immune, P],
  },
  // ── Cabin and countermeasures ──────────────────────────────────────────────
  {
    id: 'spo2', name: 'Blood oxygen (SpO₂)', unit: '%', zone: 'lungs',
    risks: ['hypoxia'], hazards: ['environment'], input: 'number', cadence: 'daily', staleAfterHours: 48,
    thresholds: [red('Below 88 %', { max: 88 }), yellow('88–91 %', { min: 88, max: 92 })],
    howToMeasure: 'Clip the sensor on your finger · Wait for a steady signal · Enter the value',
    whyItMatters: 'Low oxygen can cause confusion, headache and trouble sleeping.',
    sources: [SRC.hypoxia, P],
  },
  {
    id: 'cabin_co2', name: 'Cabin CO₂', unit: 'mmHg', zone: 'lungs',
    risks: ['hypoxia'], hazards: ['environment'], input: 'number', cadence: 'daily', staleAfterHours: 2,
    thresholds: [red('6 mmHg or more', { min: 6 }), yellow('Above the NASA limit of 3 mmHg (1-hour average)', { min: 3 }, SRC.co2)],
    howToMeasure: 'Open the cabin air panel · Read the CO₂ value · Enter it',
    whyItMatters: 'High CO₂ can cause headaches and poor focus. NASA limits it to 3 mmHg as a 1-hour average.',
    sources: [SRC.co2, SRC.environment, P],
  },
  {
    id: 'exercise_min', name: 'Exercise today', unit: 'min', zone: 'muscles',
    risks: ['fitness', 'bone'], hazards: ['gravity'], input: 'number', cadence: 'daily', staleAfterHours: 36,
    thresholds: [red('Under 45 min', { max: 45 }), yellow('Under the NASA target of 90 min a day', { max: 90 }, SRC.fitness)],
    howToMeasure: 'Add resistive and aerobic minutes · Enter the total for today',
    whyItMatters: 'NASA crews exercise 1.5 hours a day, 6–7 days a week, to protect bone and muscle.',
    sources: [SRC.fitness, SRC.bone, P],
  },
  {
    id: 'water_ml', name: 'Water today', unit: 'mL', zone: 'kidneys',
    risks: ['nutrition', 'bone'], hazards: ['gravity'], input: 'number', cadence: 'daily', staleAfterHours: 36,
    thresholds: [red('Under 1.5 L', { max: 1500 }), yellow('1.5 to 2 L', { min: 1500, max: 2000 })],
    howToMeasure: 'Count your drink bags · Enter the total in mL',
    whyItMatters: 'Dehydration plus calcium released from bone raises the risk of kidney stones.',
    sources: [SRC.gravity, SRC.bone, P],
  },
  {
    id: 'strength_self_pct', name: 'Strength self-test', unit: '% of pre-flight', zone: 'muscles',
    risks: ['fitness'], hazards: ['gravity'], input: 'test', cadence: 'weekly', staleAfterHours: 24 * 8,
    thresholds: [red('More than 20 % below pre-flight', { max: 80 }), yellow('10–20 % below pre-flight', { min: 80, max: 90 })],
    howToMeasure: 'Do the weekly strength routine · Compare with your pre-flight result · Enter the percentage',
    whyItMatters: 'Fitness drops 10–12 % on average in space, and some crew lose more than 20 %. Weekly checks catch it early.',
    sources: [SRC.fitness, P],
  },
];

export const INDICATOR_IDS: readonly string[] = INDICATORS.map((d) => d.id);

const BY_ID = new Map(INDICATORS.map((d) => [d.id, d]));
export function getIndicator(id: string): IndicatorDef | undefined {
  return BY_ID.get(id);
}
