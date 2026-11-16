import { Fragment, useEffect, useState } from 'react';
import { Link, Route, Router, Switch, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { useApp, type Scene } from './store';
import { clock, missionLabel, landingLabel, delayLabel, envLabel, daysToLanding, fill } from './format';
import { syncLang, useCopy, useLang } from './i18n';
import { FutureSelfScreen } from '../features/future-self/FutureSelfScreen';
import { CheckInScreen } from '../features/check-in';
import { LoopScreen } from '../features/finding';
import { BriefScreen } from '../features/brief';
import { EnvironmentScreen } from '../features/environment';
import { WatchScreen } from '../features/watch/WatchScreen';
import { ConnectScreen } from '../features/connect/ConnectScreen';
import { RespondScreen } from '../features/watch/RespondScreen';
import { AlarmOverlay, AlertBanner } from '../features/watch/Alarm';
import { SuitScreen } from '../features/suit';
import { MissionGuide } from '../features/mission-guide/MissionGuide';
import { HowScreen } from '../features/how';
import { Glyph, WorkspaceNav } from './WorkspaceNav';
import { CrewScreen, CrewSwitcher } from '../features/crew';
import { SimulatorScreen } from '../features/simulator';
import { ArrivalScreen } from '../features/arrival';

function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

function TopBar() {
  const ctx = useApp((s) => s.context);
  const { ui } = useCopy();
  const online = useOnline();
  const lang = useLang();
  const env = envLabel(ctx.environment, lang);
  return (
    <header className="mission-header">
      <div className="mission-context">
        <MissionName />
        <CrewSwitcher />
        <span className="mission-divider" aria-hidden="true" />
        <Link href="/environment" aria-label={`${ui.nav.environment}: ${env}`} className="mission-environment">
          <Glyph name="environment" size={16} />{env}
        </Link>
        <MissionDays />
        <span className="mission-delay">{delayLabel(ctx.commDelayMin, lang)}</span>
      </div>
      <div className="mission-actions">
        {!online && <span className="mission-delay">{ui.app.offline}</span>}
        <DemoMenu />
        <DisplayPreferences />
      </div>
    </header>
  );
}

function DisplayPreferences() {
  const theme = useApp((s) => s.theme);
  const toggleTheme = useApp((s) => s.toggleTheme);
  const setLang = useApp((s) => s.setLang);
  const lang = useLang();
  const { ui: { preferences } } = useCopy();
  const night = theme === 'night';
  const nextLang = lang === 'en' ? 'es' : 'en';

  function switchLanguage() {
    const url = new URL(window.location.href);
    if (url.searchParams.has('lang')) {
      url.searchParams.set('lang', nextLang);
      window.history.replaceState(window.history.state, '', url);
    }
    setLang(nextLang);
  }

  return (
    <div className="workspace-preferences">
      <button
        type="button"
        role="switch"
        aria-checked={night}
        aria-label={preferences.nightMode}
        title={night ? preferences.switchToDay : preferences.switchToNight}
        onClick={toggleTheme}
        className="workspace-theme"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden
          className={`size-8 rounded-full p-1.5 ${night ? 'text-ink-2' : 'bg-brand-bg text-brand-ink'}`}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
        </svg>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden
          className={`size-8 rounded-full p-1.5 ${night ? 'bg-brand-bg text-brand-ink' : 'text-ink-2'}`}>
          <path d="M20.8 15.5A9 9 0 0 1 8.5 3.2a9 9 0 1 0 12.3 12.3Z" />
        </svg>
      </button>
      <button
        type="button"
        aria-label={preferences.switchLanguage}
        title={preferences.switchLanguage}
        onClick={switchLanguage}
        className="workspace-control"
      >
        <span lang={nextLang}>{nextLang.toUpperCase()}</span>
      </button>
    </div>
  );
}

/** "Inti-1 · E. Rostova": the mission and the crew member using this device. Opens the Mission screen. */
function MissionName() {
  const mission = useApp((s) => s.mission);
  const { ui } = useCopy();
  return (
    <Link href="/environment" aria-label={fill(ui.mission.headerLabel, { name: mission.name, crew: mission.crew })}
      className="flex min-h-11 flex-col justify-center rounded-card px-2 leading-tight hover:bg-surface-2">
      <span className="text-[16px] font-bold">{mission.name}</span>
      <span className="text-[14px] text-ink-2">{mission.crew}</span>
    </Link>
  );
}

/**
 * "Day 142 of 180 · 38 days to landing", with a short explanation one tap away.
 * Mission days count from launch; the last one is landing day, the day Future Self projects to.
 */
function MissionDays() {
  const ctx = useApp((s) => s.context);
  const lang = useLang();
  const { ui } = useCopy();
  const [open, setOpen] = useState(false);
  const m = ui.mission;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(!open)}
        title={m.explain}
        className="flex min-h-11 items-center gap-2 rounded-full px-2 text-left text-ink-2 hover:bg-surface-2"
      >
        <span>
          <span className="font-bold text-ink">{missionLabel(ctx, lang)}</span>
          <span> · {landingLabel(ctx, lang)}</span>
        </span>
        <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full border border-brand-ink text-[14px] font-bold text-brand-ink">i</span>
        <span className="sr-only">{m.explain}</span>
      </button>
      {open && (
        <div role="dialog" aria-label={m.title} className="absolute left-0 top-full z-40 mt-2 flex w-[380px] max-w-[90vw] flex-col gap-2 rounded-card border border-line bg-surface p-4 text-[16px] shadow-lg">
          <h2 className="text-[18px] font-bold">{m.title}</h2>
          <p>{fill(m.today, { day: ctx.missionDay })}</p>
          <p>{fill(m.landing, { total: ctx.arrivalDay, days: daysToLanding(ctx) })}</p>
          <p className="text-ink-2">{m.why}</p>
          <p className="text-ink-2">{m.sol}</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <Link href="/environment" onClick={() => setOpen(false)} className="flex min-h-12 items-center font-bold text-brand-ink underline">{m.edit}</Link>
            <button type="button" onClick={() => setOpen(false)} className="min-h-12 rounded-full px-4 font-bold text-brand-ink">{m.close}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Demo mode: jump to a beat of the seeded mission-day-142 story. No data entry needed. */
function DemoMenu() {
  const playScene = useApp((s) => s.playScene);
  const nowTs = useApp((s) => s.nowTs);
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const { ui, flow } = useCopy();
  const scenes: { scene: Scene; label: string; hint: string; go: string }[] = [
    { scene: 'morning', label: flow.demo.morning, hint: flow.demo.morningHint, go: '/' },
    { scene: 'headache', label: flow.demo.headache, hint: flow.demo.headacheHint, go: '/loop' },
    { scene: 'watch', label: flow.demo.watch, hint: flow.demo.watchHint, go: '/watch' },
  ];
  return (
    <div className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}
        className="workspace-scenarios">
        <span aria-hidden="true" className="scenario-dot" />{ui.app.demo}<span className="tabular text-xs">{clock(nowTs)}</span><span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <ul role="menu" aria-label={flow.demo.menu} className="workspace-scenario-menu absolute right-0 top-full z-40 mt-2 flex w-[340px] flex-col gap-1 rounded-card border border-line bg-surface p-2 shadow-lg">
          {scenes.map((s) => (
            <li key={s.scene} role="none">
              <button type="button" role="menuitem" className="flex min-h-14 w-full flex-col rounded-chip px-3 py-2 text-left hover:bg-surface-2"
                onClick={() => { playScene(s.scene); navigate(s.go); setOpen(false); }}>
                <span className="font-bold">{s.label}</span>
                <span className="text-[15px] text-ink-2">{s.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The ship clock runs in real time; each second the watch rules look at the latest samples. */
function useShipClock() {
  const tick = useApp((s) => s.tick);
  useEffect(() => {
    const id = setInterval(() => tick(1000), 1000);
    return () => clearInterval(id);
  }, [tick]);
}

function Disclaimer() {
  const seen = useApp((s) => s.disclaimerSeen);
  const dismiss = useApp((s) => s.dismissDisclaimer);
  const { ui } = useCopy();
  if (seen) return null;
  return (
    <div role="note" className="workspace-disclaimer">
      <span>{ui.app.disclaimer}</span>
      <button type="button" onClick={dismiss} className="workspace-control ml-auto px-3">
        {ui.app.disclaimerOk}
      </button>
    </div>
  );
}

function ScrollOnNavigation() {
  const [loc] = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc]);
  return null;
}

export function App() {
  const theme = useApp((s) => s.theme);
  const lang = syncLang(useLang());
  useShipClock();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <Router hook={useHashLocation}>
      <ScrollOnNavigation />
      <div className="workspace-shell">
        <WorkspaceNav />
        <div className="workspace-body">
          <TopBar />
          <Fragment key={lang}>
            <Disclaimer />
            <AlertBanner />
            <main className="workspace-main">
              <Switch>
                <Route path="/" component={FutureSelfScreen} />
                <Route path="/check" component={CheckInScreen} />
                <Route path="/connect" component={ConnectScreen} />
                <Route path="/watch" component={WatchScreen} />
                <Route path="/respond" component={RespondScreen} />
                <Route path="/loop" component={LoopScreen} />
                <Route path="/brief" component={BriefScreen} />
                <Route path="/environment" component={EnvironmentScreen} />
                <Route path="/suit" component={SuitScreen} />
                <Route path="/how" component={HowScreen} />
                <Route path="/mission-guide" component={MissionGuide} />
                <Route path="/crew" component={CrewScreen} />
                <Route path="/simulator" component={SimulatorScreen} />
                <Route path="/arrival" component={ArrivalScreen} />
                <Route>
                  <p className="p-8">{lang === 'es' ? 'Pantalla no encontrada.' : 'Not found.'}</p>
                </Route>
              </Switch>
            </main>
            <AlarmOverlay />
          </Fragment>
        </div>
      </div>
    </Router>
  );
}
