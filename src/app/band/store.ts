/**
 * Band connection state (P1). Kept apart from the mission store: the link is live radio
 * state, not mission data, and it is never written to the local database.
 * Timestamps here are real wall-clock time, not the ship clock.
 */
import { create } from 'zustand';
import { BandError, bluetoothSupport, openBand, pickBand, type BandErrorCode, type BandLink, type BluetoothSupport } from './bluetooth';
import { parseAuthKey } from './huami';
import { BAND_LINK, computeHrvRmssd, isUsable, keepWindow, parseHeartRateMeasurement, reconnectDelayMs, type BandSample } from './heartRate';
import { loadDeviceProfile, saveDeviceProfile, type DeviceProfile } from '../db';
import { useApp } from '../store';

export type { DeviceProfile };
export type BandPhase = 'idle' | 'ready' | 'picking' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
export type BandProblem = BandErrorCode | 'lost';
export type BandStage = 'connecting' | 'authenticating' | 'starting';

/**
 * The band's key lives only in this browser's (or this .exe's) local storage: it is a
 * per-band secret, never part of the repo or of the mission database.
 */
const KEY_STORAGE = 'kawsay.bandKey';
function loadKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}
function saveKey(text: string) {
  try {
    if (text) localStorage.setItem(KEY_STORAGE, text);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    // storage blocked: the key still works for this session
  }
}

interface BandState {
  support: BluetoothSupport | 'checking';
  phase: BandPhase;
  problem: BandProblem | null;
  /** The browser's own error text, shown small under the friendly message. */
  problemDetail: string | null;
  stage: BandStage;
  /** Selected connection profile persisted in src/app/db.ts. */
  profile: DeviceProfile;
  /** What the crew member typed as the band key ('' = none). */
  authKeyText: string;
  deviceName: string | null;
  battery: number | null;
  connectedTs: number | null;
  /** Newest usable reading, wall-clock ms. */
  lastTs: number | null;
  samples: BandSample[];
  /** Rolling beat-to-beat RR intervals (ms) extracted from 0x2A37 bit 4. */
  rrIntervals: number[];
  /** Live Heart Rate Variability (RMSSD in ms) derived from RR intervals. */
  hrv: number | null;
  attempt: number;
  /** Desktop app: devices found so far while the in-app list is open. */
  scan: { id: string; name: string }[];

  checkSupport(): Promise<void>;
  /** Select and persist the device connection profile ('huawei_ble' | 'xiaomi_zepp' | 'simulated'). */
  setProfile(profile: DeviceProfile): void;
  /** Save the band key. Returns false when it is not 32 hex characters. */
  setAuthKey(text: string): boolean;
  /** Step 2: show the "get your band ready" checklist. */
  prepare(): void;
  back(): void;
  /** Step 3: open the device list. Call from a click. */
  connect(): Promise<void>;
  /** Reconnect to the band chosen before, without the device list. */
  retry(): Promise<void>;
  disconnect(): void;
  /** Desktop app: pick a device from the in-app list. */
  chooseDevice(id: string): void;
  cancelPick(): void;
}

let device: BluetoothDevice | null = null;
let link: BandLink | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

const clearRetry = () => {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
};

