import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBand } from './store';
import { aesBlock } from './huami';

/** A fake band behind the Web Bluetooth API: no hardware needed. */
function fakeBand({ hasHeartRate = true } = {}) {
  const measurement = Object.assign(new EventTarget(), {
    value: undefined as DataView | undefined,
    startNotifications: vi.fn(async () => measurement),
    stopNotifications: vi.fn(async () => measurement),
    readValue: vi.fn(async () => new DataView(new ArrayBuffer(1))),
  });
  const server = {
    connected: true,
    connect: vi.fn(async () => server),
    disconnect: vi.fn(() => { server.connected = false; }),
    getPrimaryService: vi.fn(async (name: string) => {
      if (name === 'heart_rate' && hasHeartRate) return { getCharacteristic: async () => measurement };
      if (name === 'battery_service') return { getCharacteristic: async () => ({ readValue: async () => new DataView(new Uint8Array([81]).buffer) }) };
      throw new DOMException('No service', 'NotFoundError');
    }),
  };
  const device = Object.assign(new EventTarget(), { id: 'band-1', name: 'Xiaomi Smart Band 7', gatt: server });
  const send = (...bytes: number[]) => {
    measurement.value = new DataView(new Uint8Array(bytes).buffer);
    measurement.dispatchEvent(new Event('characteristicvaluechanged'));
  };
  const drop = () => device.dispatchEvent(new Event('gattserverdisconnected'));
  return { device, server, send, drop };
}

function install(requestDevice: () => Promise<unknown>) {
  Object.defineProperty(navigator, 'bluetooth', {
    configurable: true,
    value: { getAvailability: async () => true, requestDevice: vi.fn(requestDevice) },
  });
}

beforeEach(() => useBand.getState().disconnect());
afterEach(() => {
  Reflect.deleteProperty(navigator, 'bluetooth');
  vi.useRealTimers();
});

