import { describe, expect, it } from 'vitest';
import { cleanNumber } from './index';

describe('cleanNumber (typed Daily check values)', () => {
  it('keeps digits and drops anything else', () => {
    expect(cleanNumber('12a0 mmHg', false)).toBe('120');
  });
  it('keeps one decimal point only where decimals are allowed', () => {
    expect(cleanNumber('36.6.1', true)).toBe('36.61');
    expect(cleanNumber('36.6', false)).toBe('366');
  });
  it('accepts a comma as the decimal point and adds a leading zero', () => {
    expect(cleanNumber('7,5', true)).toBe('7.5');
    expect(cleanNumber('.5', true)).toBe('0.5');
  });
  it('stops at five digits, like the keypad', () => {
    expect(cleanNumber('1234567', false)).toBe('12345');
  });
});
