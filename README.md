# UPRIGHT — Land on your feet.

A health copilot for astronauts on long-duration missions.
NASA Space Apps Challenge 2026 · *Create Health Monitoring Software for Astronauts on Space Missions*.

UPRIGHT answers the one question no dashboard does: **what body will you land with?**
Spaceflight damage is slow, silent and cumulative: bone loses 1–1.5% of its density every month and no single day feels different. UPRIGHT shows crew members their projected self on landing day, connects indicators the way NASA's five hazards compound each other, and closes the loop — measure, understand, act, verify, escalate — when Earth is 20 minutes away.

> Prototype for a hackathon. Not a medical device.
>
> **Live demo:** https://kawsay-ten.vercel.app · works offline once loaded.

Brand assets and rules live in [`design/brand/`](design/brand/README.md). The repository, package and demo URL keep their original `kawsay` identifiers until the deployment is renamed.

## For the team
| Read | Why |
|---|---|
| [`docs/01-problema-y-usuarios.md`](docs/01-problema-y-usuarios.md) | Problem, users, concept, demo scene |
| [`docs/02-roles-y-flujo.md`](docs/02-roles-y-flujo.md) | Roles, tools, Git workflow, checkpoints |
| [`PROMPT_MAESTRO.md`](PROMPT_MAESTRO.md) | Prompts for Claude Code |
| [`AGENTS.md`](AGENTS.md) | Rules for every AI assistant |
| [`docs/04-recursos-nasa.md`](docs/04-recursos-nasa.md) | NASA/CSA resources and official figures |
| [`docs/05-rediseno-urgencias.md`](docs/05-rediseno-urgencias.md) | Proposed redesign: emergencies first, watch data, screens for pen.dev, desktop stack |

## Develop
```bash
npm install
npm run dev      # http://localhost:5173
npm run check    # types + tests + build (same as CI)
```

## Desktop app (Windows, no network)
```bash
npm run desktop:build   # writes release/UPRIGHT-win32-x64/UPRIGHT.exe
```
Copy the whole `UPRIGHT-win32-x64` folder, not just the exe. The build downloads the Electron runtime once; the app itself never opens a connection: it serves `dist/` from disk and cancels every other request (`desktop/main.cjs`).

## Layout
```
desktop/      offline desktop shell (P1)
src/domain/   science engine — pure TypeScript (P3) · types.ts is the contract (P1)
src/data/     seeded mission data (P3)
src/features/ screens (P1, P2)        src/components/ shared UI (P2)
content/      user-facing copy (P5)   design/ pen.dev files and exports (P4)
docs/         team docs, sources, AI usage, decisions
```

## License
MIT
