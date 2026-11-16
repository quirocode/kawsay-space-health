import { cabinCo2 } from '../domain/cabinCo2';
/**
 * App state (P1). The store is the in-memory copy; every change is also written to the
 * local database (src/app/db.ts), so nothing is lost when the window closes.
 * Features read and write state only through these actions.
 */
import { create } from 'zustand';
import type {
  CountermeasurePlan, Environment, Finding, FlightSurgeonBrief, MissionContext, Reading, WatchAlert, WatchSample,
} from '../domain/types';
import { engine, loadDemoMission, watchEngine } from './engine';
import { buildCrewReadings, getCrewMember } from '../domain/crew';
import { indexedDatabase, loadDeviceProfile, memoryDatabase, saveDeviceProfile, type AlertRecord, type CaseRecord, type Database, type DeviceProfile, type LoggedVerification, type MissionInfo, type PendingRecheck, type Session, type Snapshot } from './db';
import { sampleAt, windowOf } from '../data/watchSeries';
import { cabinSamples, tsOf } from '../data/sol142';

export type { AlertRecord, CaseRecord, DeviceProfile, MissionInfo, PendingRecheck } from './db';

/** The seeded demo mission. Fictional name; the crew name matches the brief. */
export const DEFAULT_MISSION: MissionInfo = { name: 'Inti-1', crew: 'A. Quispe' };
/** Longest mission the editor accepts, in days (a Mars round trip is under 1,000). */
export const MAX_MISSION_DAYS = 1000;

export interface MissionEdit extends MissionInfo {
  missionDay: number;
  arrivalDay: number;
}

/**
 * Make an edit safe: names trimmed (blank keeps the old one), whole days, today at least day 1,
 * landing no earlier than today and no later than MAX_MISSION_DAYS.
 */
export function normalizeMission(edit: MissionEdit, current: MissionInfo): MissionEdit {
  const whole = (n: number, fallback: number) => (Number.isFinite(n) ? Math.round(n) : fallback);
  const arrivalDay = Math.min(MAX_MISSION_DAYS, Math.max(1, whole(edit.arrivalDay, 1)));
  const missionDay = Math.min(arrivalDay, Math.max(1, whole(edit.missionDay, 1)));
  return {
    name: edit.name.trim().slice(0, 40) || current.name,
    crew: edit.crew.trim().slice(0, 40) || current.crew,
    missionDay,
    arrivalDay,
  };
}

/** Bump when the demo data or the stored shape changes, so returning devices reload the seeded mission. */
export const DEMO_VERSION = 3;
/** Seconds of watch history the rules look at. */
const DETECT_WINDOW_SEC = 360;
/** An unanswered emergency goes to the crew after this long. */
export const CREW_ALERT_AFTER_MS = 60_000;
/** The same rule stays quiet this long after its last alert closed. */
const COOLDOWN_MS = 45 * 60_000;

export type Scene = 'morning' | 'headache' | 'watch';

export type Lang = 'en' | 'es';

interface Prefs {
  disclaimerSeen: boolean;
  theme: 'day' | 'night';
  lang: Lang;
}

export interface AppState extends Prefs {
  hydrated: boolean;
  context: MissionContext;
  nowTs: number;                    // simulated ship clock — the engine never reads the system clock
  readings: Reading[];
  plan: CountermeasurePlan;         // what the crew member commits to (Future Self "with plan")
  planAccepted: boolean;
  viewDay: number;                  // time slider on Future Self
  pending: PendingRecheck | null;
  acknowledged: Record<string, number>;
  cases: CaseRecord[];
  alerts: AlertRecord[];
  briefs: FlightSurgeonBrief[];
  recoveryStartTs: number | null;
  lastCheckTs: number | null;
  mission: MissionInfo;
  deviceProfile: DeviceProfile;
  activeCrewId: string;

