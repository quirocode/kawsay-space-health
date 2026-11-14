# Prompt para diseñar las pantallas

Sirve en cualquier herramienta de diseño con IA. Copia todo lo que está debajo de la línea y pégalo como un solo mensaje. Si la herramienta se queda corta, pega primero las secciones 1 a 5 y luego las pantallas de la sección 6 de dos en dos.

Orden de trabajo: las 8 pantallas **P0** primero (son la demo). Las demás, solo si sobra tiempo.

---

You are designing **KAWSAY**, a desktop health monitor for astronauts on long missions. It is a prototype for NASA Space Apps Challenge 2026 ("Create Health Monitoring Software for Astronauts on Space Missions"). Design the components and the screens listed below, with the real content given. Do not invent other screens.

## 1. The product

A crew member wears a wrist watch that measures their body every second. KAWSAY watches those readings. When something is wrong, for example the heart rate climbs while the person is resting, it **raises an alarm, shows the person's state, and walks them through what to do**, then checks whether it worked and tells the crew and Earth if it did not.

It answers four questions, in this order: **Am I OK right now? What do I do? Did it work? Who needs to know?**

## 2. Who uses it and where

- A **crew member on a Mars transit**. Not a physician: an engineer, pilot or scientist with basic medical training.
- They look at it for seconds at a time. During an alarm they may be frightened, dizzy or short of breath.
- **Desktop window, 1440 × 900.** It must still work at 1194 × 834. The screen may be touched with gloves, so no hover-only, long-press or swipe-only actions.
- Earth is **14 minutes away** each way. Nobody on the ground can help in the first half hour.
- Judges will see it for 10 seconds in a 30-second video. The alarm and the "Now" screen must explain the idea with no narration.

## 3. Principles

1. **One decision per screen.** One primary button. Everything else is secondary.
2. **Readable from one metre in two seconds.** The state of the person comes first, as a sentence, before any number.
3. **Colour is never alone.** Every status is colour + icon + word.
4. **One alarm, and only one.** A single full-window takeover exists, for the Emergency level. Everything else is quiet. Nothing blinks faster than once per second. No red backgrounds behind text.
5. **Old data looks old.** A reading that is too old is never green: it is grey-violet, hatched, and says how old it is. With no data, the app never says "You are OK".
6. **Honest numbers.** Every threshold shows a small tag: `NASA` (official figure) or `Prototype` (our value). A "Why?" link shows the source.
7. **No sci-fi HUD.** No neon on black, no hexagon grids, no glowing scanlines, no fake telemetry noise. This is an instrument for a tired person, not a film prop.
8. **Plain words.** Short imperative sentences. Never "tachycardia"; say "heart rate high while resting".

## 4. Visual system (already defined: use these exact values)

KAWSAY means "life" in Quechua. The identity is a warm instrument: natural-dye colours and woven thread, used with restraint. No Inca clichés, no ornamental borders.

### Colour tokens

| Token | Use | Day | Night ("Mars") |
|---|---|---|---|
| `bg` | Window background | #F7EFE8 | #1A1311 |
| `surface-1` | Cards, sheets | #FFFAF6 | #251B17 |
| `surface-2` | Secondary panels, inputs | #F0E3D9 | #33251F |
| `surface-3` | Pressed, tracks | #E6D4C7 | #3F2E27 |
| `border` | Dividers, outlines | #DCC6B6 | #4A372E |
| `text` | Primary text | #2A1C16 | #F2E6DC |
| `text-muted` | Secondary text | #75604F | #B09A8C |
| `inti` | Brand: primary buttons, active nav, focus ring | #B5602D | #E0925E |
| `on-inti` | Text on brand | #FFFAF6 | #1A1311 |
| `green` | Status OK | #3F8A5A | #8FB996 |
| `yellow` | Status Watch | #A26F0E | #E3B04B |
| `red` | Status Act / Act now | #C2412F | #E5675A |
| `stale` | Old or missing data, with diagonal hatch | #6E6585 | #9A8FA8 |

