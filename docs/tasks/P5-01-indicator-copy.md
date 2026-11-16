# P5-01 · Indicator copy → `content/indicators.json`

> **Para P5:** pega `AGENTS.md` en tu IA y luego todo este archivo. Revisa tú cada frase antes de subirla: tu trabajo es que no haya ni una cifra inventada. Sube el archivo a tu rama `p5/indicator-copy`. Entrega: **Sáb 17:00**.

---

Write the user-facing English copy for 18 health indicators of UPRIGHT, a tablet app for astronauts on a Mars transit. The reader is a crew member who is **not a physician**, is tired, may be wearing gloves, and has **under 3 minutes a day** for this.

## Rules
- Plain English, short sentences, imperative for steps. No jargon without a 3-word explanation.
- `howToMeasure`: **max 4 steps**, each ≤ 8 words.
- `whyItMatters`: **max 2 sentences**, ≤ 35 words total. Calm tone, never scary.
- **Never state a number unless it is in the "Allowed figures" table.** If unsure, say it qualitatively ("can drop", "is a common problem").
- Each entry lists the `sources` keys it relies on (from the list below). Do not invent URLs.

## Allowed figures (and their source key)
| Fact | Key |
|---|---|
| Bone density drops 1–1.5 % per month in microgravity | `bone` |
| Fitness drops 10–12 % on average; 12–38 % of crew lose more than 20 % | `fitness` |
| Exercise target: 1.5 hours a day, 6–7 days a week | `fitness` |
| About 70 % of ISS astronauts show some eye swelling (SANS) | `sans` |
| Cabin CO₂ limit: 3 mmHg as a 1-hour average; headaches reported from ~2.8–4.5 mmHg | `co2` |
| Hypoxia signs: confusion, headache, visual changes, trouble sleeping | `hypoxia` |
| Kidney stones: dehydration plus calcium released from bone | `gravity` |
| Fluids and compression garments before landing help prevent fainting | `cardio` |
| Immune signs: cold sores, rash, unusual allergies, infections | `immune` |
| Decompression signs: joint pain, breathing problems, stroke-like symptoms | `dcs` |
| Journaling and light therapy help with isolation and sleep rhythm | `isolation` |

Source keys available: `bone, fitness, sans, cardio, sensorimotor, hypoxia, immune, microbes, nutrition, sleep, behavioral, dcs, eva, gravity, isolation, distance, environment, co2, prototype`.

## Indicators (ids are fixed)
`bp_systolic` Blood pressure (systolic) · `bp_diastolic` Blood pressure (diastolic) · `heart_rate` Resting heart rate · `glucose` Blood glucose · `body_temp` Body temperature · `sleep_hours` Sleep last night · `mood` Mood (1–5) · `headache_score` Headache (1 none – 5 severe) · `symptom_dizziness` Dizziness · `symptom_vision` Blurred vision · `symptom_confusion` Confusion · `symptom_joint_pain` Joint pain · `symptom_skin` Rash or cold sore · `spo2` Blood oxygen (SpO₂, finger sensor) · `cabin_co2` Cabin CO₂ (read from the cabin panel) · `exercise_min` Exercise today (minutes) · `water_ml` Water today (mL) · `strength_self_pct` Weekly strength self-test (% of pre-flight)

## Output format (exactly this JSON shape, all 18 ids)
```json
{
  "heart_rate": {
    "howToMeasure": ["Sit still for 2 minutes", "Put the sensor on your finger", "Wait for a steady number", "Enter it"],
    "whyItMatters": "Your heart adapts to weightlessness and can struggle when gravity returns. A change from your usual number is an early sign.",
    "scaleLabels": null,
    "sources": ["cardio", "prototype"]
  },
  "mood": {
    "howToMeasure": ["Pick the level that fits right now"],
    "whyItMatters": "Isolation, short sleep and heavy workload can lower mood and focus. Noticing it early lets you act before it affects the mission.",
    "scaleLabels": ["Very low", "Low", "Okay", "Good", "Great"],
    "sources": ["isolation", "behavioral"]
  }
}
```
`scaleLabels`: 5 words for `mood` and `headache_score` (`"None", "Mild", "Moderate", "Strong", "Severe"`), `null` for the rest.

Return only the JSON.
