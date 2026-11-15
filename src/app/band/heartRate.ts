/**
 * Pure helpers for a Bluetooth heart-rate band (P1, integration). No browser APIs here,
 * so every rule about the link is unit-tested without hardware.
 *
 * The packet format is the Bluetooth SIG Heart Rate Service (0x180D), characteristic
 * Heart Rate Measurement (0x2A37). Chest straps and bands that share heart rate use it.
 */

export interface HeartRateMeasurement {
  bpm: number;
  /** Whether the sensor says it touches skin. 'unknown' when it does not report it. */
  contact: 'yes' | 'no' | 'unknown';
  /** Beat-to-beat intervals in ms, when the sensor sends them (many bands do not). */
  rrMs: number[];
}

/** Parse one Heart Rate Measurement notification. Throws on a packet too short to hold a value. */
export function parseHeartRateMeasurement(view: DataView): HeartRateMeasurement {
  if (view.byteLength < 2) throw new Error('Heart rate packet too short');
  const flags = view.getUint8(0);
  const wide = (flags & 0x01) !== 0;
  const contactSupported = (flags & 0x04) !== 0;
  const contactDetected = (flags & 0x02) !== 0;
  const hasEnergy = (flags & 0x08) !== 0;
  const hasRr = (flags & 0x10) !== 0;

  let offset = 1;
  if (wide && view.byteLength < 3) throw new Error('Heart rate packet too short');
  const bpm = wide ? view.getUint16(offset, true) : view.getUint8(offset);
  offset += wide ? 2 : 1;
  if (hasEnergy) offset += 2; // energy expended (kJ): not used

  const rrMs: number[] = [];
  if (hasRr) {
    for (; offset + 1 < view.byteLength; offset += 2) {
      rrMs.push(Math.round((view.getUint16(offset, true) / 1024) * 1000));
    }
  }
  return { bpm, contact: contactSupported ? (contactDetected ? 'yes' : 'no') : 'unknown', rrMs };
}

/**
 * PROTOTYPE values for the link, not NASA figures. A band sends about one packet a second;
 * after `staleAfterMs` without one the number is shown as old, after `lostAfterMs` the
 * link is treated as gone.
 */
export const BAND_LINK = {
  staleAfterMs: 5_000,
  lostAfterMs: 30_000,
  windowMs: 120_000,
  minBpm: 25,
  maxBpm: 240,
  reconnectAttempts: 5,
} as const;

/** A reading the app can show. 0 bpm (band not measuring) or off-skin packets are not readings. */
export function isUsable(m: HeartRateMeasurement): boolean {
  return m.contact !== 'no' && m.bpm >= BAND_LINK.minBpm && m.bpm <= BAND_LINK.maxBpm;
}

export type Freshness = 'waiting' | 'live' | 'stale' | 'lost';

/** How fresh the newest reading is. No reading yet is 'waiting', never 'live'. */
export function freshness(lastTs: number | null, nowTs: number): Freshness {
  if (lastTs === null) return 'waiting';
  const age = nowTs - lastTs;
  if (age < BAND_LINK.staleAfterMs) return 'live';
  if (age < BAND_LINK.lostAfterMs) return 'stale';
  return 'lost';
}

/** Wait before reconnect attempt `n` (0-based): 1 s, 2 s, 4 s, 8 s, 16 s. */
export function reconnectDelayMs(attempt: number): number {
  return Math.min(16_000, 1000 * 2 ** Math.max(0, attempt));
}

export interface BandSample {
  ts: number;
  bpm: number;
}

/** Keep only the samples inside the rolling window, oldest first. */
export function keepWindow(samples: BandSample[], nowTs: number, windowMs: number = BAND_LINK.windowMs): BandSample[] {
  const from = nowTs - windowMs;
  const first = samples.findIndex((s) => s.ts >= from);
  return first === -1 ? [] : first === 0 ? samples : samples.slice(first);
}
