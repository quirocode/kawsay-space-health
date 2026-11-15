/**
 * The slice of the Web Bluetooth API that KAWSAY uses. TypeScript's DOM library does not
 * ship these types; declaring them here avoids a dependency.
 * Spec: https://webbluetoothcg.github.io/web-bluetooth/
 */
type BluetoothServiceUUID = number | string;
type BluetoothCharacteristicUUID = number | string;

interface BluetoothLEScanFilter {
  services?: BluetoothServiceUUID[];
  name?: string;
  namePrefix?: string;
}

interface RequestDeviceOptions {
  filters?: BluetoothLEScanFilter[];
  optionalServices?: BluetoothServiceUUID[];
  acceptAllDevices?: boolean;
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  readonly value?: DataView;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithResponse(value: BufferSource): Promise<void>;
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTServer {
  readonly connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothDevice extends EventTarget {
  readonly id: string;
  readonly name?: string;
  readonly gatt?: BluetoothRemoteGATTServer;
}

interface Bluetooth extends EventTarget {
  getAvailability(): Promise<boolean>;
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
}

interface Navigator {
  readonly bluetooth?: Bluetooth;
}

/** Desktop app only (desktop/preload.cjs): the device list Electron does not draw itself. */
interface KawsayBluetoothBridge {
  onDevices(callback: (devices: { id: string; name: string }[]) => void): () => void;
  choose(id: string): void;
  cancel(): void;
}

/** One band key, as the Zepp sign-in returns it. */
interface KawsayBandKeyResult {
  mac: string;
  name?: string;
  active?: boolean;
  key: string;
}

/** Desktop app only (desktop/preload.cjs): one-time Zepp sign-in that fetches the band key. */
interface KawsayBandKeyBridge {
  fetch(creds: { email: string; password: string }):
    Promise<{ ok: true; keys: KawsayBandKeyResult[] } | { ok: false; error: string }>;
}

interface Window {
  readonly kawsayBluetooth?: KawsayBluetoothBridge;
  readonly kawsayBandKey?: KawsayBandKeyBridge;
}
