# P5-02 · Screen copy → `content/ui.json`

> **Para P5:** abre `content/ui.json` en GitHub (ya tiene una base). Pega `AGENTS.md`, este archivo y el contenido actual de `ui.json` en tu IA. Revisa el resultado y súbelo a la rama `p5/ui-copy` **sin borrar ni renombrar claves existentes** (el código las usa). Entrega: **Sáb 20:00**.

---

Extend the JSON of UI strings for UPRIGHT, a tablet health copilot for astronauts. Keep every existing key and value shape; you may improve existing English values and **add** the sections below.

## Voice
- Calm, warm, short. A good flight controller, not an alarm.
- Imperative for actions ("Drink 250 ml of water"), second person, no exclamation marks.
- Status words are fixed: **OK, Watch, Act, Old data**. Do not change them.
- No medical claims, no numbers except the ones given here.

## Add these sections (keys in English, camelCase)
1. `check` — daily check stepper: title "Daily check", progress pattern "{n} of {total}", buttons Next / Back / Skip / Done, summary title when everything is fine ("All OK today"), summary title when something needs attention, "How to measure" link label, empty state ("No readings yet — start your first check (2 min)").
2. `zone` — names of the 10 body zones as the crew member would say them: eyes, brain, inner_ear ("Balance"), heart, lungs, bones ("Bones and spine"), muscles, kidneys, skin_immune ("Skin and immunity"), gut ("Digestion"). Plus labels "Measure now", "Updated {age} ago", "Related risks".
3. `finding` — labels "Because", "Do this now", "We'll check again in {min} min", primary button "Done, start the timer", "Hazards involved".
4. `verify` — title "Did it work?", outcomes improved / unchanged / worse (one short sentence each, e.g. "Improved — nice work."), buttons "Close", "Send to flight surgeon".
5. `brief` — title "Flight surgeon brief", "Arrives on Earth in {min} min ({time})", "Reply earliest {time}", "What changed", "What the crew member did", "Decision requested", "Queue for downlink", conjunction state "No contact with Earth until Sol {day} · Brief stored", footer "Handled on board. A question to Earth would have taken {roundTrip} min just to get an answer."
6. `environment` — title "Where are you?", one-line description for ISS, Orion, Moon surface (1/6 g), Mars transit, Mars surface (3/8 g); "One-way delay", "Gravity", toggle "Solar conjunction — no contact", button "Use this environment".
7. `future` — "Today", "Arrival · Sol {day}", "Landing readiness", "with your plan", the insight pattern "{days} days of incomplete exercise moved your arrival body. {min} more minutes a day brings it back.", "Adjust my plan", plan labels "Exercise per day", "Water per day", "Sleep per night", "NASA target: 1.5 h/day", slider hint "Drag to see your body on any day".
8. `why` — "Why?", "Source", "NASA figure", "Prototype value — not a NASA figure", "Open source page".

Return only the full JSON.
