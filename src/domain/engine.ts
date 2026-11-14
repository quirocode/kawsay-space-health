/**
 * The science engine: the one object the UI talks to (through src/app/engine).
 * Each method lives in its own module with its own tests.
 */
import { INDICATORS } from './indicators';
import { evaluate } from './evaluate';
import { findCompound } from './rules';
import { project } from './projection';
import { brief, verify } from './loop';
import type { Engine } from './types';

export const engine: Engine = {
  indicators: () => INDICATORS,
  evaluate: (readings, baselines, ctx, nowTs) => evaluate(INDICATORS, readings, baselines, ctx, nowTs),
  findCompound,
  project,
  verify,
  brief,
};
