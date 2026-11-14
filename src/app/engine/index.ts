/**
 * The one place the UI gets its engine from. UI code imports from here and talks to the
 * science engine only through the Engine and WatchEngine interfaces (src/domain/types.ts).
 */
import type { Engine, WatchEngine } from '../../domain/types';
import { engine as domainEngine } from '../../domain/engine';
import { watchEngine as domainWatchEngine } from '../../domain/watch';
import { generateSol142, type DemoMission } from '../../data/sol142';

export const engine: Engine = domainEngine;
export const watchEngine: WatchEngine = domainWatchEngine;

export function loadDemoMission(): DemoMission {
  return generateSol142();
}

export type { DemoMission };
