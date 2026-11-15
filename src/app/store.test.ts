import { beforeEach, describe, expect, it } from 'vitest';
import { engine } from './engine';
import { memoryDatabase, type Database } from './db';
import { briefInput, demandingAlert, normalizeMission, reconcileAlerts, seedSnapshot, useApp, CREW_ALERT_AFTER_MS, MAX_MISSION_DAYS } from './store';
import { tsOf } from '../data/sol142';
import type { WatchAlert } from '../domain/types';

let db: Database;
const app = () => useApp.getState();
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(async () => {
  db = memoryDatabase();
  await app().hydrate(db);
});

describe('local database', () => {
  it('seeds the Sol 142 mission on first run and loads it back', async () => {
    const snap = (await db.load())!;
    expect(snap.session.context.missionDay).toBe(142);
    expect(snap.readings.length).toBe(seedSnapshot().readings.length);
    expect(app().hydrated).toBe(true);
  });

  it('every reading the crew member saves survives a restart', async () => {
    app().saveCheck([{ indicatorId: 'mood', value: 2, ts: app().nowTs, missionDay: 142, phase: 'cruise', origin: 'manual' }]);
    await flush();
    await app().hydrate(db); // same database, fresh load
    expect(app().readings.filter((r) => r.indicatorId === 'mood').at(-1)?.value).toBe(2);
    expect(app().lastCheckTs).not.toBeNull();
  });

  it('a stored mission from an older demo version is replaced by the seed', async () => {
    const old = seedSnapshot();
    old.session.demoVersion = 1;
    old.readings = [];
    await db.replace(old);
    await app().hydrate(db);
    expect(app().readings.length).toBeGreaterThan(1000);
  });
});

describe('Sol 142: headache scene, end to end', () => {
  it('finding → action → timer → new reading → improved → brief', async () => {
    app().playScene('headache');
    const [finding] = engine.findCompound(app().readings, app().context);
    expect(finding.ruleId).toBe('co2_headache');
    expect(finding.because).toHaveLength(3);

    app().startRecheck(finding);
    expect(app().pending?.indicatorId).toBe('headache_score');
    expect(app().pending!.dueTs - app().nowTs).toBe(30 * 60_000);

    app().skipToRecheck();
    expect(app().nowTs).toBe(app().pending!.dueTs);
    const caseId = app().completeRecheck(2)!;
    const record = app().cases.find((c) => c.id === caseId)!;
    expect(record.verification?.outcome).toBe('improved');
    expect(record.compared.map((c) => [c.label, c.before, c.after])).toEqual([['Headache', 4, 2], ['Cabin CO₂', 4.1, 2.6]]);
    expect(engine.findCompound(app().readings, app().context).map((f) => f.ruleId)).not.toContain('co2_headache');

    app().closeCase(caseId);
    const brief = app().queueBrief();
    expect(brief.headline).toContain('improved');
    expect(brief.arrivesAtTs).toBe(brief.generatedTs + 14 * 60_000);
    expect(brief.actionsTaken[0]).toMatch(/→ improved$/);

    await flush();
    const snap = (await db.load())!;
    expect(snap.briefs).toHaveLength(1);
    expect(snap.cases[0].sentToSurgeon).toBe(true);
  });

  it('a reading that does not improve asks Earth for a decision', () => {
    app().playScene('headache');
    app().startRecheck(engine.findCompound(app().readings, app().context)[0]);
    app().skipToRecheck();
    app().completeRecheck(4);
    expect(app().queueBrief().decisionRequested).toMatch(/^Please review/);
  });
});

