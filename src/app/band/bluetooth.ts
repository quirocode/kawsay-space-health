/**
 * Web Bluetooth transport for a heart-rate band (P1, integration).
 * The same code runs in Chrome/Edge (deployed app) and in the desktop .exe (Electron
 * answers the device chooser in desktop/main.cjs). Bluetooth is local radio: no internet.
 *
 * Two kinds of band:
 * - Standard BLE Heart Rate Service (0x180D / 0x2A37) — Huawei Band 8 (with Heart Rate
 *   Broadcast enabled), Polar/Garmin straps, and open BLE sensors: subscribe directly to
 *   0x2A37 and stream BPM + RR-intervals (HRV) in real time with no authKey or AES handshake.
 * - Proprietary Xiaomi/Zepp bands (0xFEE0 / 0xFEE1, Mi Band 4–6): authenticate with the
 *   band's 16-byte key first (huami.ts), then ask the band to measure continuously.
 */
import { AUTH_CMD, HR_CONTROL, HUAMI, aesBlock, parseAuthReply, type AuthReply } from './huami';
import { computeHrvRmssd, parseHeartRateMeasurement, type HeartRateMeasurement } from './heartRate';

export { computeHrvRmssd, parseHeartRateMeasurement, type HeartRateMeasurement };

/** Official Bluetooth SIG 16-bit service UUIDs and Xiaomi/Zepp proprietary UUIDs. */
export const BLE_SERVICES = {
  heartRate: 0x180d,
  battery: 0x180f,
  xiaomiFee0: 0xfee0,
  huamiFee1: HUAMI.service,
} as const;

/** Official Bluetooth SIG 16-bit characteristic UUIDs. */
export const BLE_CHARACTERISTICS = {
  heartRateMeasurement: 0x2a37,
  heartRateControlPoint: 0x2a39,
  batteryLevel: 0x2a19,
} as const;

export type BluetoothSupport = 'ok' | 'no-api' | 'insecure' | 'off';

export type BandErrorCode = 'cancelled' | 'no-hr-service' | 'failed' | 'needs-key' | 'wrong-key' | 'auth-refused';

export class BandError extends Error {
  constructor(readonly code: BandErrorCode, message: string) {
    super(message);
  }
}

/**
 * Official parser for the 0x2A37 (Heart Rate Measurement) payload:
 * - Bit 0 of flags (offset 0): 0 = uint8 BPM at offset 1; 1 = uint16 little-endian BPM at offset 1..2.
 * - Bits 1..2 of flags: sensor skin contact status.
 * - Bit 3 of flags: Energy Expended present (uint16, skipped).
 * - Bit 4 of flags: RR-Interval values present (uint16 little-endian in 1/1024 s units -> ms) for HRV.
 */
export function parseHeartRatePayload(view: DataView): HeartRateMeasurement & { hrvRmssd: number | null } {
  const parsed = parseHeartRateMeasurement(view);
  return {
    ...parsed,
    hrvRmssd: computeHrvRmssd(parsed.rrMs),
  };
}

/** Names that Huawei and Xiaomi/Amazfit bands advertise. Anything advertising 0x180D also shows. */
const NAME_PREFIXES = ['HUAWEI', 'Huawei', 'HONOR', 'Xiaomi Smart Band', 'Mi Smart Band', 'Mi Band', 'Amazfit'];

export const OPTIONAL_BLE_SERVICES: BluetoothServiceUUID[] = [
  'heart_rate',
  'battery_service',
  BLE_SERVICES.heartRate,
  BLE_SERVICES.battery,
  BLE_SERVICES.xiaomiFee0,
  BLE_SERVICES.huamiFee1,
];

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

export interface PickBandOptions {
  /** Fallback to acceptAllDevices when a band does not advertise its name or service UUID in scan packets. */
  acceptAllDevices?: boolean;
}

