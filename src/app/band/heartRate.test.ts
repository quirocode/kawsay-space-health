import { describe, expect, it } from 'vitest';
import { BAND_LINK, freshness, isUsable, keepWindow, parseHeartRateMeasurement, reconnectDelayMs } from './heartRate';

const packet = (...bytes: number[]) => new DataView(new Uint8Array(bytes).buffer);

describe('parseHeartRateMeasurement', () => {
  it('reads an 8-bit value with no extras (what Xiaomi bands send: 00 bpm)', () => {
    expect(parseHeartRateMeasurement(packet(0x00, 72))).toEqual({ bpm: 72, contact: 'unknown', rrMs: [] });
  });

  it('reads a 16-bit value', () => {
    expect(parseHeartRateMeasurement(packet(0x01, 0x2c, 0x01)).bpm).toBe(300);
  });

  it('reports skin contact only when the sensor supports it', () => {
    expect(parseHeartRateMeasurement(packet(0x06, 60)).contact).toBe('yes');
    expect(parseHeartRateMeasurement(packet(0x04, 60)).contact).toBe('no');
    expect(parseHeartRateMeasurement(packet(0x02, 60)).contact).toBe('unknown');
  });

  it('skips energy expended and converts RR intervals from 1/1024 s to ms', () => {
    // flags: RR + energy; bpm 64; energy 0x0010; RR 1024 (1000 ms) and 512 (500 ms)
    const m = parseHeartRateMeasurement(packet(0x18, 64, 0x10, 0x00, 0x00, 0x04, 0x00, 0x02));
    expect(m.bpm).toBe(64);
    expect(m.rrMs).toEqual([1000, 500]);
  });

  it('rejects packets that are too short', () => {
    expect(() => parseHeartRateMeasurement(packet(0x00))).toThrow();
    expect(() => parseHeartRateMeasurement(packet(0x01, 0x40))).toThrow();
  });
});

describe('link rules', () => {
  it('drops 0 bpm, off-skin and implausible values', () => {
    expect(isUsable({ bpm: 0, contact: 'unknown', rrMs: [] })).toBe(false);
    expect(isUsable({ bpm: 70, contact: 'no', rrMs: [] })).toBe(false);
    expect(isUsable({ bpm: 300, contact: 'yes', rrMs: [] })).toBe(false);
    expect(isUsable({ bpm: 70, contact: 'unknown', rrMs: [] })).toBe(true);
  });

  it('never calls a link live before the first reading, and ages it to stale then lost', () => {
    expect(freshness(null, 1000)).toBe('waiting');
    expect(freshness(1000, 1000 + BAND_LINK.staleAfterMs - 1)).toBe('live');
    expect(freshness(1000, 1000 + BAND_LINK.staleAfterMs)).toBe('stale');
    expect(freshness(1000, 1000 + BAND_LINK.lostAfterMs)).toBe('lost');
  });

  it('backs off between reconnect attempts, capped at 16 s', () => {
    expect([0, 1, 2, 3, 4, 9].map(reconnectDelayMs)).toEqual([1000, 2000, 4000, 8000, 16000, 16000]);
  });

  it('keeps only the rolling window', () => {
    const s = [{ ts: 0, bpm: 60 }, { ts: 50_000, bpm: 61 }, { ts: 130_000, bpm: 62 }];
    expect(keepWindow(s, 130_000)).toEqual(s.slice(1));
    expect(keepWindow(s, 500_000)).toEqual([]);
  });
});