  hydrate(db?: Database): Promise<void>;
  addReadings(rs: Reading[]): void;
  saveCheck(rs: Reading[]): void;
  setPlan(p: CountermeasurePlan): void;
  acceptPlan(): void;
  setViewDay(d: number): void;
  setEnvironment(env: Environment, commDelayMin: number): void;
  setPhase(phase: MissionContext['phase']): void;
  setMission(edit: MissionEdit): void;
  setDeviceProfile(profile: DeviceProfile): void;
  selectCrewMember(crewId: string): void;

  startRecheck(finding: Finding): void;
  acknowledge(ruleId: string): void;
  skipToRecheck(): void;
  completeRecheck(afterValue: number): string | null;
  closeCase(caseId: string): void;
  queueBrief(): FlightSurgeonBrief;

  tick(ms: number): void;
  setClock(ts: number): void;
  ackAlert(id: string): void;
  silenceAlert(id: string): void;
  callCrew(id: string): void;
  answerSymptoms(id: string, optionIds: string[]): void;
  nextStep(id: string): void;
  startAlertRecheck(id: string): void;
  skipAlertRecheck(id: string): void;
  finishAlertRecheck(id: string): void;

  playScene(scene: Scene): void;
  resetDemo(): void;
  dismissDisclaimer(): void;
  toggleTheme(): void;
  setLang(lang: Lang): void;
}

// ── Preferences: small, per device, not part of the health record ─────────────
const PREFS_KEY = 'kawsay:prefs';
/** `?lang=es` opens the demo in Spanish without touching the saved preference. */
function langFromUrl(): Lang | null {
  if (typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get('lang');
  return v === 'es' || v === 'en' ? v : null;
}
function loadPrefs(): Prefs {
  const fallback: Prefs = { disclaimerSeen: false, theme: 'night', lang: 'en' };
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<Prefs>;
    return {
      disclaimerSeen: saved.disclaimerSeen ?? fallback.disclaimerSeen,
      theme: saved.theme ?? fallback.theme,
      lang: langFromUrl() ?? saved.lang ?? fallback.lang,
    };
  } catch {
    return { ...fallback, lang: langFromUrl() ?? fallback.lang };
  }
}
function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ disclaimerSeen: p.disclaimerSeen, theme: p.theme, lang: p.lang }));
  } catch {
    /* private mode: preferences last for this session only */
  }
}

// ── Seed ──────────────────────────────────────────────────────────────────────
export function seedSnapshot(): Snapshot {
  const demo = loadDemoMission();
  return {
    session: {
      demoVersion: DEMO_VERSION,
      context: demo.context,
      nowTs: demo.nowTs,
      plan: demo.defaultPlan,       // recommended plan; "with plan" compares against it
      planAccepted: false,
      viewDay: demo.context.arrivalDay, // Future Self opens on arrival day: "what body will you land with?"
      pending: null,
      acknowledged: {},
      recoveryStartTs: null,
      lastCheckTs: null,
      mission: DEFAULT_MISSION,
      deviceProfile: loadDeviceProfile(),
    },
    readings: demo.history,
    cases: [],
    alerts: [],
    briefs: [],
  };
}

const sessionOf = (s: AppState): Session => ({
  demoVersion: DEMO_VERSION, context: s.context, nowTs: s.nowTs, plan: s.plan, planAccepted: s.planAccepted, viewDay: s.viewDay,
  pending: s.pending, acknowledged: s.acknowledged, recoveryStartTs: s.recoveryStartTs, lastCheckTs: s.lastCheckTs,
  mission: s.mission, deviceProfile: s.deviceProfile,
});

const fromSnapshot = (snap: Snapshot) => ({
  context: snap.session.context, nowTs: snap.session.nowTs, plan: snap.session.plan, planAccepted: snap.session.planAccepted,
  viewDay: snap.session.viewDay, pending: snap.session.pending, acknowledged: snap.session.acknowledged,
  recoveryStartTs: snap.session.recoveryStartTs, lastCheckTs: snap.session.lastCheckTs,
  mission: snap.session.mission ?? DEFAULT_MISSION,
  deviceProfile: snap.session.deviceProfile ?? loadDeviceProfile(),
  activeCrewId: getCrewMember((snap.session.mission ?? DEFAULT_MISSION).crew).id,
  readings: snap.readings, cases: snap.cases, alerts: snap.alerts, briefs: snap.briefs,
});

