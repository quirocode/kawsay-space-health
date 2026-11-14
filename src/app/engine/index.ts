/**
 * The one place the UI gets its engine from. UI code imports `engine` from here and
 * talks to it only through the Engine interface (src/domain/types.ts).
 * P1 swaps stub pieces for P3's modules here as they land.
 */
import type { Engine } from '../../domain/types';
import { stubEngine } from './stubEngine';
import { generateStubSol142, type DemoMission } from './stubData';

export const engine: Engine = stubEngine;

export function loadDemoMission(): DemoMission {
  return generateStubSol142();
}

export type { DemoMission };