export const useBand = create<BandState>()((set, get) => {
  const onPacket = (view: DataView, ts: number) => {
    let m;
    try {
      m = parseHeartRateMeasurement(view);
    } catch {
      return; // malformed packet: ignore it, freshness will show the gap
    }
    if (!isUsable(m)) return;
    set((s) => {
      const validRr = m.rrMs.filter((rr) => Number.isFinite(rr) && rr >= 250 && rr <= 2000);
      const rrIntervals = validRr.length > 0 ? [...s.rrIntervals, ...validRr].slice(-60) : s.rrIntervals;
      const hrv = validRr.length > 0 ? (computeHrvRmssd(rrIntervals) ?? s.hrv) : s.hrv;
      const sample: BandSample = {
        ts,
        bpm: m.bpm,
        ...(m.rrMs.length > 0 ? { rrMs: m.rrMs } : {}),
        ...(hrv !== null ? { hrv } : {}),
      };
      return {
        lastTs: ts,
        rrIntervals,
        hrv,
        samples: keepWindow([...s.samples, sample], ts),
      };
    });
  };

  const attach = async (d: BluetoothDevice) => {
    const authKey = parseAuthKey(get().authKeyText);
    link = await openBand(d, { onPacket, onDropped, onStage: (stage) => set({ stage }) }, { authKey });
    set({ phase: 'connected', problem: null, problemDetail: null, deviceName: link.name, battery: link.battery, connectedTs: Date.now(), attempt: 0 });
  };

  const onDropped = () => {
    link = null;
    const attempt = get().attempt;
    if (!device || attempt >= BAND_LINK.reconnectAttempts) {
      set({ phase: 'failed', problem: 'lost', problemDetail: null });
      return;
    }
    set({ phase: 'reconnecting', attempt: attempt + 1 });
    clearRetry();
    retryTimer = setTimeout(() => {
      if (!device || get().phase !== 'reconnecting') return;
      attach(device).catch(() => onDropped());
    }, reconnectDelayMs(attempt));
  };

  return {
    support: 'checking',
    phase: 'idle',
    problem: null,
    problemDetail: null,
    stage: 'connecting',
    profile: loadDeviceProfile(),
    authKeyText: loadKey(),
    deviceName: null,
    battery: null,
    connectedTs: null,
    lastTs: null,
    samples: [],
    rrIntervals: [],
    hrv: null,
    attempt: 0,
    scan: [],

    async checkSupport() {
      set({ support: await bluetoothSupport() });
    },
    setProfile(profile) {
      saveDeviceProfile(profile);
      try {
        useApp.getState().setDeviceProfile(profile);
      } catch {
        // ignore if app store is initializing
      }
      if (profile === 'simulated' && (link || device)) {
        clearRetry();
        link?.close();
        link = null;
        device = null;
        set({
          profile,
          phase: 'idle',
          problem: null,
          problemDetail: null,
          deviceName: null,
          battery: null,
          connectedTs: null,
          lastTs: null,
          samples: [],
          rrIntervals: [],
          hrv: null,
          attempt: 0,
        });
        return;
      }
      set({ profile, problem: null, problemDetail: null });
    },
    setAuthKey(text) {
      const clean = text.trim();
      if (clean && !parseAuthKey(clean)) return false;
      saveKey(clean);
      set({ authKeyText: clean });
      return true;
    },
    prepare() {
      set({ phase: 'ready', problem: null });
    },
    back() {
      set({ phase: 'idle', problem: null });
    },
    async connect() {
      const bridge = typeof window !== 'undefined' ? window.kawsayBluetooth : undefined;
      // In the .exe the app draws the device list itself; in a browser Chrome/Edge show theirs.
      const stopListening = bridge?.onDevices((scan) => set({ scan }));
      set({ phase: bridge ? 'picking' : 'connecting', scan: [], problem: null, problemDetail: null, stage: 'connecting' });
      try {
        try {
          device = await pickBand();
        } finally {
          stopListening?.();
        }
        set({ phase: 'connecting', scan: [] });
        set({ deviceName: device.name ?? null, samples: [], rrIntervals: [], hrv: null, lastTs: null });
        await attach(device);
      } catch (e) {
        const code = e instanceof BandError ? e.code : 'failed';
        set({ phase: code === 'cancelled' ? 'ready' : 'failed', problem: code, problemDetail: e instanceof Error ? e.message : String(e) });
      }
    },
    async retry() {
      if (!device) return get().connect();
      clearRetry();
      set({ phase: 'connecting', problem: null, problemDetail: null, stage: 'connecting', attempt: 0 });
      try {
        await attach(device);
      } catch (e) {
        set({ phase: 'failed', problem: e instanceof BandError ? e.code : 'failed', problemDetail: e instanceof Error ? e.message : String(e) });
      }
    },
    chooseDevice(id) {
      window.kawsayBluetooth?.choose(id);
    },
    cancelPick() {
      window.kawsayBluetooth?.cancel();
    },
    disconnect() {
      clearRetry();
      link?.close();
      link = null;
      device = null;
      set({ phase: 'idle', problem: null, deviceName: null, battery: null, connectedTs: null, lastTs: null, samples: [], rrIntervals: [], hrv: null, attempt: 0 });
    },
  };
});

/** True while the band is (or is trying to be) the heart-rate source. */
export const bandInUse = (phase: BandPhase) => phase === 'connected' || phase === 'reconnecting';
