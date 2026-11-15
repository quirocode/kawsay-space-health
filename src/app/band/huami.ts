/**
 * Xiaomi (Huami) band authentication, the pre-2021 protocol used by Mi Band 4, 5 and 6.
 * Written from the protocol as observed on a Mi Smart Band 6 and as documented by the
 * Gadgetbridge project (https://gadgetbridge.org); no code was copied.
 *
 * Without this handshake the band refuses heart-rate notifications and drops the link
 * after about 8 s. It needs the band's 16-byte key, which Xiaomi's servers hand out once
 * (internet needed one time). After that, everything is local Bluetooth.
 *
 * Mi Band 7 and newer use the 2021 Zepp OS handshake (ECDH on NIST B-163), not this one.
 */

const HUAMI_BASE = (short: string) => `0000${short}-0000-3512-2118-0009af100700`;
export const HUAMI = {
  service: 0xfee1,
  auth: HUAMI_BASE('0009'),
} as const;

/** Heart Rate Control Point (0x2A39) commands that make a Huami band measure continuously. */
export const HR_CONTROL = {
  stopManual: [0x15, 0x02, 0x00],
  startContinuous: [0x15, 0x01, 0x01],
  stopContinuous: [0x15, 0x01, 0x00],
  /** Sent every few seconds, or the band stops measuring after about 15 s. */
  keepAlive: [0x16],
  keepAliveEveryMs: 10_000,
} as const;

const AUTH_FLAGS = 0x08;
export const AUTH_CMD = {
  requestRandom: [0x02, AUTH_FLAGS],
  sendEncrypted: (encrypted: Uint8Array) => Uint8Array.from([0x03, AUTH_FLAGS, ...encrypted]),
} as const;

/**
 * The key as people copy it: 32 hex characters, with or without `0x`, spaces or colons.
 * Returns null when it is not 16 bytes of hex.
 */
export function parseAuthKey(text: string): Uint8Array | null {
  const hex = text.trim().replace(/^0x/i, '').replace(/[\s:-]/g, '');
  if (!/^[0-9a-f]{32}$/i.test(hex)) return null;
  return Uint8Array.from(hex.match(/../g)!.map((b) => parseInt(b, 16)));
}

export type AuthReply =
  | { kind: 'random'; random: Uint8Array }
  | { kind: 'ok' }
  | { kind: 'wrong-key' }
  | { kind: 'refused'; code: number }
  | { kind: 'other' };

/** Read a notification from the auth characteristic. */
export function parseAuthReply(view: DataView): AuthReply {
  if (view.byteLength < 3 || view.getUint8(0) !== 0x10) return { kind: 'other' };
  const step = view.getUint8(1) & 0x0f;
  const status = view.getUint8(2);
  if (step === 0x02) {
    if (status !== 0x01 || view.byteLength < 19) return { kind: 'refused', code: status };
    return { kind: 'random', random: new Uint8Array(view.buffer.slice(view.byteOffset + 3, view.byteOffset + 19)) };
  }
  if (step === 0x03) {
    if (status === 0x01) return { kind: 'ok' };
    // Observed on a Mi Band 6: 0x07 for a wrong key. Older bands answer 0x04.
    return status === 0x04 || status === 0x07 ? { kind: 'wrong-key' } : { kind: 'refused', code: status };
  }
  return { kind: 'other' };
}

/**
 * AES-128 on one 16-byte block, no padding (ECB). WebCrypto has no ECB mode, but CBC with
 * a zero IV gives the same first block, so we keep those 16 bytes.
 */
export async function aesBlock(key: Uint8Array, block: Uint8Array): Promise<Uint8Array> {
  if (key.length !== 16 || block.length !== 16) throw new Error('AES block needs 16-byte key and data');
  const k = await crypto.subtle.importKey('raw', Uint8Array.from(key), 'AES-CBC', false, ['encrypt']);
  const out = await crypto.subtle.encrypt({ name: 'AES-CBC', iv: new Uint8Array(16) }, k, Uint8Array.from(block));
  return new Uint8Array(out).slice(0, 16);
}

/** True for bands that speak this protocol (they show the 0xFEE1 service). */
export function looksHuami(name: string | undefined): boolean {
  return /mi (smart )?band|xiaomi smart band|amazfit/i.test(name ?? '');
}
