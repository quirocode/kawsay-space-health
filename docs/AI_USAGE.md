# Use of AI (required by Space Apps)

Log every use as you go. One line each.

| When | Who | Tool | What it was used for | Where the output went |
|---|---|---|---|---|
| Sat 10:30 | P1 | Claude (Anthropic) | Analysis of NASA resources, problem framing, repo docs and prompts | `docs/`, `AGENTS.md`, `PROMPT_MAESTRO.md`, `src/domain/types.ts` |
| Sat 11:00 | P1 | Claude Code (Claude Opus 5.5) | Concept options, one-page plan, domain contract v1 | `docs/DECISIONS.md`, `src/domain/types.ts` |
| Sat 11:10 | P1 | Claude Code (Claude Opus 5.5) | pen.dev design prompt for P4 | `design/PEN_PROMPT.md` |
| Sat 11:20 | P1 | Claude Code (Claude Opus 5.5) | Task briefs for P3 (DeepSeek) and P5 | `docs/tasks/` |
| Sat 11:30 | P1 | Claude Code (Claude Opus 5.5) | App scaffold, provisional engine, tests, CI | `src/app/`, `src/features/future-self/`, `.github/workflows/` |
| Sat 12:10 | P1 | Claude Code (Claude Opus 5.5) | Future Self screen (double body, woven timeline, plan), calibration | `src/features/future-self/`, `src/app/engine/` |
| Sat 12:38 | P5 | Claude (Anthropic) | Draft of indicator copy and UI copy; check of the CO₂ limit against NASA-STD-3001 | `content/indicators.json`, `content/ui.json` |
| Sat 12:40 | P3 | DeepSeek | First draft of the indicator catalog (copy reused in `src/domain/indicators.ts`) | `src/domain/indicators.ts` |
| Sat 12:40 | P1 | Claude Code (Claude Opus 5.5) | Aligned P3's catalog to the contract, wired it into the engine | `src/domain/indicators.ts`, `src/app/engine/` |
| Sat 13:00 | P1 | Claude Code (Claude Opus 5.5) | Exported P4's pen.dev variables to tokens and themed the app (5 night palettes) | `design/exports/tokens.json`, `src/app/tokens.css` |
| Sat 13:15 | P1 | Claude Code (Claude Opus 5.5) via pen.dev MCP | Designed components and 8 screens in kawsay.pen using P4's design system; exported PNGs and body.svg | `design/kawsay.pen`, `design/exports/` |
| Sun 09:00 | P5 | Claude Code (Big Pickle) | English/Spanish language toggle: screen copy bundles, engine-string translation layer, decimal localisation | `src/app/i18n.ts`, `src/app/translate.es.ts`, `content/*.es.json`, UI components |
| Sun 12:10 | P1 | Claude Code (Claude Opus 5.5) | Landing page (layout modelled on quenaris.vercel.app, our own copy), NASA-blue single theme, environment chip in the header, typed input in Daily check, rebuilt the .exe | `index.html`, `src/landing/`, `content/landing.json`, `design/exports/tokens.json`, `src/app/`, `src/features/check-in/`, `src/features/environment/` |
| Sun 12:45 | Landing | Codex (OpenAI) | Added persisted day and night themes and English/Spanish copy on the public landing page | `src/landing/`, `content/landing*.json` |
| Sun 13:00 | P1 | Claude Code (Claude Opus 5.5) | Replaced "Sol" with mission days, added the mission-days explainer, EN and ES | `content/ui*.json`, `content/flow*.json`, `src/app/App.tsx`, `src/app/format.ts`, `src/features/future-self/` |
| Sun 13:30 | P1 | Claude Code (Claude Opus 5.5) | Editable mission name, crew and mission/landing days; mission shown in the header | `src/app/store.ts`, `src/app/db.ts`, `src/app/App.tsx`, `src/features/environment/`, `content/ui*.json` |
| Sun 13:45 | P1 | Claude Code (Claude Opus 5.5) | Researched suit/flight-phase health monitoring (NASA NTRS, HRP); built the simulated suit & phase check, its rules engine with tests, and the "How it works" explainer | `docs/06-trajes-y-fases.md`, `src/domain/suit.ts`, `src/features/suit/`, `src/features/how/`, `content/suit.json`, `content/how.json`, `src/app/App.tsx` |
| Sun 13:45 | P1 | Claude Code (Claude Opus 5.5) | Research on fitness bands and the Xiaomi Smart Band 7 (sensors, BLE protocol, Web Bluetooth/Electron, pairing UX); band connection screen, Web Bluetooth transport, Electron device chooser, tests | `src/app/band/`, `src/features/connect/`, `src/features/watch/WatchScreen.tsx`, `desktop/main.cjs`, `content/flow*.json` |
| Sun 13:00 | Landing and demo | Codex (OpenAI) | Stabilized the English demo CTA and added a day/night switch and a single bilingual toggle to the demo header | `src/landing/`, `src/app/App.tsx`, `content/` |
| Sun 14:01 | Landing | Codex (OpenAI) | Built the bilingual interactive demo tour and captured the running demo in Chromium | `src/landing/`, `content/landing*.json`, `public/demo-tour/` |
| Sun 14:25 | Anatomy | Codex (OpenAI) | Integrated selectable 3D anatomy with Three.js, adapted open-licensed Z-Anatomy meshes and verified rotation, picking, isolation and language controls in Chromium | `src/features/future-self/`, `public/anatomy/`, `content/anatomy.json` |
| Sun 14:43 | Anatomy | Codex (OpenAI) | Added a translucent body surface, interactive region outlines, and bilingual anatomy region controls | `src/features/future-self/`, `public/anatomy/`, `content/anatomy.json` |
