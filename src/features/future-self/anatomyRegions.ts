import type { BodyZone } from '../../domain/types';

export const MUSCLE_GROUPS = ['headNeck', 'chest', 'back', 'core', 'arms', 'legs'] as const;
export const ORGAN_GROUPS = ['eyes', 'brain', 'heart', 'lungs', 'gut'] as const;
export const ANATOMY_SEXES = ['female', 'male'] as const;
export type AnatomyRegion = (typeof MUSCLE_GROUPS)[number] | (typeof ORGAN_GROUPS)[number];
export type AnatomyMode = 'muscles' | 'organs';
export type AnatomySex = (typeof ANATOMY_SEXES)[number];

export function muscleRegion(name: string, x: number, y: number, depth: number): AnatomyRegion {
  // Coordinates are normalized to the atlas height. Names take precedence for muscles
  // that span two regions, such as the trapezius and the chest near the shoulder.
  if (y > 0.84) return 'headNeck';
  if (/trapezius|latissimus|rhomboid|erector spinae|multifidus|spinalis|splenius/.test(name)) return 'back';
  if (/pectoral|intercostal|serratus anterior/.test(name)) return 'chest';
  if (Math.abs(x) > 0.14 || /deltoid|brachii|brachialis|brachioradialis|rotator cuff|of hand|pollicis|carpi|palmar interossei/.test(name)) return 'arms';
  if (y < 0.48 || /glute|piriformis|gemellus/.test(name)) return 'legs';
  if (Math.abs(x) > 0.10) return 'arms';
  if (depth < -0.025 && !/abdominis|oblique|transversus|diaphragm|coccygeus|iliococcygeus|pubococcygeus/.test(name)) return 'back';
  return y > 0.68 ? 'chest' : 'core';
}

export function regionZone(mode: AnatomyMode, region: AnatomyRegion): BodyZone {
  return mode === 'muscles' ? 'muscles' : region as (typeof ORGAN_GROUPS)[number];
}

export function assetKeysForSex(mode: AnatomyMode, sex: AnatomySex): { layer: string; skin: string } {
  const suffix = sex === 'female' ? '-female' : '';
  return { layer: `${mode}${suffix}`, skin: `skin${suffix}` };
}
