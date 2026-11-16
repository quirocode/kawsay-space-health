/**
 * Safety check for the local AI rewrite (P1). Pure and deterministic.
 * The model may only reword the rules' explanation. Its answer is thrown away, and the rules
 * text is shown instead, when it adds a number, names a diagnosis, adds a link, or grows too long.
 */

export type GuardResult = { ok: true; text: string } | { ok: false; reason: 'empty' | 'too_long' | 'new_number' | 'diagnosis' | 'link' };

/** Numbers as written in either language: 2.5, 2,5, 1500, 1–5. */
function numbers(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/\d+(?:[.,]\d+)?/g)) out.add(m[0].replace(',', '.'));
  return out;
}

const WORDS = /[\p{L}\p{N}]+/gu;
const countWords = (text: string) => (text.match(WORDS) ?? []).length;

/** Words that turn an explanation into a diagnosis or a prescription. Not exhaustive: a tripwire. */
const DIAGNOSIS = [
  /\bdiagnos/i, /\bdiagnós/i, /\bdisease\b/i, /\benfermedad(es)?\b/i,
  /\bheart attack\b/i, /\binfarto\b/i, /\bstroke\b/i, /\bictus\b/i, /\bderrame\b/i,
  /\bcancer\b/i, /\bcáncer\b/i, /\btumou?r\b/i, /\bhypertension\b/i, /\bhipertensión\b/i,
  /\bdiabet/i, /\barrhythmia\b/i, /\barritmia\b/i, /\bembolism\b/i, /\bembolia\b/i,
  /\bprescri/i, /\breceta\b/i, /\b\d+\s?mg\b/i, /\bibuprofen|\bparacetamol|\baspirin/i,
];

/** Accept the rewrite only if it stays inside what the rules said. */
export function checkRewrite(source: string, rewrite: string): GuardResult {
  const text = rewrite.trim().replace(/\n{3,}/g, '\n\n');
  if (countWords(text) < 5) return { ok: false, reason: 'empty' };
  if (countWords(text) > Math.max(60, countWords(source) * 1.3)) return { ok: false, reason: 'too_long' };
  if (/https?:\/\/|www\./i.test(text)) return { ok: false, reason: 'link' };
  const allowed = numbers(source);
  for (const n of numbers(text)) if (!allowed.has(n)) return { ok: false, reason: 'new_number' };
  // A word the rules text already used (e.g. a finding title) is not new; anything else is.
  for (const re of DIAGNOSIS) if (re.test(text) && !re.test(source)) return { ok: false, reason: 'diagnosis' };
  return { ok: true, text };
}
