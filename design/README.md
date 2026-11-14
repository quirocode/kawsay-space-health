# design/ — owner: P4

- `kawsay.pen` — pen.dev file (open it with the pen.dev app; it is encrypted). Today it holds the **design system** (variables); screens still to come.
- `PEN_PROMPT.md` — the design brief.
- `exports/tokens.json` — colours (light + night palettes Mars, JWST, Lunar, Aurora, Earthrise), fonts, radii. P1 exported it from `kawsay.pen`.
  After changing variables in pen.dev, re-export and run `node scripts/tokens-to-css.mjs` (or ask P1).
- Still needed: `exports/body.svg` (one element id per zone: `eyes brain inner_ear heart lungs bones muscles kidneys skin_immune gut`) and screen PNGs `01-home.png` … `07-environment.png`.
