/**
 * App state (P1). Persisted on this device only (offline-first, no backend).
 * Features read and write state only through these actions.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CountermeasurePlan, Environment, MissionContext, Reading, VerificationResult } from '../domain/types';
import { loadDemoMission } from './engine';

/** Night palettes from P4's design file (design/exports/tokens.json). */
export const PALETTES = ['mars', 'jwst', 'lunar', 'aurora', 'earthrise'] as const;
export type Palette = (typeof PALETTES)[number];

export interface PendingRecheck {
  ruleId: string;
  actionId: string;
  indicatorId: string;
  dueTs: number;
  before: Reading;
}

export interface AppState {
  context: MissionContext;
  nowTs: number;                   // simulated ship clock (demo) — never Date.now() in the engine
  readings: Reading[];
  plan: CountermeasurePlan;        // what the crew member commits to (Future Self "with plan")
  planAccepted: boolean;
  viewDay: number;                 // time slider on Future Self
  pending: PendingRecheck | null;
  verifications: VerificationResult[];
  briefQueuedTs: number | null;
  disclaimerSeen: boolean;
  theme: 'day' | 'night';
  palette: Palette;

  addReadings(rs: Reading[]): void;
  setPlan(p: CountermeasurePlan): void;
  acceptPlan(): void;
  setViewDay(d: number): void;
  setEnvironment(env: Environment, commDelayMin: number): void;
  startRecheck(p: PendingRecheck): void;
  completeRecheck(v: VerificationResult): void;
  queueBrief(): void;
  advanceClock(ms: number): void;
  setClock(ts: number): void;
  dismissDisclaimer(): void;
  toggleTheme(): void;
  setPalette(p: Palette): void;
  resetDemo(): void;
}

function initial() {
  const demo = loadDemoMission();
  return {
    context: demo.context,
    nowTs: demo.nowTs,
    readings: demo.history,
    plan: demo.defaultPlan as CountermeasurePlan, // recommended plan; "with plan" compares against it
    planAccepted: false,
    viewDay: demo.context.arrivalDay, // Future Self opens on arrival day: the question is "what body will you land with?"
    pending: null,
    verifications: [] as VerificationResult[],
    briefQueuedTs: null,
  };
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      ...initial(),
      disclaimerSeen: false,
      theme: 'day',
      palette: 'mars',

      addReadings: (rs) => set((s) => ({ readings: [...s.readings, ...rs].sort((a, b) => a.ts - b.ts) })),
      setPlan: (p) => set((s) => ({ plan: { ...s.plan, ...p } })),
      acceptPlan: () => set({ planAccepted: true }),
      setViewDay: (d) => set({ viewDay: d }),
      setEnvironment: (environment, commDelayMin) =>
        set((s) => ({
          context: {
            ...s.context,
            environment,
            commDelayMin,
            phase: !Number.isFinite(commDelayMin) ? 'conjunction' : s.context.phase === 'conjunction' ? 'cruise' : s.context.phase,
          },
        })),
      startRecheck: (p) => set({ pending: p }),
      completeRecheck: (v) => set((s) => ({ pending: null, verifications: [...s.verifications, v] })),
      queueBrief: () => set((s) => ({ briefQueuedTs: s.nowTs })),
      advanceClock: (ms) => set((s) => ({ nowTs: s.nowTs + ms })),
      setClock: (ts) => set({ nowTs: ts }),
      dismissDisclaimer: () => set({ disclaimerSeen: true }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'day' ? 'night' : 'day' })),
      setPalette: (palette) => set({ palette, theme: 'night' }),
      resetDemo: () => set(initial()),
    }),
    {
      // Bump when the demo data or state shape changes, so returning devices reload the seeded mission.
      name: 'kawsay:demo-2',
      storage: createJSONStorage(() => localStorage),
      // Infinity (conjunction) is not valid JSON: store it as -1 and restore.
      partialize: (s) => ({ ...s, context: { ...s.context, commDelayMin: Number.isFinite(s.context.commDelayMin) ? s.context.commDelayMin : -1 } }),
      merge: (persisted, current) => {
        const p = persisted as Partial<AppState> | undefined;
        if (!p?.context) return current;
        return { ...current, ...p, context: { ...p.context, commDelayMin: p.context.commDelayMin === -1 ? Infinity : p.context.commDelayMin } };
      },
    },
  ),
);
