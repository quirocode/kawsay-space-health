# AGENTS.md — rules for every AI assistant working in this repo

Read this first. It applies to Claude Code, DeepSeek, and any other assistant a teammate pastes it into.

## What we are building
**UPRIGHT** — a health copilot for astronauts on long-duration missions, built for NASA Space Apps Challenge 2026 ("Create Health Monitoring Software for Astronauts on Space Missions").

It answers one question no dashboard answers: **"What body will I land with?"**

1. **Future Self** — shows the crew member today next to their projected self on arrival day. Every action bends the trajectory. North-star metric: Landing Readiness (can I stand, see, move, think).
2. **Compound risk engine** — explainable rules across indicators, because NASA's five hazards potentiate each other.
3. **Earth-independent loop** — Measure → Understand → Act → Verify → Escalate, aware of communication delay.

Full context: `docs/01-problema-y-usuarios.md` (problem, users, demo scene), `docs/04-recursos-nasa.md` (science and official figures), `docs/02-roles-y-flujo.md` (team and checkpoints).

## Primary user
A crew member who is **not a physician**, has **under 3 minutes a day** for this, and cares about being able to work on landing day. Secondary: the flight surgeon on the ground, who gets a one-screen delayed brief.

## Non-negotiables
- **English** for all UI text, code, comments and README. Team docs in `docs/` may be Spanish.
- **Client-only, offline-first.** No backend, no login. The app must work with the network off.
- **The rules engine is deterministic and decides everything.** An LLM, if used at all, only rephrases explanations and must have a rules-based fallback. Never let a model decide a health status.
- **Every threshold, rule and projection carries `sources`** with `official: true|false`. Prototype values are labelled "prototype value" in the UI. Never invent a NASA figure; the official ones are in `docs/04-recursos-nasa.md` section 4.
- **Not a medical device.** Show a short disclaimer once; do not litter the UI with it.
- **Stale or missing data is shown as stale**, never as green.
- **Demo mode:** a seeded, deterministic mission ("Sol 142") must always load and play the full story with no manual data entry.
- No secrets in the repo. No NASA logos or mission patches. AI-generated images need a visible watermark.
- Log as you go: AI assistance in `docs/AI_USAGE.md`, NASA/CSA resources in `docs/NASA_SOURCES.md`, technical choices in `docs/DECISIONS.md`.

## Lanes (who owns which files)
| Lane | Owner | Paths |
|---|---|---|
| Integration | P1 | `src/app/`, `src/domain/types.ts`, `src/features/future-self/`, config, CI, deploy |
| Crew experience | P2 | `src/features/*` (except `future-self/`), `src/components/` |
| Science engine | P3 | `src/domain/*` (except `types.ts`), `src/data/` |
| Design | P4 | `design/` |
| Content & submission | P5 | `content/`, `docs/NASA_SOURCES.md`, `docs/AI_USAGE.md`, `docs/SUBMISSION.md` |

**Edit only your lane.** If a task needs a file in another lane, stop and say so instead of editing it. `src/domain/types.ts` is the contract: only P1 changes it.

## Engineering rules
- `src/domain/` is pure TypeScript: no React, no browser APIs, no network, no randomness without a seed. Every function there has a unit test.
- UI reads the engine only through the `Engine` interface in `types.ts`.
- User-facing copy lives in `content/` as JSON/Markdown, not hard-coded in components.
- Design tokens come from `design/` and are mapped to CSS variables once; components never hard-code colours.
- Status is never colour alone: pair it with an icon and a word.
- Small PRs, one branch per person (`p1/…` to `p5/…`). `main` must always build and deploy.
- Prefer finishing the demo story over adding features. Feature freeze: Sunday 14:00 (Lima).
