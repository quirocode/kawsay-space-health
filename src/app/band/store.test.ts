import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBand } from './store';

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
