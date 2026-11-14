import { useEffect, useState } from 'react';
import { Link, Route, Router, Switch, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import ui from '../../content/ui.json';
import { PALETTES, useApp } from './store';
import { missionLabel, delayLabel } from './format';
import { FutureSelfScreen } from '../features/future-self/FutureSelfScreen';
import { CheckInScreen } from '../features/check-in';
import { LoopScreen } from '../features/finding';
import { BriefScreen } from '../features/brief';
import { EnvironmentScreen } from '../features/environment';

const NAV = [
  { href: '/', label: ui.nav.home },
  { href: '/check', label: ui.nav.check },
  { href: '/loop', label: ui.nav.loop },
  { href: '/brief', label: ui.nav.brief },
  { href: '/environment', label: ui.nav.environment },
];

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
  const online = useOnline();
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-6 py-3">
      <span className="text-xl font-bold tracking-wide text-brand">{ui.app.name}</span>
      <span className="text-ink-2">{missionLabel(ctx)}</span>
      <span className="rounded-full bg-surface-2 px-3 py-1 text-[15px]">{delayLabel(ctx.commDelayMin)}</span>
      <span className="ml-auto rounded-full border border-future px-3 py-1 text-[15px] text-future">{ui.app.demo}</span>
      {!online && <span className="rounded-full bg-surface-2 px-3 py-1 text-[15px]">{ui.app.offline}</span>}
      {theme === 'night' && (
        <div role="radiogroup" aria-label="Night palette" className="flex gap-1">
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
      <button
        type="button"
        onClick={toggleTheme}
        className="min-h-14 rounded-full border border-line px-4 text-[15px]"
        aria-label={theme === 'day' ? 'Switch to night mode' : 'Switch to day mode'}
      >
        {theme === 'day' ? 'Night' : 'Day'}
      </button>
    </header>
  );
}

function NavBar() {
  const [loc] = useLocation();
  return (
    <nav aria-label="Main" className="flex gap-2 border-t border-line bg-surface px-4 py-2">
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
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Disclaimer() {
  const seen = useApp((s) => s.disclaimerSeen);
  const dismiss = useApp((s) => s.dismissDisclaimer);
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
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.palette = palette;
  }, [theme, palette]);

  return (
    <Router hook={useHashLocation}>
      <div className="flex h-full flex-col">
        <TopBar />
        <Disclaimer />
        <main className="flex-1 overflow-auto">
          <Switch>
            <Route path="/" component={FutureSelfScreen} />
            <Route path="/check" component={CheckInScreen} />
            <Route path="/loop" component={LoopScreen} />
            <Route path="/brief" component={BriefScreen} />
            <Route path="/environment" component={EnvironmentScreen} />
            <Route>
              <p className="p-8">Not found.</p>
            </Route>
          </Switch>
        </main>
        <NavBar />
      </div>
    </Router>
  );
}
