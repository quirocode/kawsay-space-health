import { useEffect, useState } from 'react';
import { Link, Route, Router, Switch, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { PALETTES, useApp, type Scene } from './store';
import { clock, missionLabel, delayLabel } from './format';
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
  const palette = useApp((s) => s.palette);
  const setPalette = useApp((s) => s.setPalette);
  const setLang = useApp((s) => s.setLang);
  const lang = useLang();
  const { ui } = useCopy();
  const online = useOnline();
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-6 py-3">
      <span className="text-xl font-bold tracking-wide text-brand">{ui.app.name}</span>
      <span className="text-ink-2">{missionLabel(ctx, lang)}</span>
      <span className="rounded-full bg-surface-2 px-3 py-1 text-[15px]">{delayLabel(ctx.commDelayMin, lang)}</span>
      <DemoMenu />
      {!online && <span className="rounded-full bg-surface-2 px-3 py-1 text-[15px]">{ui.app.offline}</span>}
      {theme === 'night' && (
        <div role="radiogroup" aria-label={lang === 'es' ? 'Paleta nocturna' : 'Night palette'} className="flex gap-1">
          {PALETTES.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={palette === p}
              onClick={() => setPalette(p)}
              className={`min-h-14 rounded-full px-3 text-[15px] capitalize ${palette === p ? 'bg-brand font-bold text-on-brand' : 'text-ink-2'}`}
            >
              {p === 'jwst' ? 'JWST' : p}
            </button>
          ))}
        </div>
      )}
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

/** Demo mode: jump to a beat of the seeded Sol 142 story. No data entry needed. */
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
      <button type="button" onClick={dismiss} className="ml-auto min-h-14 rounded-full px-4 font-bold text-brand">
        {ui.app.disclaimerOk}
      </button>
    </div>
  );
}

export function App() {
  const theme = useApp((s) => s.theme);
  const palette = useApp((s) => s.palette);
  const lang = syncLang(useLang());
  useShipClock();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.palette = palette;
  }, [theme, palette]);
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