const snapshotOf = (s: AppState): Snapshot => ({ session: sessionOf(s), readings: s.readings, cases: s.cases, alerts: s.alerts, briefs: s.briefs });

// ── Pure helpers (tested) ─────────────────────────────────────────────────────
const OPEN: AlertRecord['state'][] = ['active', 'responding', 'rechecking'];
const SEVERITY = { caution: 0, warning: 1, emergency: 2 } as const;
export const isOpen = (a: AlertRecord) => OPEN.includes(a.state);

/**
 * Fold what the watch rules see right now into the alert log: open a record for a new alert,
 * raise the level of one that got worse, close a quiet caution that cleared by itself, and
 * send an unanswered emergency to the crew.
 */
export function reconcileAlerts(alerts: AlertRecord[], detected: WatchAlert[], nowTs: number): AlertRecord[] {
  let out = alerts;
  const replace = (next: AlertRecord) => { out = out.map((a) => (a.id === next.id ? next : a)); };
  for (const alert of detected) {
    const open = out.find((a) => a.alert.ruleId === alert.ruleId && isOpen(a));
    if (open) {
      if (SEVERITY[alert.level] > SEVERITY[open.alert.level]) replace({ ...open, alert, silenced: false }); // same record; the clock restarts at the new level
      continue;
    }
    const last = [...out].reverse().find((a) => a.alert.ruleId === alert.ruleId);
    if (last && nowTs - (last.closedTs ?? last.alert.detectedTs) < COOLDOWN_MS) continue;
    out = [...out, {
      id: `${alert.ruleId}@${alert.detectedTs}`, alert, state: 'active', ackTs: null, crewAlertedTs: null, silenced: false,
      stepIndex: 0, symptoms: [], recheckDueTs: null, caseId: null, closedTs: null,
    }];
  }
  const firing = new Set(detected.map((a) => a.ruleId));
  for (const a of out) {
    if (a.state === 'active' && a.alert.level === 'caution' && !firing.has(a.alert.ruleId)) replace({ ...a, state: 'resolved', closedTs: nowTs });
    else if (a.state === 'active' && a.alert.level === 'emergency' && a.crewAlertedTs === null && nowTs - a.alert.detectedTs >= CREW_ALERT_AFTER_MS) replace({ ...a, crewAlertedTs: nowTs });
  }
  return out;
}

/** The alert that needs the crew member right now, most severe first. */
export function demandingAlert(alerts: AlertRecord[]): AlertRecord | undefined {
  return alerts.filter((a) => a.state === 'active' && a.alert.level !== 'caution').sort((a, b) => SEVERITY[b.alert.level] - SEVERITY[a.alert.level])[0];
}

const latestOf = (readings: Reading[], id: string, untilTs = Infinity): Reading | undefined => {
  let best: Reading | undefined;
  for (const r of readings) if (r.indicatorId === id && r.ts <= untilTs && (!best || r.ts > best.ts)) best = r;
  return best;
};

const mergeReadings = (cur: Reading[], add: Reading[]) => [...cur, ...add].sort((a, b) => a.ts - b.ts);

