import type { BodyZone } from '../../domain/types';

export const MUSCLE_GROUPS = ['headNeck', 'chest', 'back', 'core', 'arms', 'legs'] as const;
export const ORGAN_GROUPS = ['eyes', 'brain', 'heart', 'lungs', 'gut'] as const;
export type AnatomyRegion = (typeof MUSCLE_GROUPS)[number] | (typeof ORGAN_GROUPS)[number];
export type AnatomyMode = 'muscles' | 'organs';

export function muscleRegion(name: string, x: number, y: number, depth: number): AnatomyRegion {
  // Coordinates are normalized to the atlas height. Names take precedence for muscles
  // that span two regions, such as the trapezius and the chest near the shoulder.
  if (y > 0.84) return 'headNeck';
  if (/trapezius|latissimus|rhomboid|erector spinae|multifidus|spinalis|splenius/.test(name)) return 'back';
  if (/pectoral|intercostal/.test(name)) return 'chest';
  if (y < 0.48 || /glute/.test(name)) return 'legs';
  if (Math.abs(x) > 0.10 || /deltoid|brachii|brachialis|brachioradialis|rotator cuff/.test(name)) return 'arms';
  if (depth < -0.025) return 'back';
  return y > 0.68 ? 'chest' : 'core';
}

export function regionZone(mode: AnatomyMode, region: AnatomyRegion): BodyZone {
  return mode === 'muscles' ? 'muscles' : region as (typeof ORGAN_GROUPS)[number];
}