describe('band connection', () => {
  it('reports no Web Bluetooth (Firefox, Safari, jsdom)', async () => {
    await useBand.getState().checkSupport();
    expect(useBand.getState().support).toBe('no-api');
  });

  it('connects, reads battery, and keeps usable heart-rate readings only', async () => {
    const band = fakeBand();
    install(async () => band.device);
    await useBand.getState().connect();
    let s = useBand.getState();
    expect(s.phase).toBe('connected');
    expect(s.deviceName).toBe('Xiaomi Smart Band 7');
    expect(s.battery).toBe(81);
    expect(s.lastTs).toBeNull(); // connected is not the same as receiving data

    band.send(0x00, 0); // band not measuring yet
    band.send(0x00, 74);
    s = useBand.getState();
    expect(s.samples.map((x) => x.bpm)).toEqual([74]);
    expect(s.lastTs).not.toBeNull();
  });

  it('goes back to the checklist when the device list is cancelled', async () => {
    install(async () => { throw new DOMException('User cancelled', 'NotFoundError'); });
    await useBand.getState().connect();
    expect(useBand.getState()).toMatchObject({ phase: 'ready', problem: 'cancelled' });
  });

  it('says so when the band offers no standard heart-rate service', async () => {
    const band = fakeBand({ hasHeartRate: false });
    install(async () => band.device);
    await useBand.getState().connect();
    expect(useBand.getState()).toMatchObject({ phase: 'failed', problem: 'no-hr-service' });
    expect(band.server.disconnect).toHaveBeenCalled();
  });

  it('reconnects with backoff after the link drops', async () => {
    vi.useFakeTimers();
    const band = fakeBand();
    install(async () => band.device);
    await useBand.getState().connect();
    band.drop();
    expect(useBand.getState()).toMatchObject({ phase: 'reconnecting', attempt: 1 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(useBand.getState().phase).toBe('connected');
    expect(band.server.connect).toHaveBeenCalledTimes(2);
  });

  it('does not reconnect after the crew member disconnects', async () => {
    const band = fakeBand();
    install(async () => band.device);
    await useBand.getState().connect();
    useBand.getState().disconnect();
    expect(useBand.getState().phase).toBe('idle');
    expect(band.server.connect).toHaveBeenCalledTimes(1);
  });
});

/** A fake Mi Band 6: answers the key check the way the real band did. */
function fakeMiBand6(realKey: Uint8Array) {
  const random = Uint8Array.from({ length: 16 }, (_, i) => 0x90 + i);
  const measurement = Object.assign(new EventTarget(), {
    value: undefined as DataView | undefined,
    startNotifications: vi.fn(async () => measurement),
  });
  const writes: number[][] = [];
  const control = { writeValue: vi.fn(async (v: Uint8Array) => { writes.push([...v]); }) };
  const auth = Object.assign(new EventTarget(), {
    value: undefined as DataView | undefined,
    startNotifications: vi.fn(async () => auth),
    writeValue: vi.fn(async (v: Uint8Array) => {
      const reply = (...bytes: number[]) => queueMicrotask(() => {
        auth.value = new DataView(Uint8Array.from(bytes).buffer);
        auth.dispatchEvent(new Event('characteristicvaluechanged'));
      });
      if (v[0] === 0x02) reply(0x10, 0x02, 0x01, ...random);
      if (v[0] === 0x03) {
        const expected = [...(await aesBlock(realKey, random))];
        reply(0x10, 0x03, expected.every((b, i) => b === v[i + 2]) ? 0x01 : 0x07);
      }
    }),
  });
  const server = {
    connected: true,
    connect: vi.fn(async () => server),
    disconnect: vi.fn(() => { server.connected = false; }),
    getPrimaryService: vi.fn(async (name: string | number) => {
      if (name === 0xfee1) return { getCharacteristic: async () => auth };
      if (name === 'heart_rate') return { getCharacteristic: async (c: string) => (c === 'heart_rate_control_point' ? control : measurement) };
      throw new DOMException('No service', 'NotFoundError');
    }),
  };
  const device = Object.assign(new EventTarget(), { id: 'band-6', name: 'Mi Smart Band 6', gatt: server });
  return { device, server, writes };
}

describe('Xiaomi Mi Band 6 key check', () => {
  const key = Uint8Array.from({ length: 16 }, (_, i) => i + 1);
  const keyHex = '0x' + [...key].map((b) => b.toString(16).padStart(2, '0')).join('');

  it('asks for the key when none is saved, and does not keep the link open', async () => {
    useBand.getState().setAuthKey('');
    const band = fakeMiBand6(key);
    install(async () => band.device);
    await useBand.getState().connect();
    expect(useBand.getState()).toMatchObject({ phase: 'failed', problem: 'needs-key' });
    expect(band.server.disconnect).toHaveBeenCalled();
  });

  it('authenticates with the right key and starts continuous heart rate', async () => {
    expect(useBand.getState().setAuthKey(keyHex)).toBe(true);
    const band = fakeMiBand6(key);
    install(async () => band.device);
    await useBand.getState().connect();
    expect(useBand.getState().phase).toBe('connected');
    expect(band.writes).toEqual([[0x15, 0x02, 0x00], [0x15, 0x01, 0x01]]);
    useBand.getState().disconnect();
  });

  it('reports a wrong key', async () => {
    useBand.getState().setAuthKey('0xffffffffffffffffffffffffffffffff');
    const band = fakeMiBand6(key);
    install(async () => band.device);
    await useBand.getState().connect();
    expect(useBand.getState()).toMatchObject({ phase: 'failed', problem: 'wrong-key' });
  });

  it('refuses to save something that is not a key', () => {
    expect(useBand.getState().setAuthKey('hello')).toBe(false);
  });
});

describe('desktop device list', () => {
  it('shows what the scan finds and connects to the chosen device', async () => {
    const band = fakeBand();
    let push: (d: { id: string; name: string }[]) => void = () => {};
    let resolvePick: (d: unknown) => void = () => {};
    const bridge = { onDevices: vi.fn((cb) => { push = cb; return () => {}; }), choose: vi.fn(() => resolvePick(band.device)), cancel: vi.fn() };
    Object.defineProperty(window, 'kawsayBluetooth', { configurable: true, value: bridge });
    install(() => new Promise((r) => { resolvePick = r; }));

    const done = useBand.getState().connect();
    expect(useBand.getState().phase).toBe('picking');
    push([{ id: 'a', name: 'Mi Smart Band 6' }]);
    expect(useBand.getState().scan).toEqual([{ id: 'a', name: 'Mi Smart Band 6' }]);
    useBand.getState().chooseDevice('a');
    await done;
    expect(bridge.choose).toHaveBeenCalledWith('a');
    expect(useBand.getState().phase).toBe('connected');
    Reflect.deleteProperty(window, 'kawsayBluetooth');
  });
});