Each status has a pale tint for backgrounds (the same colour at 8 to 12 % opacity). Add no new colours.

### Status language

| Level | Word | Icon | Colour |
|---|---|---|---|
| Emergency | **Act now** | open hand, filled | `red`, solid fill |
| Warning | **Act** | open hand, outline | `red`, outline |
| Caution | **Watch** | eye | `yellow` |
| Normal | **OK** | check in a circle | `green` |
| No data | **Old data** | clock with a slash, hatched | `stale` |

### Type

- **Instrument Sans** for everything.
- **JetBrains Mono** only for numbers that update live, with tabular figures, so they do not jump.
- Sizes (px): Display 56 · H1 34 · H2 26 · Body-L 20 · Body 18 · Caption 15. Nothing smaller than 15.
- Sentence case everywhere. No all-caps labels.

### Layout

- 8-px grid. Radius 16 for cards, 10 for chips, full for pills.
- Touch targets at least 56 × 56. Primary buttons 72 tall.
- Left-aligned text. Two elevations only: card and sheet.
- Rounded line icons, 2 px stroke, one family throughout.
- Motion is slow and answers an action. Give every animated element a still version for reduced motion.

### The signature element: the pulse thread

A thin strip under the top bar on every screen except the alarm. It draws the **last 30 minutes of heart rate as one single thread**, over a faint band that marks the person's usual resting range. Every alert leaves **a knot** on the thread; a bigger knot means a more serious alert. At the right end, the live value: "64 bpm · resting".

- Calm: the thread runs flat inside the band.
- Rising: the thread leaves the band and takes the status colour.
- No data: the thread stops where the signal was lost and continues as a hatched line, with "No signal · 4 min".

The knot is the only decorative idea in the product. Use it in two places: the pulse thread and the alert history. Nowhere else.

## 5. App frame (every screen except the alarm)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ KAWSAY  Sol 142 of 180 · Mars transit  (Earth delay 14 min)                    │ 64
│                          (Watch · live · 82 %) (Demo) (☾) [Report a symptom] │
├──────┬───────────────────────────────────────────────────────────────────────┤
│ Now  │ ~~~~~~~~~~~~~~~~~~~~ pulse thread ~~~~~~~●~~~~~~~~~   64 bpm · resting │ 48
│ Watch├───────────────────────────────────────────────────────────────────────┤
│Alerts│                                                                       │
│ Body │                         screen content                                │
│Check │                                                                       │
│ Brief│                                                                       │
└──────┴───────────────────────────────────────────────────────────────────────┘
  96