/** Opens the system device list. Must run inside a click handler (browser rule). */
export async function pickBand(options?: PickBandOptions): Promise<BluetoothDevice> {
  if (!navigator.bluetooth) throw new BandError('failed', 'Web Bluetooth is not available');
  try {
    if (options?.acceptAllDevices) {
      return await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: OPTIONAL_BLE_SERVICES,
      });
    }
    try {
      return await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['heart_rate'] },
          { namePrefix: 'HUAWEI' },
          { services: [BLE_SERVICES.heartRate] },
          ...NAME_PREFIXES.filter((p) => p !== 'HUAWEI').map((namePrefix) => ({ namePrefix })),
        ],
        // Services must be declared up front or Web Bluetooth hides them.
        optionalServices: OPTIONAL_BLE_SERVICES,
      });
    } catch (inner) {
      if (inner instanceof DOMException && inner.name === 'NotFoundError') throw inner;
      // Fallback to acceptAllDevices if filter combination is rejected by the platform adapter
      return await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: OPTIONAL_BLE_SERVICES,
      });
    }
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

async function getService(
  server: BluetoothRemoteGATTServer,
  primary: BluetoothServiceUUID,
  fallback?: BluetoothServiceUUID,
): Promise<BluetoothRemoteGATTService> {
  try {
    return await server.getPrimaryService(primary);
  } catch (e) {
    if (fallback !== undefined) return await server.getPrimaryService(fallback);
    throw e;
  }
}

async function getChar(
  service: BluetoothRemoteGATTService,
  primary: BluetoothCharacteristicUUID,
  fallback?: BluetoothCharacteristicUUID,
): Promise<BluetoothRemoteGATTCharacteristic> {
  try {
    return await service.getCharacteristic(primary);
  } catch (e) {
    if (fallback !== undefined) return await service.getCharacteristic(fallback);
    throw e;
  }
}

/** Xiaomi challenge: ask for a random number, return it encrypted with the band's key. */
async function authenticateHuami(server: BluetoothRemoteGATTServer, key: Uint8Array): Promise<void> {
  const huamiSvc = await getService(server, HUAMI.service, BLE_SERVICES.xiaomiFee0);
  const auth = await huamiSvc.getCharacteristic(HUAMI.auth);
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

/**
 * Connect and bifurcate GATT flow:
 * 1. If the device exposes standard Heart Rate Service (0x180D / 'heart_rate') without Xiaomi's
 *    proprietary service (0xFEE0 / 0xFEE1), subscribe directly to 0x2A37 ('heart_rate_measurement')
 *    and stream notifications in real time without running AES authentication (Huawei Band 8 flow).
 * 2. Execute the authKey AES handshake only if the device exposes the proprietary 0xFEE0 / 0xFEE1 service.
 */
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
    const proprietaryXiaomi =
      (await hasService(server, BLE_SERVICES.xiaomiFee0)) ||
      (await hasService(server, BLE_SERVICES.huamiFee1));

    if (proprietaryXiaomi) {
      if (!options.authKey) throw new BandError('needs-key', 'This Xiaomi band needs its key');
      events.onStage?.('authenticating');
      await authenticateHuami(server, options.authKey);
    }

    events.onStage?.('starting');
    let hrService: BluetoothRemoteGATTService;
    try {
      hrService = await getService(server, 'heart_rate', BLE_SERVICES.heartRate);
      measurement = await getChar(hrService, 'heart_rate_measurement', BLE_CHARACTERISTICS.heartRateMeasurement);
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
      throw new BandError(proprietaryXiaomi ? 'auth-refused' : 'no-hr-service', errText(e));
    }

    if (proprietaryXiaomi) {
      try {
        const control = await getChar(hrService, 'heart_rate_control_point', BLE_CHARACTERISTICS.heartRateControlPoint);
        await control.writeValue(Uint8Array.from(HR_CONTROL.stopManual));
        await control.writeValue(Uint8Array.from(HR_CONTROL.startContinuous));
        keepAlive = setInterval(() => {
          control.writeValue(Uint8Array.from(HR_CONTROL.keepAlive)).catch(() => undefined);
        }, HR_CONTROL.keepAliveEveryMs);
      } catch {
        // Some 0xFEE0 devices stream 0x2A37 directly after auth without exposing 0x2A39
      }
    }
  } catch (e) {
    measurement?.removeEventListener('characteristicvaluechanged', onValue);
    return fail(e);
  }

  let battery: number | null = null;
  try {
    const batterySvc = await getService(server, 'battery_service', BLE_SERVICES.battery);
    const level = await getChar(batterySvc, 'battery_level', BLE_CHARACTERISTICS.batteryLevel);
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
