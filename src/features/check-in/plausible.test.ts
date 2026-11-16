import { describe, expect, it } from 'vitest';
import { implausible } from './index';

describe('implausible', () => {
  it('stops typing errors, lets real extremes through', () => {
    expect(implausible('bp_systolic', '1200')).toBe(true);
    expect(implausible('bp_systolic', '0')).toBe(true);
    expect(implausible('bp_systolic', '200')).toBe(false);
    expect(implausible('body_temp', '3.7')).toBe(true);
    expect(implausible('mood', '9')).toBe(false); // scales are buttons, not typed
    expect(implausible('bp_systolic', '')).toBe(false);
  });
});
