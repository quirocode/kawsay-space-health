# design/ — owner: P4

- `kawsay.pen` — pen.dev document (plain JSON; open it with the pen.dev app; the file name keeps the old project identifier). Contains:
  - the **design system** (variables: light + night palettes Mars, JWST, Lunar, Aurora, Earthrise);
  - **Components**: status badges (OK / Watch / Act / Old data), NASA / Prototype tags, primary and secondary buttons, top bar, nav bar, body figure with one shape per zone;
  - **8 screens** (1194 × 834, tablet landscape) with the Sol 142 content: 01 Home · Future Self, 02 Daily check, 03 Zone detail, 04 Finding and action, 05 Verification, 06 Flight surgeon brief, 07 Environment, 08 Home at night (Mars palette).
- `PEN_PROMPT.md` — the design brief.
- `exports/tokens.json` — colours, fonts, radii (source for `src/app/tokens.css`; run `node scripts/tokens-to-css.mjs` after changes).
- `exports/body.svg` — human figure, one element id per zone: `eyes brain inner_ear heart lungs bones muscles kidneys skin_immune gut` (+ `silhouette`).
- `exports/screens/` — PNG of every screen, for the video, slides and the project page.
