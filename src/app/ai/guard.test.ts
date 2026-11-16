import { describe, expect, it } from 'vitest';
import { checkRewrite } from './guard';

const SOURCE = [
  'What it means: Your blood pressure is above the safe range.',
  'In your case: Your reading: 200 mmHg · 4 h ago. “Act” range: 160 or more (prototype value). Your usual: 116–121 mmHg over the last 7 days.',
  'Do this now: Sit still for 5 minutes with the cuff at heart level, then measure again.',
  'When we check again: Measure again in 5 minutes.',
].join('\n');

describe('checkRewrite', () => {
  it('accepts a shorter rewording that keeps the same numbers', () => {
    const out = 'Your pressure is 200, much higher than your usual 116–121. Sit still for 5 minutes and measure again.';
    expect(checkRewrite(SOURCE, out)).toEqual({ ok: true, text: out });
  });

  it('rejects a number the rules never said', () => {
    expect(checkRewrite(SOURCE, 'Your pressure is 200. Wait 15 minutes and measure again, it should drop.')).toEqual({ ok: false, reason: 'new_number' });
  });

  it('rejects a diagnosis or a drug', () => {
    expect(checkRewrite(SOURCE, 'You have hypertension. Rest for 5 minutes and measure again please.')).toEqual({ ok: false, reason: 'diagnosis' });
    expect(checkRewrite(SOURCE, 'Take some aspirin and rest for 5 minutes, then measure again.')).toEqual({ ok: false, reason: 'diagnosis' });
  });

  it('rejects empty, long or linked answers', () => {
    expect(checkRewrite(SOURCE, ' ')).toEqual({ ok: false, reason: 'empty' });
    expect(checkRewrite(SOURCE, 'word '.repeat(200))).toEqual({ ok: false, reason: 'too_long' });
    expect(checkRewrite(SOURCE, 'Read more at https://nasa.gov about your pressure, then measure again.')).toEqual({ ok: false, reason: 'link' });
  });

  it('reads Spanish decimals as the same number', () => {
    const es = 'Qué significa: bebiste poca agua. En tu caso: el agua promedió 1.5 L en 3 días.';
    expect(checkRewrite(es, 'Bebiste poca agua: solo 1,5 L al día en los últimos 3 días.').ok).toBe(true);
  });
});
