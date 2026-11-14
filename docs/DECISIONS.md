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
- Sat 12:10 · Sol 142 calibrated to readiness 66 → 89 (was scripted as 68 → 84); "Climb out and walk" stays Watch with the plan · bone cannot recover in 38 days; forcing it to OK would contradict NASA's 1–1.5 %/month. The honest message ("start earlier") is stronger for Validity.
- Sat 12:10 · Readiness points are piecewise (30 at the red line, 80 at the green line, 100 at pre-flight) · an "OK" task near the line should not score the same as a perfect one.
- Sat 12:10 · Future Self opens on arrival day; the time slider previews "if you landed on Sol N" by calling `project()` with `arrivalDay = N` · no contract change needed.
- Sat 12:10 · Woven timeline: one thread per day, height = exercise vs 90 min target; days under 75 % show in amber · the 6 short days are visible at a glance, which is the demo's first beat.
- Sat 12:40 · P3's first upload (src/data/indicators.ts, src/data/data/indicators.test.ts) did not match P3-01 (wrong path, different ids, no thresholds, empty URLs) and broke CI on main. P1 rebuilt `src/domain/indicators.ts` to the brief, keeping P3's measurement copy, and removed the misplaced files · the engine, rules and demo data all depend on the P3-01 ids. Dropped from the draft for now: radiation dose (600 mSv career limit is NASA-STD-3001 but no projection uses it yet), urine colour, appetite, Amsler test — candidates for "extra" scope.
- Sat 12:40 · Provisional engine now reads indicators and sources from `src/domain/indicators.ts` · one source registry for the whole app.
- Sat 13:00 · Design system from P4's pen.dev file adopted: light theme + 5 night palettes (Mars, JWST, Lunar, Aurora, Earthrise), "Inti" terracotta as brand, Instrument Sans + JetBrains Mono. Tokens exported to `design/exports/tokens.json` and generated into `src/app/tokens.css` by `scripts/tokens-to-css.mjs` · single source of truth, mapped once.
- Sat 13:00 · The arrival-day ("future") body uses Inti; the old violet "Dusk" is dropped · the design reserves violet-grey for stale data, and two violets would confuse "projected" with "old data".
- Sat 13:00 · The .pen file contains only variables (no screens or body artwork yet); layout stays as built until P4 adds screens · nothing to implement beyond the design system.
- Sat 13:00 · Design fonts referenced first with Atkinson/IBM Plex as offline fallback · npm registry unreachable (ECONNRESET) at the time; bundle @fontsource/instrument-sans and @fontsource/jetbrains-mono when the network is back.
