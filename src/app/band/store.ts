/**
 * Band connection state (P1). Kept apart from the mission store: the link is live radio
 * state, not mission data, and it is never written to the local database.
 * Timestamps here are real wall-clock time, not the ship clock.
 */
import { create } from 'zustand';
import { BandError, bluetoothSupport, openBand, pickBand, type BandLink, type BluetoothSupport } from './bluetooth';
import { BAND_LINK, isUsable, keepWindow, parseHeartRateMeasurement, reconnectDelayMs, type BandSample } from './heartRate';

export type BandPhase = 'idle' | 'ready' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
export type BandProblem = 'cancelled' | 'no-hr-service' | 'failed' | 'lost';

interface BandState {
  support: BluetoothSupport | 'checking';
  phase: BandPhase;
  problem: BandProblem | null;
  deviceName: string | null;
  battery: number | null;
  connectedTs: number | null;
  /** Newest usable reading, wall-clock ms. */
  lastTs: number | null;
  samples: BandSample[];
  attempt: number;

  checkSupport(): Promise<void>;
  /** Step 2: show the "get your band ready" checklist. */
  prepare(): void;
  back(): void;
  /** Step 3: open the device list. Call from a click. */
  connect(): Promise<void>;
  /** Reconnect to the band chosen before, without the device list. */
  retry(): Promise<void>;
  disconnect(): void;
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
    set((s) => ({ lastTs: ts, samples: keepWindow([...s.samples, { ts, bpm: m.bpm }], ts) }));
  };

  const attach = async (d: BluetoothDevice) => {
    link = await openBand(d, { onPacket, onDropped });
    set({ phase: 'connected', problem: null, deviceName: link.name, battery: link.battery, connectedTs: Date.now(), attempt: 0 });
  };

  const onDropped = () => {
    link = null;
    const attempt = get().attempt;
    if (!device || attempt >= BAND_LINK.reconnectAttempts) {
      set({ phase: 'failed', problem: 'lost' });
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
    deviceName: null,
    battery: null,
    connectedTs: null,
    lastTs: null,
    samples: [],
    attempt: 0,

    async checkSupport() {
      set({ support: await bluetoothSupport() });
    },
    prepare() {
      set({ phase: 'ready', problem: null });
    },
    back() {
      set({ phase: 'idle', problem: null });
    },
    async connect() {
      set({ phase: 'connecting', problem: null });
      try {
        device = await pickBand();
        set({ deviceName: device.name ?? null, samples: [], lastTs: null });
        await attach(device);
      } catch (e) {
        const code = e instanceof BandError ? e.code : 'failed';
        set({ phase: code === 'cancelled' ? 'ready' : 'failed', problem: code });
      }
    },
    async retry() {
      if (!device) return get().connect();
      clearRetry();
      set({ phase: 'connecting', problem: null, attempt: 0 });
      try {
        await attach(device);
      } catch (e) {
        set({ phase: 'failed', problem: e instanceof BandError ? e.code : 'failed' });
      }
    },
    disconnect() {
      clearRetry();
      link?.close();
      link = null;
      device = null;
      set({ phase: 'idle', problem: null, deviceName: null, battery: null, connectedTs: null, lastTs: null, samples: [], attempt: 0 });
    },
  };
});

/** True while the band is (or is trying to be) the heart-rate source. */
export const bandInUse = (phase: BandPhase) => phase === 'connected' || phase === 'reconnecting';
