import { useEffect, useState } from 'react';
import { Link, Route, Router, Switch, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { useApp, type Scene } from './store';
import { clock, missionLabel, landingLabel, delayLabel, envLabel, daysToLanding, fill } from './format';
import { LANGS, syncLang, useCopy, useLang } from './i18n';
import { FutureSelfScreen } from '../features/future-self/FutureSelfScreen';
import { CheckInScreen } from '../features/check-in';
import { LoopScreen } from '../features/finding';
import { BriefScreen } from '../features/brief';
import { EnvironmentScreen } from '../features/environment';
import { WatchScreen } from '../features/watch/WatchScreen';
import { RespondScreen } from '../features/watch/RespondScreen';
import { AlarmOverlay, AlertBanner } from '../features/watch/Alarm';

const NAV = [
  { href: '/', key: 'home' },
  { href: '/check', key: 'check' },
  { href: '/watch', key: 'watch' },
  { href: '/loop', key: 'loop' },
  { href: '/brief', key: 'brief' },
  { href: '/environment', key: 'environment' },
] as const;

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
  const theme = useApp((s) => s.theme);
  const toggleTheme = useApp((s) => s.toggleTheme);
  const setLang = useApp((s) => s.setLang);
  const lang = useLang();
  const { ui } = useCopy();
  const online = useOnline();
  const env = envLabel(ctx.environment, lang);
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-6 py-3">
      <a href="/" className="text-xl font-bold tracking-wide text-brand-ink" aria-label={`${ui.app.name}: ${lang === 'es' ? 'sobre el proyecto' : 'about the project'}`}>{ui.app.name}</a>
      <MissionName />
      <Link
        href="/environment"
        aria-label={`${ui.nav.environment}: ${env}`}
        className="flex min-h-11 items-center gap-2 rounded-full bg-brand px-4 text-[16px] font-bold text-on-brand"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="5" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-25 12 12)" />
        </svg>
        {env}
      </Link>
      <MissionDays />
      <span className="rounded-full bg-surface-2 px-3 py-1 text-[15px]">{delayLabel(ctx.commDelayMin, lang)}</span>
      <DemoMenu />
      {!online && <span className="rounded-full bg-surface-2 px-3 py-1 text-[15px]">{ui.app.offline}</span>}
      <div role="radiogroup" aria-label={lang === 'es' ? 'Idioma' : 'Language'} className="flex gap-1">
        {LANGS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={lang === l.id}
            title={l.title}
            onClick={() => setLang(l.id)}
            className={`min-h-14 rounded-full px-3 text-[15px] font-bold ${lang === l.id ? 'bg-brand text-on-brand' : 'text-ink-2'}`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={toggleTheme}
        className="min-h-14 rounded-full border border-line px-4 text-[15px]"
        aria-label={theme === 'day' ? (lang === 'es' ? 'Cambiar a modo noche' : 'Switch to night mode') : (lang === 'es' ? 'Cambiar a modo día' : 'Switch to day mode')}
      >
        {theme === 'day' ? (lang === 'es' ? 'Noche' : 'Night') : (lang === 'es' ? 'Día' : 'Day')}
      </button>
    </header>
  );
}

/** "Inti-1 · A. Quispe": the mission and the crew member using this device. Opens the Mission screen. */
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
    <div className="relative ml-auto">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}
        className="min-h-14 rounded-full border border-future px-4 text-[15px] text-future">
        {ui.app.demo} · <span className="tabular">{clock(nowTs)}</span>
      </button>
      {open && (
        <ul role="menu" aria-label={flow.demo.menu} className="absolute right-0 top-full z-40 mt-2 flex w-[340px] flex-col gap-1 rounded-card border border-line bg-surface p-2 shadow-lg">
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

function NavBar() {
  const [loc] = useLocation();
  const { ui, flow } = useCopy();
  const lang = useLang();
  const navLabel = (key: (typeof NAV)[number]['key']) => (key === 'watch' ? flow.nav.watch : ui.nav[key]);
  return (
    <nav aria-label={lang === 'es' ? 'Principal' : 'Main'} className="flex gap-2 border-t border-line bg-surface px-4 py-2">
      {NAV.map((n) => {
        const active = n.href === '/' ? loc === '/' : loc.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-14 flex-1 items-center justify-center rounded-card px-3 text-center text-[17px] ${
              active ? 'bg-brand font-bold text-on-brand' : 'text-ink-2'
            }`}
          >
            {navLabel(n.key)}
          </Link>
        );
      })}
    </nav>
  );
}

function Disclaimer() {
  const seen = useApp((s) => s.disclaimerSeen);
  const dismiss = useApp((s) => s.dismissDisclaimer);
  const { ui } = useCopy();
  if (seen) return null;
  return (
    <div role="note" className="flex items-center gap-4 border-b border-line bg-surface-2 px-6 py-2 text-[15px]">
      <span>{ui.app.disclaimer}</span>
      <button type="button" onClick={dismiss} className="ml-auto min-h-14 rounded-full px-4 font-bold text-brand-ink">
        {ui.app.disclaimerOk}
      </button>
    </div>
  );
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
      <div key={lang} className="flex h-full flex-col">
        <TopBar />
        <Disclaimer />
        <AlertBanner />
        <main className="flex-1 overflow-auto">
          <Switch>
            <Route path="/" component={FutureSelfScreen} />
            <Route path="/check" component={CheckInScreen} />
            <Route path="/watch" component={WatchScreen} />
            <Route path="/respond" component={RespondScreen} />
            <Route path="/loop" component={LoopScreen} />
            <Route path="/brief" component={BriefScreen} />
            <Route path="/environment" component={EnvironmentScreen} />
            <Route>
              <p className="p-8">{lang === 'es' ? 'Pantalla no encontrada.' : 'Not found.'}</p>
            </Route>
          </Switch>
        </main>
        <NavBar />
        <AlarmOverlay />
      </div>
    </Router>
  );
}
