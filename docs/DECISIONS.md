# Decisions

One line per decision: date/time · decision · why.

- Sat 10:30 · Concept: Future Self + compound engine + Earth-independent loop · differentiates from status dashboards; backed by NASA resources (see docs/01).
- Sat 10:30 · Client-only, offline-first, deterministic rules engine · demo cannot depend on a network or a model.
- Sat 11:00 · Direction "Landing day in 4 tasks" (stand, see, move, think) on top of Future Self · turns the readiness number into something a judge understands in 10 s; backed by gravity, cardio, fitness and SANS pages. Discarded "countermeasure debt" (guilt tone, invented model) and a standalone delay animation (kept as one line in the brief).
- Sat 11:15 · Contract v1: thresholds carry sources; projections carry a daily series; `LandingTask[]` replaces canStand…canThink; `project()` takes an optional `CountermeasurePlan`; Engine gains `indicators()`, `verify()`, `brief()`; `evaluate()` takes `nowTs` · the engine stays pure (no clock) and the UI can show the plan's effect and the closed loop.
- Sat 11:15 · CO₂ yellow line = 3 mmHg (1-hour average) from NASA-STD-3001 Technical Brief OCHMO-TB-004 · the only official vital-sign-style threshold that backs our headache rule.
- Sat 11:30 · Stack: React 19 + Vite 8 + TypeScript + Tailwind v4 + Vitest; no shadcn/ui · custom tablet design; shadcn setup costs more than it saves.
- Sat 11:30 · Zustand with localStorage persistence instead of Dexie · tiny dataset (one crew member, ~3k readings); fewer moving parts.
- Sat 11:30 · Hand-drawn SVG for the body and trajectory instead of Recharts · one curve and one figure; full control of the look.
- Sat 11:30 · Hash routing (wouter) + vite-plugin-pwa · works offline and on any static host without rewrites.
- Sat 11:30 · Self-hosted fonts (Atkinson Hyperlegible, IBM Plex Mono via @fontsource) · offline; Atkinson is designed for legibility.
- Sat 11:30 · Provisional engine in `src/app/engine/stubEngine.ts` implements the full Engine with simplified logic · UI work starts before P3 delivers; P1 swaps pieces in `src/app/engine/index.ts`.
- Sat 11:30 · "Watch" amber darkened to #9A6A00 in day mode · WCAG AA contrast for text on the light background.
- Sat 11:50 · Vercel project `kawsay` (team quirocode) linked to GitHub; public production URL https://kawsay-ten.vercel.app; previews per PR stay behind Vercel login · judges need a public link; previews only for the team.
