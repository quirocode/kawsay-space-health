/**
 * Web Bluetooth transport for a heart-rate band (P1, integration).
 * The same code runs in Chrome/Edge (deployed app) and in the desktop .exe (Electron
 * answers the device chooser in desktop/main.cjs). Bluetooth is local radio: no internet.
 *
 * Two kinds of band:
 * - Standard heart-rate sensors (chest straps, most bands): subscribe to 0x2A37 and listen.
 * - Xiaomi bands (Mi Band 4–6): authenticate with the band's key first (huami.ts), then
 *   ask the band to measure continuously and keep it awake.
 */
import { AUTH_CMD, HR_CONTROL, HUAMI, aesBlock, parseAuthReply, type AuthReply } from './huami';

export type BluetoothSupport = 'ok' | 'no-api' | 'insecure' | 'off';

export type BandErrorCode = 'cancelled' | 'no-hr-service' | 'failed' | 'needs-key' | 'wrong-key' | 'auth-refused';

export class BandError extends Error {
  constructor(readonly code: BandErrorCode, message: string) {
    super(message);
  }
}

/** Names the Xiaomi bands advertise. Anything that advertises the standard heart-rate service also shows. */
const NAME_PREFIXES = ['Xiaomi Smart Band', 'Mi Smart Band', 'Mi Band', 'Amazfit'];
/** Windows often fails the first GATT connection to a band; the next one usually works. */
const CONNECT_TRIES = 3;
const CONNECT_RETRY_MS = 1500;
const AUTH_STEP_TIMEOUT_MS = 6000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const errText = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e));

export async function bluetoothSupport(): Promise<BluetoothSupport> {
  if (typeof navigator === 'undefined' || !navigator.bluetooth) return 'no-api';
  if (typeof window !== 'undefined' && !window.isSecureContext) return 'insecure';
  try {
    return (await navigator.bluetooth.getAvailability()) ? 'ok' : 'off';
  } catch {
    return 'ok'; // some builds do not implement getAvailability; requestDevice will tell
  }
}

/** Opens the system device list. Must run inside a click handler (browser rule). */
export async function pickBand(): Promise<BluetoothDevice> {
  if (!navigator.bluetooth) throw new BandError('failed', 'Web Bluetooth is not available');
  try {
    return await navigator.bluetooth.requestDevice({
      filters: [{ services: ['heart_rate'] }, ...NAME_PREFIXES.map((namePrefix) => ({ namePrefix }))],
      // Services must be declared up front or Web Bluetooth hides them.
      optionalServices: ['heart_rate', 'battery_service', 0xfee0, HUAMI.service],
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'NotFoundError') throw new BandError('cancelled', 'No device chosen');
    throw new BandError('failed', errText(e));
  }
}

export interface BandLink {
  name: string;
  battery: number | null;
  /** Close on purpose: no reconnect follows. */
  close(): void;
}

export interface BandEvents {
  onPacket(view: DataView, ts: number): void;
  /** The radio link dropped without close() being called. */
  onDropped(): void;
  /** Progress for the screen: 'connecting' → 'authenticating' → 'starting'. */
  onStage?(stage: 'connecting' | 'authenticating' | 'starting'): void;
}

export interface BandOptions {
  /** The band's 16-byte key, for Xiaomi bands. */
  authKey: Uint8Array | null;
}

async function connectGatt(device: BluetoothDevice): Promise<BluetoothRemoteGATTServer> {
  let last: unknown;
  for (let i = 0; i < CONNECT_TRIES; i++) {
    try {
      return await device.gatt!.connect();
    } catch (e) {
      last = e;
      if (i < CONNECT_TRIES - 1) await sleep(CONNECT_RETRY_MS);
    }
  }
  throw new BandError('failed', errText(last));
}

/** Resolve with the first auth reply that matches, or fail after a timeout. */
function nextAuthReply(char: BluetoothRemoteGATTCharacteristic, want: (r: AuthReply) => boolean): Promise<AuthReply> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      char.removeEventListener('characteristicvaluechanged', onValue);
      reject(new BandError('auth-refused', 'The band did not answer the key check'));
    }, AUTH_STEP_TIMEOUT_MS);
    function onValue() {
      if (!char.value) return;
      const reply = parseAuthReply(char.value);
      if (!want(reply)) return;
      clearTimeout(timer);
      char.removeEventListener('characteristicvaluechanged', onValue);
      resolve(reply);
    }
    char.addEventListener('characteristicvaluechanged', onValue);
  });
}

