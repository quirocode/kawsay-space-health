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