```

- **Top bar, 64 px:** wordmark "KAWSAY" in `inti` · "Sol 142 of 180 · Mars transit" · pill "Earth delay 14 min" · on the right: watch pill "Watch · live · 82 %", outlined pill "Demo", day/night button, and an outlined button **"Report a symptom"** with a hand icon.
- **Left rail, 96 px:** six destinations, icon above word, 72 px tall each: "Now", "Watch", "Alerts" (with a count badge), "Body", "Check-in", "Brief". The active one is filled with `inti`.
- **Pulse thread, 48 px.**

**Demo content, the same on every screen:** Sol 142 of 180, Mars transit, Earth delay 14 min. Crew member **A. Quispe**. Crew medical officer on board **M. Huamán**. Time **14:32**. Quispe slept 5 h 10 min and has drunk 1.1 L of water today.

## 6. Screens

Build in this order. P0 screens are the demo.

| # | Screen | Priority |
|---|---|---|
| 00 | Components and states | P0 |
| 01 | Now | P0 |
| 02 | Alarm | P0 |
| 03 | Respond | P0 |
| 04 | Recheck | P0 |
| 05 | Escalate | P0 |
| 06 | Watch data | P0 |
| 07 | Alerts | P0 |
| 08 | Signal detail | P1 |
| 09 | Alert report | P1 |
| 10 | Body | P1 |
| 11 | Check-in | P1 |
| 12 | Report a symptom | P1 |
| 13 | Brief | P1 |
| 14 | Are you OK? | P2 |
| 15 | Watch setup | P2 |
| 16 | Settings | P2 |

### 00 · Components and states (P0)

One sheet with every reusable piece, each in all its states, in day and night:

- **Level tag:** Act now, Act, Watch, OK, Old data.
- **Signal tile** (the most repeated piece): name, large value, unit, level tag, a one-hour sparkline over the "your usual" band, context line ("resting · 22 min"), time of last reading. States: OK, Watch, Act, Old data (hatched, with age), Learning (no band yet).
- **Watch pill:** Live, Syncing, Off wrist, No signal · 4 min, Battery 8 %.
- **Pulse thread:** calm, rising, with a knot, cut.
- **Knot:** three sizes, one per level.
- **Caution banner** and **Warning sheet.**
- **Response step:** instruction, question with options, measurement with number pad, timer.
- **Source tags:** `NASA`, `Prototype`, and the "Why?" link.
- **Delay track:** a line with three marks: sent, arrives, earliest answer.
- Primary and secondary buttons, left rail, top bar.

### 01 · Now (P0)

The home screen. It answers "am I OK right now?" in two seconds.

```
┌───────────────────────────────────────────────┬──────────────────────────┐
│ ✓ OK                                          │ Today's routine  3 of 5  │
│ You are OK.                                   │  Blood pressure · due now│
│ Nothing needs your attention.                 │  Evening exercise · 38…  │
│ Resting for 22 min · last reading 2 s ago     │  [Measure blood pressure]│
│                                               ├──────────────────────────┤
│ ┌─────────┐┌─────────┐┌─────────┐┌─────────┐  │ Last alert               │
│ │Heart    ││Blood    ││Breathing││Skin     │  │  Yesterday 21:10 · …     │
│ │rate     ││oxygen   ││         ││temp     │  ├──────────────────────────┤
│ │64 bpm   ││97 %     ││14 /min  ││+0.1 °C  │  │ Cabin                    │
│ └─────────┘└─────────┘└─────────┘└─────────┘  │  CO₂ 2.1 mmHg · OK  NASA │
│ (small body figure)                           │  Radiation · normal      │
├───────────────────────────────────────────────┴──────────────────────────┤
│ ||||||||||||||||||||||||| woven band: one thread per day, 142 so far ||| │
└──────────────────────────────────────────────────────────────────────────┘
```

- **State sentence** at 56 px: "You are OK. Nothing needs your attention." with the OK tag above it. Below, muted: "Resting for 22 min · last reading 2 s ago".
- **Four signal tiles** in a row: Heart rate **64 bpm** · Blood oxygen **97 %** · Breathing **14 /min** · Skin temperature **+0.1 °C** "vs your usual".
- **Right column, three cards:**
  - "Today's routine" · "3 of 5 done". Pending: "Blood pressure · due now · 2 min" and "Evening exercise · 38 min left of 90" (`NASA` tag on the 90). Primary button **"Measure blood pressure"**.
  - "Last alert" · "Yesterday 21:10 · Blood oxygen low while sleeping · resolved on board in 6 min".
  - "Cabin" · "CO₂ 2.1 mmHg · OK" (`NASA`, limit 3) and "Radiation · normal".
- **Small body figure**, front view, ten zones tinted by status. It links to Body.
- **Woven band** along the bottom: 142 thin vertical threads, one per mission day, today highlighted.

Also draw two more states of this screen:

- **Caution:** an amber banner above the sentence: "Your heart rate is rising while you rest · 112 bpm" with a "See why" link. The heart-rate tile turns to Watch and the pulse thread climbs out of its band.
- **No watch data:** all four tiles in Old data. The sentence becomes "No data from your watch for 4 min." and the primary button is "Check the watch".

### 02 · Alarm (P0)

The only screen that fills the whole window: no rail, no top bar, no pulse thread. It appears by itself when the watch detects an emergency.

```
┌══════════════════════════════════════════════════════════════════════════┐
║ ✋ Act now                                                     14:32:10  ║
║                                                                          ║
║ Your heart rate is 134 bpm                                               ║
║ and you are resting.                                                     ║
║ Above 130 for 2 minutes. Your usual resting rate is 56 to 68. Prototype  ║
║                                                                          ║
║ ┌ Your state now ────────────────────┐  ┌ Do this first ───────────────┐ ║
║ │ Heart rate   134 bpm  Act  /‾‾‾‾   │  │ Stop what you are doing.     │ ║
║ │ Blood oxygen  96 %    OK           │  │ Hold on to a handrail.       │ ║
║ │ Breathing     19 /min Watch        │  └──────────────────────────────┘ ║
║ │ Skin temp    +0.2 °C  OK           │  [ I'm here. Start the check    ] ║
║ │ Movement     Still for 22 min      │  ( Call a crewmate now )         ║
║ └────────────────────────────────────┘                                   ║
║ No answer in 0:48 and KAWSAY alerts the crew.  ▓▓▓▓▓▓░░░░     (Silence)  ║
└══════════════════════════════════════════════════════════════════════════┘
```

- An 8 px `red` border around the whole window, pulsing slowly once per second (solid in the reduced-motion version). The background stays `bg`, not red.
- "Act now" tag, and the time "14:32:10".
- **Headline** at 56 px: "Your heart rate is 134 bpm and you are resting."
- Below it: "Above 130 for 2 minutes. Your usual resting rate is 56 to 68." with a `Prototype` tag.
- **"Your state now" panel**, live:
  - Heart rate **134 bpm** · Act · a 10-minute trace with the climb visible
  - Blood oxygen **96 %** · OK
  - Breathing **19 /min** · Watch
  - Skin temperature **+0.2 °C** · OK
  - Movement: "Still for 22 min"
- **First step**, in a highlighted box titled "Do this first": "Stop what you are doing. Hold on to a handrail."
- Primary button, 72 px: **"I'm here. Start the check"**.
- Secondary button: "Call a crewmate now".
- A countdown with a thin bar: "No answer in 0:48 and KAWSAY alerts the crew."
- A small "Silence" button with a speaker icon.

Also draw the **Warning variant**: the same content in a centred sheet 720 px wide, over a dimmed "Now" screen, with no border pulse and no countdown.

### 03 · Respond (P0)

A guided response: one step per screen, with the live state always visible.

```
┌─────────────────────────────────────────────┬────────────────────────────┐
│ Step 1 of 5                                 │ Your state now             │
│                                             │  Heart rate   131 bpm  Act │
│ Do you have any of these right now?         │  Blood oxygen  96 %    OK  │
│                                             │  Breathing     19 /min     │
│ [ Chest pain or pressure          ]         │  Skin temp    +0.2 °C      │
│ [ Trouble breathing               ]         ├────────────────────────────┤
│ [ Dizzy or about to faint         ]         │ What KAWSAY thinks         │
│ [ Heart pounding or skipping      ]         │  Likely: dehydration and   │
│ [ None of these                   ]         │  fatigue.                  │
│                                             │  · Low water today …       │
│                              [ Next ]       │  · Short sleep …   Why?    │
├─────────────────────────────────────────────┴────────────────────────────┤
│ ( Call a crewmate now )                                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

Left side, 60 %. Draw all five steps as separate frames:

1. **Question.** "Do you have any of these right now?" Large options, more than one can be selected: "Chest pain or pressure", "Trouble breathing", "Dizzy or about to faint", "Heart pounding or skipping", "None of these". Button: "Next".
2. **Measure with the watch.** "Record your heart rhythm." "Rest your arm. Touch the crown with a finger of your other hand." A 30-second ring. Result state: "Rhythm regular · 131 bpm". Button: "Start recording".
3. **Measure by hand.** "Measure your blood pressure." Three short instructions ("Sit still for one minute", "Cuff on the upper arm, at heart level", "Press start") and a number pad showing **104 / 68 mmHg**. Button: "Save reading".
4. **Timer.** "Breathe slowly for 2 minutes." A shape that grows for 4 seconds and shrinks for 6, with the live heart rate beside it. Button: "Done".
5. **Action.** "Drink 250 ml of water." with "Today you logged 1.1 L of 2.5 L". Button: "Done".

Right side, 40 %, fixed across all steps:

- **"Your state now":** the four signals, compact.
- **"What KAWSAY thinks":** "Likely: dehydration and fatigue." Reasons, each with a source tag: "Low water today: 1.1 L of 2.5 L", "Short sleep: 5.2 h average over 3 nights", "No fever, oxygen normal". A separate line: "Not ruled out: a rhythm problem. That is why we record it." And a "Why?" link.

Always visible at the bottom: "Call a crewmate now".

### 04 · Recheck (P0)

Did it work? Draw three frames.

- **Waiting:** "Checking again in 10:00" with a ring. A live heart-rate trace with a mark at "134 at 14:32". Text: "Stay resting. Keep the watch on."
- **Improved:** "134 → 88 bpm. Back in your usual range after 9 minutes." OK tag. Primary button **"Close and log"**. Secondary: "Tell Earth anyway".
- **Unchanged:** "Still 126 bpm after 10 minutes." Act tag. Primary button **"Tell the crew and Earth"**.

### 05 · Escalate (P0)

Who finds out, and when they can answer.

- Headline: "This needs another person."
- **"On board, now":** a card "M. Huamán · crew medical officer" with "Alert sent 14:44 · seen 14:45".
- **"Earth":** the delay track with three marks: "Sent 14:44", "Arrives 14:58", "Earliest answer 15:12". Below: "Earth is 14 minutes away. Do not wait for the answer to act."
- **Brief preview:** headline "Resting heart rate 134 bpm, unchanged after first response"; what changed; what was done and the result; and the decision requested: "Should A. Quispe stay off exercise and EVA prep for 24 hours?"
- **"While you wait":** "Stay resting", "Keep the watch on", "KAWSAY checks again every 10 minutes", "No exercise or EVA prep".
- Primary button **"Send brief"**. Draw the sent state too: "Brief sent · 14:44".
- Draw the **no-contact state**: no delay track. "No contact with Earth for 9 days. The crew medical officer decides."

### 06 · Watch data (P0)

Everything the watch collects, in one place.

```
┌──────────────────────────────────────────────────────┬───────────────────┐
│ Watch · on wrist · live   Battery 82 %   2 s ago     │ The watch cannot  │
│ Signal quality: good                                 │ measure these     │
├──────────────────────────────────────────────────────┤                   │
│ ┌Heart rate ┐ ┌Blood oxygen┐ ┌Breathing  ┐           │ Blood pressure    │
│ │ 64 bpm    │ │ 97 %       │ │ 14 /min   │           │  118/76 · 7 h ago │
│ └───────────┘ └────────────┘ └───────────┘           │ Blood sugar       │
│ ┌Skin temp  ┐ ┌Variability ┐ ┌Activity   ┐           │  92 mg/dL · 7 h   │
│ │ 33.7 °C   │ │ 42 ms      │ │ Resting   │           │ Body temperature  │
│ └───────────┘ └────────────┘ └───────────┘           │  36.7 °C · 7 h    │
├──────────────────────────────────────────────────────┤ Mood              │
│ Today                                                │  3 of 5 · 7 h     │
│ [sleep][rest][active][exercise][rest]   activity lane│                   │
│ ~~~~~~~~~~~~~~~~~~~●~~~~~~~~~~~~~~      heart rate   │ [Start check-in]  │
│ Sleep last night 5 h 10 min · Exercise 52 of 90 min  │                   │
└──────────────────────────────────────────────────────┴───────────────────┘
```

- **Device card:** "Watch · on wrist · live" · "Battery 82 %" · "Last reading 2 s ago" · "Signal quality: good".
- **Six signal tiles**, 3 × 2: Heart rate 64 bpm · Blood oxygen 97 % · Breathing 14 /min · Skin temperature 33.7 °C (+0.1) · Heart rate variability 42 ms · Activity "Resting · 22 min".
- **"Today"**, full width: a 24-hour line. On top, an activity lane in blocks (sleep, rest, active, exercise). Below it, the heart-rate trace aligned with the lane. Knots mark the alerts.
- **Two summaries:** "Sleep last night: 5 h 10 min" (Watch tag) and "Exercise today: 52 of 90 min" (`NASA` tag).
- **Right column, "The watch cannot measure these":** Blood pressure "118/76 · 7 h ago", Blood sugar "92 mg/dL · 7 h ago", Body temperature "36.7 °C · 7 h ago", Mood "3 of 5 · 7 h ago". Primary button **"Start check-in"**.

### 07 · Alerts (P0)

- **Active alerts** on top, as cards: level tag, title "Heart rate high while resting", "resting · started 14:32", state "Checking again in 6:40", button "Continue".
- **The mission cord:** one horizontal line with a segment per day and knots where alerts happened. Tapping a knot filters the list.
- **History**, as a list. Columns: time, level, title, context, outcome. Rows:
  - "Today 14:32 · Act now · Heart rate high while resting · resting · Open"
  - "Yesterday 21:10 · Act · Blood oxygen low while sleeping · sleep · Resolved on board in 6 min"
  - "Sol 139 07:40 · Watch · Short sleep three nights in a row · — · Resolved"
  - "Sol 131 16:05 · Act · Slow down · exercise · Resolved on board in 5 min"
- Filters: "All", "Act now", "Act", "Watch".
- Draw the **empty state**: "No alerts so far. Your watch is checking every second."

### 08 · Signal detail (P1)

Example: heart rate.

- Range selector: "1 h", "24 h", "7 days", "Mission".
- **Large chart:** the trace, the "your usual" band, labelled threshold lines ("Alert while resting: 110" with a `Prototype` tag), the activity lane under it, and knots at the alerts.
- Three text blocks: **"How it is measured"** ("A light sensor on the back of the watch. Keep the strap snug, one finger above the wrist bone."), **"Why it matters in space"** ("Your heart and blood vessels adapt to weightlessness. A resting rate far from your usual can mean dehydration, fever, low oxygen or a rhythm problem." with a `NASA` source link) and **"When KAWSAY alerts"** (a small table: "110 or more while resting, for 5 min · Act", "130 or more while resting, for 2 min · Act now", "Below 40 while awake, for 5 min · Act", each with a `Prototype` tag).
- Note: "Readings during fast movement are less reliable."

### 09 · Alert report (P1)

The record of one event.

- **Timeline:** "14:32:10 Detected" → "14:32:31 Confirmed (21 s)" → "Symptoms: heart pounding" → "Rhythm regular" → "Blood pressure 104/68" → "Breathing, 2 min" → "14:44 Checked again: 88 bpm, improved" → "Closed".
- A chart of the signal during the event, with a mark at each step.
- Likely causes, with source tags.
- A switch "Include in the next brief" and a button "Export report".

### 10 · Body (P1)

The clickable human figure.

- **Left:** a simple, front-facing, gender-neutral figure with ten zones tinted by status: eyes, brain, inner ear, heart, lungs, bones, muscles, kidneys, skin, gut. Each zone is its own tappable shape, at least 56 px. Here the heart is in Act.
- **Right, zone panel** (Heart selected): **"What it does"** ("Pumps blood to your whole body."), status, **"What feeds it"** ("Heart rate 134 bpm · watch · 2 s ago", "Blood pressure 118/76 · check-in · 7 h ago"), **"How space affects it"** ("Without gravity the heart works less and blood pressure can drop on landing." `NASA`) and **"What you can do"** ("Exercise 90 minutes a day", "Drink before landing").
- A two-option switch "Today / Arrival · Sol 180". Draw the Arrival state too: a second figure in `inti` with a dashed outline, the number **"Landing readiness 66"** with "with your plan: 89", and four task cards: "Stand up without fainting · Watch", "Read the displays · OK", "Climb out and walk · Watch", "Run the landing checklist · Watch".

### 11 · Check-in (P1)

What the watch cannot measure, in under two minutes. One step per screen, with progress "2 of 7".

- First screen, **"From your watch"**: "Sleep 5 h 10 min" and "Resting heart rate 62 bpm", read-only. Button "Looks right".
- Then: blood pressure (number pad, **118 / 76 mmHg**), blood sugar (**92 mg/dL**), body temperature (**36.7 °C**), mood (five large faces, 1 to 5), symptoms (toggles: "Headache", "Dizziness", "Blurred vision", "Confusion", "Joint pain", "Skin sore or rash") and water (**1.1 L**).
- Every step shows **"How to measure"** in three short lines and **"Why it matters"** in one.
- Last screen: "Done in 1 min 40 s." and one new thread added to the woven band.

Draw the blood pressure step and the mood step in full; the others can be thumbnails.

### 12 · Report a symptom (P1)

- Headline: "What is happening?"
- A 4 × 2 grid of large buttons, each with an icon: "Chest pain or pressure", "Trouble breathing", "Fainted or about to faint", "Face droop, weak arm or slurred speech", "Joint pain after an EVA", "Severe pain in your side", "Sudden vision change", "I'm not OK".
- Below: "Something else" (opens the body figure to point at where).
- At the bottom: "Call a crewmate now".

### 13 · Brief (P1)

One screen for the flight surgeon on Earth.

- Header: "Flight surgeon brief · Sol 142 · 14:44" and "Arrives on Earth at 14:58".
- **Headline:** "Resting heart rate reached 134 bpm; back to 88 after on-board response."
- **"What changed":** "Heart rate 134 bpm at rest for 4 min", "Sleep 5.2 h average over 3 nights", "Water 1.1 L of 2.5 L".
- **"What the crew member did":** "Rhythm recorded: regular", "Blood pressure 104/68", "2 min slow breathing, 250 ml water", "Rechecked at 14:44: improved".
- **"Decision requested":** "Should A. Quispe stay off exercise and EVA prep for 24 hours?"
- **"Watch events since the last brief":** two rows with a small chart each.
- "Landing readiness 66 · with plan 89".
- Primary button **"Send to Earth"**.

### 14 · Are you OK? (P2)

For a hard impact followed by no movement. Two frames.

- **On the person's screen:** "Are you OK, Quispe?" Two buttons, each half the window: **"I'm OK"** and **"I need help"**. A 30-second countdown.
- **What the crew sees if nobody answers:** "A. Quispe needs help." "Hab module · heart rate 148 · no movement for 40 s." Primary button **"I'm going"**.

### 15 · Watch setup (P2)

Three steps: "Put the watch on", "Pair it", "KAWSAY learns your normal". The third explains: "For 7 days, alerts use general adult limits. After that they use yours." with progress "Day 3 of 7".

### 16 · Settings (P2)

A sheet over any screen: environment (ISS, Orion, Moon, Mars transit, Mars surface) and mission phase, Earth delay, "Play the alarm sound" with a volume slider, night palette, reminder times, "Reset the demo", "Export my data", and the source list with the line "Prototype for a hackathon. Not a medical device."

## 7. What to deliver

- Screen 00 with all components and states.
- Every screen in **day mode** at 1440 × 900.
- Screens 01, 02 and 06 also in **night mode**.
- Screen 01 also at 1194 × 834, to show the layout holds.
- One PNG per frame, named `NN-screen-name.png` (for example `02-alarm.png`, `02-alarm-warning.png`).
- No NASA logos or mission patches. If any image is AI-generated, it needs a visible watermark.
