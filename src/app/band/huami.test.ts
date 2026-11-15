import { describe, expect, it } from 'vitest';
import { aesBlock, AUTH_CMD, looksHuami, parseAuthKey, parseAuthReply } from './huami';

const view = (...bytes: number[]) => new DataView(new Uint8Array(bytes).buffer);

describe('parseAuthKey', () => {
  it('accepts 32 hex characters with or without 0x, spaces or colons', () => {
    const expected = Uint8Array.from({ length: 16 }, (_, i) => i * 17);
    expect(parseAuthKey('0x00112233445566778899aabbccddeeff')).toEqual(expected);
    expect(parseAuthKey(' 00 11 22 33 44 55 66 77 88 99 AA BB CC DD EE FF ')).toEqual(expected);
    expect(parseAuthKey('00:11:22:33:44:55:66:77:88:99:aa:bb:cc:dd:ee:ff')).toEqual(expected);
  });

  it('rejects anything that is not 16 bytes of hex', () => {
    expect(parseAuthKey('')).toBeNull();
    expect(parseAuthKey('0x0011')).toBeNull();
    expect(parseAuthKey('zz112233445566778899aabbccddeeff')).toBeNull();
  });
});

describe('parseAuthReply', () => {
  it('reads the random challenge (bytes seen from a real Mi Band 6)', () => {
    const r = parseAuthReply(view(0x10, 0x02, 0x01, 0x93, 0xd7, 0x3e, 0x81, 0xf5, 0x90, 0x34, 0x48, 0xde, 0x08, 0x8d, 0x77, 0x83, 0x65, 0xf4, 0xef));
    expect(r.kind).toBe('random');
    if (r.kind === 'random') expect(r.random[0]).toBe(0x93);
  });

  it('maps the final answer: success, wrong key (Band 6 says 07, older 04), other refusals', () => {
    expect(parseAuthReply(view(0x10, 0x03, 0x01))).toEqual({ kind: 'ok' });
    expect(parseAuthReply(view(0x10, 0x03, 0x07))).toEqual({ kind: 'wrong-key' });
    expect(parseAuthReply(view(0x10, 0x83, 0x04))).toEqual({ kind: 'wrong-key' });
    expect(parseAuthReply(view(0x10, 0x03, 0x02))).toEqual({ kind: 'refused', code: 2 });
    expect(parseAuthReply(view(0x01, 0x02))).toEqual({ kind: 'other' });
  });
});

describe('aesBlock', () => {
  it('matches the FIPS-197 AES-128 example vector', async () => {
    const key = Uint8Array.from({ length: 16 }, (_, i) => i);
    const plain = Uint8Array.from({ length: 16 }, (_, i) => i * 0x11);
    const hex = [...(await aesBlock(key, plain))].map((b) => b.toString(16).padStart(2, '0')).join('');
    expect(hex).toBe('69c4e0d86a7b0430d8cdb78070b4c55a');
  });

  it('builds the encrypted-answer command', () => {
    expect([...AUTH_CMD.sendEncrypted(new Uint8Array(16))].slice(0, 2)).toEqual([0x03, 0x08]);
  });
});

describe('looksHuami', () => {
  it('recognises Xiaomi band names', () => {
    expect(looksHuami('Mi Smart Band 6')).toBe(true);
    expect(looksHuami('Xiaomi Smart Band 7')).toBe(true);
    expect(looksHuami('Polar H10 1234')).toBe(false);
  });
});