describe('Sol 142: watch scene, end to end', () => {
  const runUntil = (stop: () => boolean, maxSec = 600) => { for (let i = 0; i < maxSec && !stop(); i++) app().tick(1000); };

  it('the alarm rises by itself at 14:32, and the response brings the heart rate down', async () => {
    app().playScene('watch');
    expect(demandingAlert(app().alerts)).toBeUndefined();
    runUntil(() => demandingAlert(app().alerts) !== undefined);
    const alarm = demandingAlert(app().alerts)!;
    expect(alarm.alert).toMatchObject({ ruleId: 'resting_tachycardia', level: 'emergency' });
    expect(alarm.alert.detectedTs).toBeGreaterThanOrEqual(tsOf(142, 14, 31) + 50_000);
    expect(alarm.alert.detectedTs).toBeLessThanOrEqual(tsOf(142, 14, 32) + 5_000);

    app().ackAlert(alarm.id);
    expect(demandingAlert(app().alerts)).toBeUndefined();
    app().answerSymptoms(alarm.id, ['pounding']);
    app().nextStep(alarm.id); // blood pressure
    app().nextStep(alarm.id); // breathing
    app().nextStep(alarm.id); // water: logged
    expect(app().readings.filter((r) => r.indicatorId === 'water_ml').at(-1)?.value).toBe(1350);
    app().startAlertRecheck(alarm.id);
    app().skipAlertRecheck(alarm.id);
    app().finishAlertRecheck(alarm.id);

    const closed = app().alerts.find((a) => a.id === alarm.id)!;
    expect(closed.state).toBe('resolved');
    const record = app().cases.find((c) => c.id === closed.caseId)!;
    expect(record.verification?.outcome).toBe('improved');
    expect(record.compared[0].after).toBeLessThan(100);
    expect(briefInput(app()).findings.map((f) => f.ruleId)).toContain('watch.resting_tachycardia');

    await flush();
    expect((await db.load())!.alerts.find((a) => a.id === alarm.id)?.state).toBe('resolved');
  });

  it('chest pain goes straight to the crew and Earth', () => {
    app().playScene('watch');
    runUntil(() => demandingAlert(app().alerts) !== undefined);
    const alarm = demandingAlert(app().alerts)!;
    app().ackAlert(alarm.id);
    app().answerSymptoms(alarm.id, ['chest_pain']);
    const after = app().alerts.find((a) => a.id === alarm.id)!;
    expect(after.state).toBe('escalated');
    expect(after.crewAlertedTs).not.toBeNull();
    expect(app().queueBrief().decisionRequested).toMatch(/^Please review/);
  });

  it('an unanswered emergency alerts the crew after a minute', () => {
    app().playScene('watch');
    runUntil(() => demandingAlert(app().alerts) !== undefined);
    const id = demandingAlert(app().alerts)!.id;
    runUntil(() => app().alerts.find((a) => a.id === id)!.crewAlertedTs !== null, 120);
    const record = app().alerts.find((a) => a.id === id)!;
    expect(record.crewAlertedTs! - record.alert.detectedTs).toBeGreaterThanOrEqual(CREW_ALERT_AFTER_MS);
    expect(record.state).toBe('active');
  });
});

describe('reconcileAlerts', () => {
  const alert = (level: WatchAlert['level'], detectedTs = 0): WatchAlert => ({
    ruleId: 'resting_tachycardia', level, title: 't', detectedTs, activity: 'rest', signal: 'heartRate', value: 120,
    because: [], firstStep: '', recheckInMin: 10, zones: [], risks: [], hazards: [], sources: [],
  });
  it('opens one record per rule, raises its level, and never duplicates it', () => {
    let log = reconcileAlerts([], [alert('caution')], 0);
    expect(log).toHaveLength(1);
    log = reconcileAlerts(log, [alert('emergency', 5000)], 5000);
    expect(log).toHaveLength(1);
    expect(log[0].alert.level).toBe('emergency');
    expect(log[0].id).toBe('resting_tachycardia@0');
    expect(log[0].alert.detectedTs).toBe(5000);
    expect(reconcileAlerts(log, [alert('emergency', 9000)], 9000)).toBe(log);
  });
  it('a caution that clears by itself closes; the rule then stays quiet for a while', () => {
    let log = reconcileAlerts([], [alert('caution')], 0);
    log = reconcileAlerts(log, [], 60_000);
    expect(log[0].state).toBe('resolved');
    expect(reconcileAlerts(log, [alert('caution', 120_000)], 120_000)).toHaveLength(1);
    expect(reconcileAlerts(log, [alert('caution', 3_600_000)], 3_600_000)).toHaveLength(2);
  });
});

describe('normalizeMission', () => {
  const cur = { name: 'Inti-1', crew: 'A. Quispe' };
  it('keeps the old names when a field is left blank', () => {
    expect(normalizeMission({ name: '  ', crew: '', missionDay: 10, arrivalDay: 20 }, cur)).toMatchObject(cur);
  });
  it('rounds days, starts at day 1 and never lands before today', () => {
    expect(normalizeMission({ ...cur, missionDay: 0, arrivalDay: 12.6 }, cur)).toMatchObject({ missionDay: 1, arrivalDay: 13 });
    expect(normalizeMission({ ...cur, missionDay: 50, arrivalDay: 40 }, cur)).toMatchObject({ missionDay: 40, arrivalDay: 40 });
    expect(normalizeMission({ ...cur, missionDay: 5, arrivalDay: 99999 }, cur).arrivalDay).toBe(MAX_MISSION_DAYS);
  });
});