/** Xiaomi challenge: ask for a random number, return it encrypted with the band's key. */
async function authenticateHuami(server: BluetoothRemoteGATTServer, key: Uint8Array): Promise<void> {
  const auth = await (await server.getPrimaryService(HUAMI.service)).getCharacteristic(HUAMI.auth);
  await auth.startNotifications();

  const challenge = nextAuthReply(auth, (r) => r.kind !== 'other' && r.kind !== 'ok' && r.kind !== 'wrong-key');
  await auth.writeValue(Uint8Array.from(AUTH_CMD.requestRandom));
  const first = await challenge;
  if (first.kind !== 'random') throw new BandError('auth-refused', `The band refused the key check (${first.kind === 'refused' ? first.code : '?'})`);

  const verdict = nextAuthReply(auth, (r) => r.kind === 'ok' || r.kind === 'wrong-key' || r.kind === 'refused');
  await auth.writeValue(AUTH_CMD.sendEncrypted(await aesBlock(key, first.random)));
  const last = await verdict;
  if (last.kind === 'wrong-key') throw new BandError('wrong-key', 'The band rejected the key');
  if (last.kind !== 'ok') throw new BandError('auth-refused', 'The band refused the key check');
}

async function hasService(server: BluetoothRemoteGATTServer, uuid: BluetoothServiceUUID): Promise<boolean> {
  try {
    await server.getPrimaryService(uuid);
    return true;
  } catch {
    return false;
  }
}

/** Connect, authenticate if it is a Xiaomi band, subscribe to Heart Rate Measurement, read battery. */
export async function openBand(device: BluetoothDevice, events: BandEvents, options: BandOptions): Promise<BandLink> {
  if (!device.gatt) throw new BandError('failed', 'This device has no GATT server');
  let closing = false;
  let keepAlive: ReturnType<typeof setInterval> | null = null;
  const stopKeepAlive = () => {
    if (keepAlive) clearInterval(keepAlive);
    keepAlive = null;
  };
  const onDisconnect = () => {
    device.removeEventListener('gattserverdisconnected', onDisconnect);
    stopKeepAlive();
    if (!closing) events.onDropped();
  };
  const fail = (e: unknown): never => {
    closing = true;
    stopKeepAlive();
    device.removeEventListener('gattserverdisconnected', onDisconnect);
    if (device.gatt?.connected) device.gatt.disconnect();
    throw e instanceof BandError ? e : new BandError('failed', errText(e));
  };

  events.onStage?.('connecting');
  const server = await connectGatt(device);
  device.addEventListener('gattserverdisconnected', onDisconnect);

  let measurement: BluetoothRemoteGATTCharacteristic | undefined;
  let onValue = () => {};
  try {
    const huami = await hasService(server, HUAMI.service);
    if (huami) {
      if (!options.authKey) throw new BandError('needs-key', 'This Xiaomi band needs its key');
      events.onStage?.('authenticating');
      await authenticateHuami(server, options.authKey);
    }

    events.onStage?.('starting');
    let hrService: BluetoothRemoteGATTService;
    try {
      hrService = await server.getPrimaryService('heart_rate');
      measurement = await hrService.getCharacteristic('heart_rate_measurement');
    } catch {
      throw new BandError('no-hr-service', 'The band does not offer the standard heart-rate service');
    }
    const m = measurement;
    onValue = () => {
      if (m.value) events.onPacket(m.value, Date.now());
    };
    m.addEventListener('characteristicvaluechanged', onValue);
    try {
      await m.startNotifications();
    } catch (e) {
      throw new BandError(huami ? 'auth-refused' : 'no-hr-service', errText(e));
    }

    if (huami) {
      const control = await hrService.getCharacteristic('heart_rate_control_point');
      await control.writeValue(Uint8Array.from(HR_CONTROL.stopManual));
      await control.writeValue(Uint8Array.from(HR_CONTROL.startContinuous));
      keepAlive = setInterval(() => {
        control.writeValue(Uint8Array.from(HR_CONTROL.keepAlive)).catch(() => undefined);
      }, HR_CONTROL.keepAliveEveryMs);
    }
  } catch (e) {
    measurement?.removeEventListener('characteristicvaluechanged', onValue);
    return fail(e);
  }

  let battery: number | null = null;
  try {
    const level = await (await server.getPrimaryService('battery_service')).getCharacteristic('battery_level');
    battery = (await level.readValue()).getUint8(0);
  } catch {
    battery = null; // not every band shares it; not knowing is fine
  }

  return {
    name: device.name ?? 'Heart-rate band',
    battery,
    close() {
      closing = true;
      stopKeepAlive();
      measurement?.removeEventListener('characteristicvaluechanged', onValue);
      if (device.gatt?.connected) device.gatt.disconnect();
    },
  };
}
