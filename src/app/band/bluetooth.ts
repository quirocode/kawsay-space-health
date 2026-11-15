/**
 * Web Bluetooth transport for a heart-rate band (P1, integration).
 * The same code runs in Chrome/Edge (deployed app) and in the desktop .exe (Electron
 * answers the device chooser in desktop/main.cjs). Bluetooth is local radio: no internet.
 */

export type BluetoothSupport = 'ok' | 'no-api' | 'insecure' | 'off';

export class BandError extends Error {
  constructor(readonly code: 'cancelled' | 'no-hr-service' | 'failed', message: string) {
    super(message);
  }
}

/** Names the Xiaomi bands advertise. Anything that advertises the standard heart-rate service also shows. */
const NAME_PREFIXES = ['Xiaomi Smart Band', 'Mi Smart Band', 'Mi Band', 'Amazfit'];

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
      optionalServices: ['heart_rate', 'battery_service'],
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'NotFoundError') throw new BandError('cancelled', 'No device chosen');
    throw new BandError('failed', e instanceof Error ? e.message : String(e));
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
}

/** Connect GATT, subscribe to Heart Rate Measurement and read the battery if the band offers it. */
export async function openBand(device: BluetoothDevice, events: BandEvents): Promise<BandLink> {
  if (!device.gatt) throw new BandError('failed', 'This device has no GATT server');
  let closing = false;
  const onDisconnect = () => {
    device.removeEventListener('gattserverdisconnected', onDisconnect);
    if (!closing) events.onDropped();
  };
  device.addEventListener('gattserverdisconnected', onDisconnect);

  let server: BluetoothRemoteGATTServer;
  try {
    server = await device.gatt.connect();
  } catch (e) {
    device.removeEventListener('gattserverdisconnected', onDisconnect);
    throw new BandError('failed', e instanceof Error ? e.message : String(e));
  }

  let measurement: BluetoothRemoteGATTCharacteristic;
  try {
    const service = await server.getPrimaryService('heart_rate');
    measurement = await service.getCharacteristic('heart_rate_measurement');
  } catch {
    closing = true;
    server.disconnect();
    throw new BandError('no-hr-service', 'The band does not share heart rate over the standard service');
  }

  const onValue = () => {
    if (measurement.value) events.onPacket(measurement.value, Date.now());
  };
  measurement.addEventListener('characteristicvaluechanged', onValue);
  await measurement.startNotifications();

  let battery: number | null = null;
  try {
    const level = await (await server.getPrimaryService('battery_service')).getCharacteristic('battery_level');
    battery = (await level.readValue()).getUint8(0);
  } catch {
    battery = null; // battery is encrypted on Xiaomi bands; not knowing is fine
  }

  return {
    name: device.name ?? 'Heart-rate band',
    battery,
    close() {
      closing = true;
      measurement.removeEventListener('characteristicvaluechanged', onValue);
      if (device.gatt?.connected) device.gatt.disconnect();
    },
  };
}
