/**
 * Local database (P1). Everything the crew member records lives on this device, in
 * IndexedDB: no server, no account, nothing leaves the machine.
 *
 * Tables
 *   readings   every measurement, manual or from a sensor      key [indicatorId, ts]
 *   cases      findings and watch alerts that were acted on    key id
 *   alerts     watch alerts and where each one stands          key id
 *   briefs     briefs queued for the flight surgeon            key generatedTs
 *   session    one row: mission context, ship clock, plan      key 'session'
 *
 * Written directly on IndexedDB (no library) so the app has nothing to download.
 * The store talks to the `Database` interface; tests use the in-memory one.
 */
import type { CountermeasurePlan, Finding, FlightSurgeonBrief, MissionContext, Reading, VerificationResult, WatchAlert } from '../domain/types';

export interface LoggedVerification extends VerificationResult {
  ts: number;
}

/** A finding or watch alert the crew member acted on: what it was, what they did, how it ended. */
export interface CaseRecord {
  id: string;                         // `${ruleId}@${startedTs}`
  kind: 'finding' | 'watch';
  finding: Finding;
  startedTs: number;
  verification: LoggedVerification | null;
  /** Readings shown side by side on the "Did it work?" screen. */
  compared: { label: string; unit: string; before: number; after: number }[];
  closedTs: number | null;
  sentToSurgeon: boolean;
}

export type AlertState = 'active' | 'responding' | 'rechecking' | 'resolved' | 'escalated';

export interface AlertRecord {
  id: string;                         // `${ruleId}@${detectedTs}`
  alert: WatchAlert;
  state: AlertState;
  ackTs: number | null;
  crewAlertedTs: number | null;
  silenced: boolean;
  stepIndex: number;
  symptoms: string[];
  recheckDueTs: number | null;
  caseId: string | null;
  closedTs: number | null;
}

export interface PendingRecheck {
  caseId: string;
  ruleId: string;
  indicatorId: string;
  dueTs: number;
  before: Reading;
}

export type DeviceProfile = 'huawei_ble' | 'xiaomi_zepp' | 'simulated';

export const DEFAULT_DEVICE_PROFILE: DeviceProfile = 'huawei_ble';

const DEVICE_PROFILE_STORAGE_KEY = 'kawsay.deviceProfile';

export function isDeviceProfile(value: unknown): value is DeviceProfile {
  return value === 'huawei_ble' || value === 'xiaomi_zepp' || value === 'simulated';
}

/** Load the remembered biometric device profile across sessions. */
export function loadDeviceProfile(): DeviceProfile {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(DEVICE_PROFILE_STORAGE_KEY) : null;
    return isDeviceProfile(raw) ? raw : DEFAULT_DEVICE_PROFILE;
  } catch {
    return DEFAULT_DEVICE_PROFILE;
  }
}

/** Persist the selected biometric device profile across sessions. */
export function saveDeviceProfile(profile: DeviceProfile): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DEVICE_PROFILE_STORAGE_KEY, profile);
    }
  } catch {
    // storage blocked: profile still works in memory for this session
  }
}

export interface Session {
  demoVersion: number;
  context: MissionContext;
  nowTs: number;
  plan: CountermeasurePlan;
  planAccepted: boolean;
  viewDay: number;
  pending: PendingRecheck | null;
  acknowledged: Record<string, number>;   // ruleId → ts, for findings with a next-day recheck
  recoveryStartTs: number | null;         // simulated watch: when the crew member finished responding
  lastCheckTs: number | null;
  mission?: MissionInfo;                 // optional: saves from before it existed get the demo default
  deviceProfile?: DeviceProfile;         // selected device profile persisted between sessions
  crewId?: string;                       // crew member whose record is open on this device
}

/** Who and what is flying. Shown in the header; editable on the Mission screen. */
export interface MissionInfo {
  name: string;
  crew: string;
}

export interface Snapshot {
  session: Session;
  readings: Reading[];
  cases: CaseRecord[];
  alerts: AlertRecord[];
  briefs: FlightSurgeonBrief[];
}

export interface Database {
  load(): Promise<Snapshot | null>;
  /** Replace everything (first run, demo reset). */
  replace(snapshot: Snapshot): Promise<void>;
  saveSession(session: Session): Promise<void>;
  putReadings(readings: Reading[]): Promise<void>;
  putCase(record: CaseRecord): Promise<void>;
  putAlert(record: AlertRecord): Promise<void>;
  putBrief(brief: FlightSurgeonBrief): Promise<void>;
}

