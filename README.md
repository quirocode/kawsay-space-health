# UPRIGHT — Land on your feet.

**A health copilot for astronauts on long-duration missions.**
NASA Space Apps Challenge 2026 · *Create Health Monitoring Software for Astronauts on Space Missions*.

> Prototype for a hackathon. **Not a medical device.** All crew members and readings in the demo are fictional or simulated.

| Try it | |
|---|---|
| 🌐 **Web demo** | https://upright-health.vercel.app (works offline once loaded) |
| 🪟 **Windows app** | [Latest release](https://github.com/quirocode/kawsay-space-health/releases/latest) → download `UPRIGHT-win32-x64.zip`, unzip, open `UPRIGHT.exe` |
| 🧑‍⚖️ **Judges, start here** | Open the app → **Mission simulator** → pick an astronaut, a place and a hazard → **Run simulation** |

---

## The problem

Spaceflight damage is **slow, silent and cumulative**. Bone loses about 1–1.5 % of its density every month, blood pools in the neck veins, the eyes change shape, latent viruses wake up — and no single day feels different. On the ISS, a clot in an astronaut's neck vein was found only because an ultrasound happened to be scheduled.

On the way to Mars, Earth is up to 20 minutes away each way and sometimes out of contact. A crew of four, none of whom may be a physician, has to notice, understand and act on these problems themselves, in under three minutes a day.

## What UPRIGHT does

UPRIGHT answers the one question no dashboard does: **what body will you land with?**

1. **Future Self** shows each crew member today next to their projected self on landing day. Every action (exercise, water, sleep) bends that trajectory. North-star metric: **Landing Readiness** — can I stand, see, move and think when gravity returns?
2. **A compound risk engine.** NASA's five hazards (radiation, isolation, distance, gravity, hostile environment) make each other worse, so explainable rules look at several readings together — for one person and for the whole crew.
3. **An Earth-independent loop**: **Measure → Understand → Act → Verify → Escalate**, aware of the communication delay. When a fix does not work, UPRIGHT writes a one-screen brief for the flight surgeon on Earth.

### Main screens

| Screen | What it is for |
|---|---|
| **Mission simulator** | For judges and training: make one of the four astronauts fall ill in three clicks (neck vein clot risk, kidney stone, solar storm + virus reactivation, CO₂ build-up + vision changes, sleep loss + slow reactions) on the ISS, the Moon or Mars. |
| **Crew (medical officer)** | All four astronauts at a glance, "respond for" a crewmate who cannot, and **crew-level findings** that only show across people (several headaches at once → check the cabin air; a fever → protect the others; a solar storm → everyone to the shelter). |
| **Future Self** | 3D anatomy today vs. landing day (enlarge to full screen), a time slider, Landing Readiness and the countermeasure plan. |
| **Daily check** | Two minutes, one question per screen, a keypad sized for gloves. Refuses impossible values and asks you to measure again when a value is in the Act range. |
| **Watch & alerts** | Continuous wrist data with activity context (130 bpm on the bike is normal, at rest it is not); full-screen alarm and a step-by-step protocol. |
| **Findings** | Compound findings with one action, a timed re-check and verification. |
| **"Why?"** (everywhere) | A real explanation, not a list of links: *what it means → in your case (your value, your usual, what changed) → do this now → when we check again*. Sources folded underneath. Read aloud with the system voice; optional local-AI rewording. |
| **Suit & phases** | Launch, spacewalk, entry and first hours on the ground: what changes and what the suit measures. |
| **Landing debrief** | What this person's body will face on Mars (0.38 g), the Moon (0.16 g) or Earth: standing, balance, bones, medicines, destination hazards. |
| **Earth brief** | One screen for the flight surgeon, with the arrival time and the earliest possible reply. |
| **Connect** | Pair a real heart-rate band over Bluetooth (no internet needed). |

### Who it is for

- **The crew member** — not a physician, under 3 minutes a day, wants to be able to work on landing day.
- **The crew medical officer** — sees everyone's status and can act for someone who is incapacitated.
- **The flight surgeon on Earth** — receives a delayed, one-screen brief.

### Where it would run on a real mission

A biometric shirt (like the CSA Bio-Monitor) and a watch per person for passive data and haptic alarms; a rugged tablet per astronaut for the daily check; the habitat's fixed computer (our offline Windows app) for the medical officer; the suit display and audio during spacewalks; voice when the hands are busy.

---

## Principles we did not compromise on

- **The rules decide, never an AI.** A deterministic, unit-tested rules engine sets every status. The optional local AI only rewords the rules' own explanation, runs on the device, and a safety check throws its answer away if it adds a number, a diagnosis, a drug or a link.
- **Every number has a source**, marked **NASA** (official figure) or **Prototype** (our value). We never invent a NASA figure.
- **Stale or missing data is never shown as OK.**
- **Status is never colour alone**: icon + word + colour.
- **Offline-first, no backend, no login.** The web app is an installable PWA; the Windows app blocks every network request.
- **No drug names or doses.** Treatment decisions stay with the medical officer and the flight surgeon.
- **English and Spanish** throughout.

---

## How we built it

### Process
A five-person team split into lanes — integration, crew experience, science engine, design, and content & submission — each working on its own branch and merging small pull requests into an always-deployable `main`. We started from the problem and the users ([`docs/01`](docs/01-problema-y-usuarios.md)), mapped NASA's Human Research Program hazards and risks to indicators with sources ([`docs/04`](docs/04-recursos-nasa.md)), froze a typed contract between the engine and the UI, and built the demo story first. Later we reviewed the app from the point of view of an astronaut and a NASA evaluator ([`docs/07`](docs/07-evaluacion-astronauta-nasa.md)) and used that review to add the crew of four, the simulator and the plain-language "Why?".

### Architecture
```
            ┌────────────── UI (React) ───────────────┐
 sensors →  │ screens · "Why?" · crew · simulator      │ → Earth brief
 check-in → │ reads the engine only through the         │
            │ Engine contract (src/domain/types.ts)     │
            └───────────────────┬──────────────────────┘
                                │
            ┌──────── science engine (pure TypeScript) ─┐
            │ indicators · thresholds + personal baseline│
            │ compound rules · crew rules · projection   │
            │ verify · brief · watch rules · suit rules  │
            └────────────────────────────────────────────┘
```

| Folder | Contents |
|---|---|
| `src/domain/` | The science engine: pure TypeScript, no React, no network, no unseeded randomness, every function unit-tested. `types.ts` is the contract. |
| `src/data/` | The seeded demo mission (day 142 of a Mars transit) and the four crew profiles. |
| `src/app/` | State (Zustand + IndexedDB), the explanation builder, the local-AI wrapper, i18n, Bluetooth. |
| `src/features/` | One folder per screen. `src/components/` holds shared UI. |
| `content/` | All user-facing copy (EN/ES) as JSON. |
| `design/` | pen.dev design files, tokens and brand. |
| `desktop/` | The offline Electron shell for Windows. |
| `docs/` | Team docs (some in Spanish), NASA sources, decisions and AI usage. |

### Stack
TypeScript · React 19 · Vite · Tailwind CSS · Zustand · IndexedDB · Three.js (3D anatomy from Z-Anatomy/BodyParts3D, CC BY-SA 4.0) · Web Bluetooth · vite-plugin-pwa · Electron (Windows build) · WebLLM (optional on-device AI) · Vitest + Testing Library · GitHub Actions · Vercel.

### Use of AI
We used AI coding assistants (Claude Code, OpenAI Codex, DeepSeek) to write and review code, copy and research summaries, always under the rules in [`AGENTS.md`](AGENTS.md). Every use is logged in [`docs/AI_USAGE.md`](docs/AI_USAGE.md) and every technical decision in [`docs/DECISIONS.md`](docs/DECISIONS.md).

### NASA and space-agency resources
Listed in [`docs/NASA_SOURCES.md`](docs/NASA_SOURCES.md) and [`docs/04-recursos-nasa.md`](docs/04-recursos-nasa.md): NASA Human Research Program hazard and risk pages, NASA-STD-3001 (cabin CO₂ limit, career radiation limit) and NASA exercise countermeasure figures.

---

## Run it yourself

```bash
npm install
npm run dev      # http://localhost:5173  (landing page at /, the app at /app/)
npm run check    # types + tests + build (same as CI)
```

### Windows app (offline)
```bash
npm run desktop:build   # writes release/UPRIGHT-win32-x64/UPRIGHT.exe
```
Copy the whole `UPRIGHT-win32-x64` folder, not just the exe. The build downloads the Electron runtime once; the app itself never opens a connection: it serves `dist/` from disk and cancels every other request (`desktop/main.cjs`).

## Known limits
- Prototype thresholds are general adult references, labelled "Prototype" in the app.
- Only the crew member open on a device is saved locally; the other three reload the seeded data.
- The demo watch data is simulated; a real band shows live heart rate but does not yet drive the alarm rules.
- Ultrasound and eye imaging, medicine inventory and treatment protocols are out of scope.

## For the team
| Read | Why |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Rules for every AI assistant and lane ownership |
| [`docs/02-roles-y-flujo.md`](docs/02-roles-y-flujo.md) | Roles, Git workflow, checkpoints |
| [`docs/SUBMISSION.md`](docs/SUBMISSION.md) | Space Apps submission checklist |
| [`design/brand/`](design/brand/README.md) | Brand assets. The repository and package keep their original `kawsay` identifiers; the old demo URL kawsay-ten.vercel.app still works. |

## License
MIT