/** What goes into the next brief: every case since the last one, plus what is active now. */
export function briefInput(s: Pick<AppState, 'cases' | 'briefs' | 'readings' | 'context' | 'alerts' | 'nowTs'>) {
  const since = s.briefs.length ? s.briefs[s.briefs.length - 1].generatedTs : -Infinity;
  const recent = s.cases.filter((c) => c.startedTs > since || (c.closedTs ?? Infinity) > since);
  // Already acted on, or already told to Earth in the last brief: not news.
  const handled = new Set([...recent.map((c) => c.finding.ruleId), ...(s.briefs[s.briefs.length - 1]?.findings.map((f) => f.ruleId) ?? [])]);
  const active = engine.findCompound(s.readings, s.context, s.nowTs).filter((f) => !handled.has(f.ruleId));
  const openAlerts = s.alerts.filter((a) => isOpen(a) && !a.caseId).map((a) => watchEngine.toFinding(a.alert)).filter((f) => !handled.has(f.ruleId));
  return {
    findings: [...recent.map((c) => c.finding), ...openAlerts, ...active],
    verifications: recent.flatMap((c) => (c.verification ? [c.verification] : [])),
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────
let database: Database = memoryDatabase();
const crewReadingsCache = new Map<string, Reading[]>();
const persist = (write: (db: Database) => Promise<void>) => {
  void write(database).catch((err) => console.error('KAWSAY could not save to the local database:', err));
};

export const useApp = create<AppState>()((set, get) => {
  /** Apply a change and write the session row; `also` writes the rows that changed. */
  const commit = (patch: Partial<AppState>, also?: (db: Database) => Promise<void>) => {
    set(patch);
    const session = sessionOf(get());
    persist(async (db) => {
      await db.saveSession(session);
      if (also) await also(db);
    });
  };
  const reading = (indicatorId: string, value: number, origin: Reading['origin'] = 'manual'): Reading => {
    const s = get();
    return { indicatorId, value, ts: s.nowTs, missionDay: s.context.missionDay, phase: s.context.phase, origin };
  };
  const updateAlert = (id: string, change: (a: AlertRecord) => AlertRecord, extra: Partial<AppState> = {}, also?: (db: Database) => Promise<void>) => {
    const cur = get().alerts.find((a) => a.id === id);
    if (!cur) return;
    const next = change(cur);
    commit({ alerts: get().alerts.map((a) => (a.id === id ? next : a)), ...extra }, async (db) => {
      await db.putAlert(next);
      if (also) await also(db);
    });
  };
  const currentSample = (): WatchSample => sampleAt(get().nowTs, { recoveryStartTs: get().recoveryStartTs });
  const closeAlertCase = (record: AlertRecord, escalated: boolean, afterValue: number | null) => {
    const s = get();
    const finding = watchEngine.toFinding(record.alert);
    const indicatorId = finding.actions[0].recheckIndicatorId!;
    const before: Reading = { ...reading(indicatorId, record.alert.value, 'sensor_sim'), ts: record.alert.detectedTs };
    const after = afterValue === null ? null : reading(indicatorId, afterValue, 'sensor_sim');
    const verification: LoggedVerification | null = after ? { ...engine.verify(before, after), ts: s.nowTs } : null;
    const failed = escalated || (verification?.escalate ?? false);
    const record2: CaseRecord = {
      id: `${finding.ruleId}@${record.alert.detectedTs}`, kind: 'watch', finding, startedTs: record.alert.detectedTs, verification,
      compared: after ? [{ label: 'Heart rate', unit: 'bpm', before: before.value, after: after.value }] : [],
      closedTs: failed ? null : s.nowTs, sentToSurgeon: false,
    };
    if (indicatorId === 'spo2' && record2.compared[0]) record2.compared[0] = { ...record2.compared[0], label: 'Blood oxygen', unit: '%' };
    const added = after ? [before, after] : [before];
    updateAlert(record.id, (a) => ({ ...a, state: failed ? 'escalated' : 'resolved', caseId: record2.id, closedTs: s.nowTs, crewAlertedTs: failed ? (a.crewAlertedTs ?? s.nowTs) : a.crewAlertedTs }), {
      cases: [...s.cases.filter((c) => c.id !== record2.id), record2],
      readings: mergeReadings(s.readings, added),
    }, async (db) => {
      await db.putCase(record2);
      await db.putReadings(added);
    });
  };

  return {
    hydrated: false,
    ...fromSnapshot(seedSnapshot()),
    ...loadPrefs(),

    async hydrate(db) {
      if (db) database = db;
      else if (typeof indexedDB !== 'undefined') database = indexedDatabase(indexedDB);
      let snap: Snapshot | null = null;
      try {
        snap = await database.load();
      } catch (err) {
        console.error('KAWSAY could not open the local database; running in memory for this session:', err);
        database = memoryDatabase();
      }
      if (!snap || snap.session.demoVersion !== DEMO_VERSION) {
        snap = seedSnapshot();
        await database.replace(snap).catch((err) => console.error('KAWSAY could not seed the local database:', err));
      }
      set({ ...fromSnapshot(snap), hydrated: true });
    },

    addReadings: (rs) => commit({ readings: mergeReadings(get().readings, rs) }, (db) => db.putReadings(rs)),
    saveCheck: (rs) => commit({ readings: mergeReadings(get().readings, rs), lastCheckTs: get().nowTs }, (db) => db.putReadings(rs)),
    setPlan: (p) => commit({ plan: { ...get().plan, ...p } }),
    acceptPlan: () => commit({ planAccepted: true }),
    setViewDay: (d) => commit({ viewDay: d }),
    setEnvironment: (environment, commDelayMin) => {
      const c = get().context;
      const phase = !Number.isFinite(commDelayMin) ? 'conjunction' : c.phase === 'conjunction' ? 'cruise' : c.phase;
      commit({ context: { ...c, environment, commDelayMin, phase } });
    },
    setPhase: (phase) => {
      const c = get().context;
      commit({ context: { ...c, phase } });
    },
    setMission: (edit) => {
      const s = get();
      const m = normalizeMission(edit, s.mission);
      // Future Self keeps looking at landing day when that was where it stood.
      const viewDay = s.viewDay >= s.context.arrivalDay ? m.arrivalDay : Math.min(m.arrivalDay, Math.max(m.missionDay, s.viewDay));
      commit({ mission: { name: m.name, crew: m.crew }, activeCrewId: getCrewMember(m.crew).id, context: { ...s.context, missionDay: m.missionDay, arrivalDay: m.arrivalDay }, viewDay });
    },
    setDeviceProfile: (deviceProfile) => {
      saveDeviceProfile(deviceProfile);
      commit({ deviceProfile });
    },
    selectCrewMember: (crewId) => {
      const s = get();
      const profile = getCrewMember(crewId);
      crewReadingsCache.set(s.activeCrewId, s.readings);
      const base = loadDemoMission().history;
      const nextReadings = crewReadingsCache.get(profile.id) ?? buildCrewReadings(base, profile);
      crewReadingsCache.set(profile.id, nextReadings);
      commit(
        {
          activeCrewId: profile.id,
          mission: { ...s.mission, crew: profile.name },
          readings: nextReadings,
        },
        (db) => db.putReadings(nextReadings),
      );
    },

    startRecheck: (finding) => {
      const s = get();
      const action = finding.actions[0];
      const indicatorId = action.recheckIndicatorId!;
      const before = latestOf(s.readings, indicatorId) ?? reading(indicatorId, 0);
      const record: CaseRecord = {
        id: `${finding.ruleId}@${s.nowTs}`, kind: 'finding', finding, startedTs: s.nowTs, verification: null, compared: [], closedTs: null, sentToSurgeon: false,
      };
      commit({
        cases: [...s.cases, record],
        pending: { caseId: record.id, ruleId: finding.ruleId, indicatorId, dueTs: s.nowTs + (action.recheckInMin ?? 30) * 60_000, before },
      }, (db) => db.putCase(record));
    },
    acknowledge: (ruleId) => commit({ acknowledged: { ...get().acknowledged, [ruleId]: get().nowTs } }),
    skipToRecheck: () => {
      const s = get();
      if (!s.pending || s.nowTs >= s.pending.dueTs) return;
      // Demo: the scrubber check brings the cabin sensor back down while the timer runs.
      const { pending } = s;
      const template = loadDemoMission().beats.verification.find((r) => r.indicatorId === 'cabin_co2');
      const started = s.cases.find((record) => record.id === pending.caseId)?.startedTs ?? s.nowTs;
      const sensor = pending.ruleId === 'co2_headache' && template
        ? cabinSamples({ ...template, missionDay: s.context.missionDay, phase: s.context.phase }, Math.min(started + 5 * 60_000, pending.dueTs), pending.dueTs)
        : [];
      commit({ nowTs: s.pending.dueTs, readings: mergeReadings(s.readings, sensor) }, (db) => db.putReadings(sensor));
    },
    completeRecheck: (afterValue) => {
      const s = get();
      const p = s.pending;
      if (!p) return null;
      const after = reading(p.indicatorId, afterValue);
      const verification: LoggedVerification = { ...engine.verify(p.before, after), ts: s.nowTs };
      const readings = mergeReadings(s.readings, [after]);
      const defs = new Map(engine.indicators().map((d) => [d.id, d]));
      const name = (id: string) => defs.get(id)?.name ?? id;
      const compared: CaseRecord['compared'] = [{ label: name(p.indicatorId), unit: defs.get(p.indicatorId)?.input === 'scale_1_5' ? 'of 5' : defs.get(p.indicatorId)?.unit ?? '', before: p.before.value, after: afterValue }];
      const started = s.cases.find((c) => c.id === p.caseId)?.startedTs ?? s.nowTs;
      if (p.ruleId === 'co2_headache') {
        const before = cabinCo2(s.readings, started);
        const after = cabinCo2(readings, s.nowTs);
        if (before.value !== null && after.value !== null && after.latest && after.latest.ts > started) {
          compared.push({ label: 'Cabin CO₂ (1-hour average)', unit: 'mmHg', before: before.value, after: after.value });
        }
      }
      const cases = s.cases.map((c) => (c.id === p.caseId ? { ...c, verification, compared } : c));
      const updated = cases.find((c) => c.id === p.caseId)!;
      commit({ readings, cases, pending: null }, async (db) => {
        await db.putReadings([after]);
        await db.putCase(updated);
      });
      return p.caseId;
    },
    closeCase: (caseId) => {
      const cases = get().cases.map((c) => (c.id === caseId ? { ...c, closedTs: get().nowTs } : c));
      commit({ cases }, (db) => db.putCase(cases.find((c) => c.id === caseId)!));
    },
    queueBrief: () => {
      const s = get();
      const readiness = engine.project(s.readings, s.context, s.plan);
      const brief = engine.brief({ ...briefInput(s), readiness, ctx: s.context, nowTs: s.nowTs });
      const sentIds = new Set(brief.findings.map((f) => f.ruleId));
      const cases = s.cases.map((c) => (sentIds.has(c.finding.ruleId) && !c.sentToSurgeon ? { ...c, sentToSurgeon: true, closedTs: c.closedTs ?? s.nowTs } : c));
      commit({ briefs: [...s.briefs, brief], cases }, async (db) => {
        await db.putBrief(brief);
        for (const c of cases) if (c.sentToSurgeon) await db.putCase(c);
      });
      return brief;
    },

    tick: (ms) => {
      const s = get();
      const nowTs = s.nowTs + ms;
      const detected = watchEngine.detect(windowOf(nowTs, DETECT_WINDOW_SEC, { recoveryStartTs: s.recoveryStartTs }), s.context, nowTs);
      const alerts = reconcileAlerts(s.alerts, detected, nowTs);
      if (alerts === s.alerts) {
        set({ nowTs });
        if (Math.floor(nowTs / 15_000) !== Math.floor(s.nowTs / 15_000)) persist((db) => db.saveSession(sessionOf(get())));
        return;
      }
      const changed = alerts.filter((a) => !s.alerts.includes(a));
      commit({ nowTs, alerts }, async (db) => { for (const a of changed) await db.putAlert(a); });
    },
    setClock: (ts) => commit({ nowTs: ts }),

    ackAlert: (id) => updateAlert(id, (a) => ({ ...a, state: 'responding', ackTs: get().nowTs, silenced: true })),
    silenceAlert: (id) => updateAlert(id, (a) => ({ ...a, silenced: true })),
    callCrew: (id) => updateAlert(id, (a) => ({ ...a, crewAlertedTs: a.crewAlertedTs ?? get().nowTs, silenced: true })),
    answerSymptoms: (id, optionIds) => {
      const record = get().alerts.find((a) => a.id === id);
      if (!record) return;
      const redFlag = watchEngine.protocol(record.alert)[0]?.options?.some((o) => o.escalate && optionIds.includes(o.id)) ?? false;
      updateAlert(id, (a) => ({ ...a, symptoms: optionIds, stepIndex: a.stepIndex + 1 }));
      if (redFlag) closeAlertCase(get().alerts.find((a) => a.id === id)!, true, null);
    },
    nextStep: (id) => {
      const record = get().alerts.find((a) => a.id === id);
      if (!record) return;
      const step = watchEngine.protocol(record.alert)[record.stepIndex];
      if (step?.logs) {
        const cur = get().readings.filter((r) => r.indicatorId === step.logs!.indicatorId && r.missionDay === get().context.missionDay);
        const total = (cur.length ? Math.max(...cur.map((r) => r.value)) : 0) + step.logs.add;
        get().addReadings([reading(step.logs.indicatorId, total)]);
      }
      updateAlert(id, (a) => ({ ...a, stepIndex: a.stepIndex + 1 }));
    },
    startAlertRecheck: (id) => {
      const s = get();
      updateAlert(id, (a) => ({ ...a, state: 'rechecking', recheckDueTs: s.nowTs + a.alert.recheckInMin * 60_000 }), { recoveryStartTs: s.recoveryStartTs ?? s.nowTs });
    },
    skipAlertRecheck: (id) => {
      const due = get().alerts.find((a) => a.id === id)?.recheckDueTs;
      if (due && due > get().nowTs) commit({ nowTs: due });
    },
    finishAlertRecheck: (id) => {
      const record = get().alerts.find((a) => a.id === id);
      if (!record) return;
      const now = currentSample();
      closeAlertCase(record, false, record.alert.signal === 'spo2' ? now.spo2 : now.heartRate);
    },

    playScene: (scene) => {
      const demo = loadDemoMission();
      const s = get();
      const at = (hh: number, mm: number, ss = 0) => tsOf(demo.context.missionDay, hh, mm) + ss * 1000;
      if (scene === 'morning') return get().resetDemo();
      if (scene === 'headache') {
        const ts = Math.max(s.nowTs, at(13, 10));
        const added = demo.beats.headache.map((reading) => ({
          ...reading, ts: ts + reading.ts - at(13, 10), missionDay: s.context.missionDay, phase: s.context.phase,
        }));
        commit({ nowTs: ts + 2 * 60_000, readings: mergeReadings(s.readings, added) }, (db) => db.putReadings(added));
        return;
      }
      // 'watch': twenty seconds before the alarm; the watch series already shows the climb.
      const ts = at(14, 31, 40);
      const added = s.readings.some((r) => r.indicatorId === 'water_ml' && r.missionDay === demo.context.missionDay) ? [] : demo.beats.afternoon;
      set({ nowTs: ts, recoveryStartTs: null, readings: mergeReadings(s.readings, added), alerts: s.alerts.filter((a) => a.alert.ruleId !== 'resting_tachycardia') });
      const snap = snapshotOf(get());
      persist((db) => db.replace(snap));
    },
    resetDemo: () => {
      const snap = seedSnapshot();
      set(fromSnapshot(snap));
      persist((db) => db.replace(snap));
    },

    dismissDisclaimer: () => { set({ disclaimerSeen: true }); savePrefs(get()); },
    toggleTheme: () => { set({ theme: get().theme === 'day' ? 'night' : 'day' }); savePrefs(get()); },
    setLang: (lang) => { set({ lang }); savePrefs(get()); },
  };
});

/** For tests: point the store at a database without loading from it. */
export function useDatabase(db: Database) {
  database = db;
}