// ── In memory: tests, and browsers where IndexedDB is unavailable ──────────────
export function memoryDatabase(): Database {
  let snap: Snapshot | null = null;
  const upsert = <T>(list: T[], item: T, same: (a: T) => boolean) => {
    const i = list.findIndex(same);
    if (i === -1) list.push(item);
    else list[i] = item;
  };
  const copy = <T>(v: T): T => structuredClone(v);
  return {
    load: async () => (snap ? copy(snap) : null),
    replace: async (s) => {
      snap = copy(s);
      if (s.session.deviceProfile) saveDeviceProfile(s.session.deviceProfile);
    },
    saveSession: async (session) => {
      if (snap) snap.session = copy(session);
      if (session.deviceProfile) saveDeviceProfile(session.deviceProfile);
    },
    putReadings: async (rs) => { if (snap) for (const r of rs) upsert(snap.readings, copy(r), (x) => x.indicatorId === r.indicatorId && x.ts === r.ts); },
    putCase: async (c) => { if (snap) upsert(snap.cases, copy(c), (x) => x.id === c.id); },
    putAlert: async (a) => { if (snap) upsert(snap.alerts, copy(a), (x) => x.id === a.id); },
    putBrief: async (b) => { if (snap) upsert(snap.briefs, copy(b), (x) => x.generatedTs === b.generatedTs); },
  };
}

// ── IndexedDB ─────────────────────────────────────────────────────────────────
const DB_NAME = 'kawsay';
const DB_VERSION = 1;
const STORES = ['readings', 'cases', 'alerts', 'briefs', 'session'] as const;
type StoreName = (typeof STORES)[number];

function open(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = factory.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      const readings = db.createObjectStore('readings', { keyPath: ['indicatorId', 'ts'] });
      readings.createIndex('ts', 'ts');
      readings.createIndex('missionDay', 'missionDay');
      db.createObjectStore('cases', { keyPath: 'id' });
      db.createObjectStore('alerts', { keyPath: 'id' }).createIndex('state', 'state');
      db.createObjectStore('briefs', { keyPath: 'generatedTs' });
      db.createObjectStore('session', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('UPRIGHT database is open in another window with an older version.'));
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function all<T>(tx: IDBTransaction, store: StoreName): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export function indexedDatabase(factory: IDBFactory): Database {
  let handle: Promise<IDBDatabase> | null = null;
  const db = () => (handle ??= open(factory));
  const write = async (stores: StoreName[], run: (tx: IDBTransaction) => void) => {
    const tx = (await db()).transaction(stores, 'readwrite');
    run(tx);
    await done(tx);
  };
  const putAll = (store: StoreName, rows: unknown[]) => write([store], (tx) => { for (const row of rows) tx.objectStore(store).put(row); });

  return {
    async load() {
      const tx = (await db()).transaction([...STORES], 'readonly');
      const [session] = await all<{ key: string; value: Session }>(tx, 'session');
      if (!session) return null;
      const [readings, cases, alerts, briefs] = await Promise.all([
        all<Reading>(tx, 'readings'), all<CaseRecord>(tx, 'cases'), all<AlertRecord>(tx, 'alerts'), all<FlightSurgeonBrief>(tx, 'briefs'),
      ]);
      return {
        session: { ...session.value, deviceProfile: session.value.deviceProfile ?? loadDeviceProfile() },
        readings: readings.sort((a, b) => a.ts - b.ts),
        cases: cases.sort((a, b) => a.startedTs - b.startedTs),
        alerts: alerts.sort((a, b) => a.alert.detectedTs - b.alert.detectedTs),
        briefs: briefs.sort((a, b) => a.generatedTs - b.generatedTs),
      };
    },
    replace: (s) => {
      if (s.session.deviceProfile) saveDeviceProfile(s.session.deviceProfile);
      return write([...STORES], (tx) => {
        for (const name of STORES) tx.objectStore(name).clear();
        tx.objectStore('session').put({ key: 'session', value: s.session });
        for (const r of s.readings) tx.objectStore('readings').put(r);
        for (const c of s.cases) tx.objectStore('cases').put(c);
        for (const a of s.alerts) tx.objectStore('alerts').put(a);
        for (const b of s.briefs) tx.objectStore('briefs').put(b);
      });
    },
    saveSession: (session) => {
      if (session.deviceProfile) saveDeviceProfile(session.deviceProfile);
      return putAll('session', [{ key: 'session', value: session }]);
    },
    putReadings: (rs) => putAll('readings', rs),
    putCase: (c) => putAll('cases', [c]),
    putAlert: (a) => putAll('alerts', [a]),
    putBrief: (b) => putAll('briefs', [b]),
  };
}

/** IndexedDB when the browser has it; otherwise memory, so the app still runs for the session. */
export function defaultDatabase(): Database {
  return typeof indexedDB === 'undefined' ? memoryDatabase() : indexedDatabase(indexedDB);
}
