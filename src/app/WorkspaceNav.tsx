import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useCopy, useLang } from './i18n';
import suit from '../../content/suit.json';
import how from '../../content/how.json';

const paths: Record<string, ReactNode> = {
  logo: <><circle cx="12" cy="12" r="4"/><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-35 12 12)"/><path d="M19 3h.01"/></>,
  home: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  check: <><rect x="5" y="5" width="14" height="16" rx="2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 14 2 2 4-4"/></>,
  watch: <path d="M2 12h4l3-7 4 14 3-7h6"/>,
  suit: <><path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10Z"/><path d="M9 12h6m-3-3v6"/></>,
  loop: <><path d="M12 8v4m0 4h.01"/><path d="M10.3 4.2 2.6 18a1.5 1.5 0 0 0 1.3 2h16.2a1.5 1.5 0 0 0 1.3-2L13.7 4.2a2 2 0 0 0-3.4 0Z"/></>,
  brief: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8m-8 4h8m-8 4h5"/></>,
  connect: <><path d="M12 2v20l6-5-12-10m6-5 6 5-12 10"/></>,
  environment: <><circle cx="12" cy="12" r="4"/><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-35 12 12)"/></>,
  how: <><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3c-1 .5-1 1-1 2m0 3h.01"/></>,
  project: <path d="M13 5h6v6m0-6-8 8M19 14v5H5V5h5"/>,
  missionGuide: <><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4Z"/></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
};
export function Glyph({ name, size = 19 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function WorkspaceNav() {
  const [loc] = useLocation();
  const lang = useLang();
  const es = lang === 'es';
  const { ui, flow } = useCopy();
  const [open, setOpen] = useState(false);
  const groups = [
    { label: es ? 'Salud' : 'Health', links: [
      ['/', es ? 'Yo futuro' : 'Future Self', 'home'], ['/mission-guide', es ? 'Misión guiada' : 'Guided mission', 'missionGuide'], ['/check', ui.nav.check, 'check'],
      ['/watch', es ? 'Reloj y alertas' : 'Watch & alerts', 'watch'], ['/loop', ui.nav.loop, 'loop'],
    ] },
    { label: es ? 'Operaciones' : 'Operations', links: [
      ['/suit', suit[lang].nav, 'suit'], ['/brief', es ? 'Informe a Tierra' : 'Earth brief', 'brief'],
      ['/connect', flow.nav.connect, 'connect'], ['/environment', ui.nav.environment, 'environment'],
    ] },
  ];
  return <aside className="workspace-sidebar" data-open={open}>
    <div className="workspace-logo-row">
      <Link className="workspace-logo" href="/" onClick={() => setOpen(false)}>
        <span className="workspace-mark"><Glyph name="logo" size={23} /></span>
        <span>KAWSAY<small>{es ? 'Salud en misión' : 'Mission health'}</small></span>
      </Link>
      <button type="button" className="workspace-menu" aria-expanded={open} aria-controls="workspace-navigation" onClick={() => setOpen(!open)}>
        <Glyph name="menu" />{es ? 'Menú' : 'Menu'}
      </button>
    </div>
    <nav id="workspace-navigation" aria-label={es ? 'Principal' : 'Main'} className="workspace-nav">
      {groups.map((group) => <div key={group.label} className="workspace-nav-group">
        <p>{group.label}</p>
        {group.links.map(([href, label, icon]) => <Link key={href} href={href} onClick={() => setOpen(false)}
          aria-current={loc === href || (href === '/watch' && loc === '/respond') ? 'page' : undefined}>
          <Glyph name={icon}/><span>{label}</span>
        </Link>)}
      </div>)}
      <div className="workspace-help">
        <Link href="/how" aria-current={loc === '/how' ? 'page' : undefined} onClick={() => setOpen(false)}>
          <Glyph name="how"/><span>{how[lang].button}</span>
        </Link>
        {window.location.protocol !== 'kawsay:' &&
          <a href="/"><Glyph name="project"/><span>{es ? 'Portada del proyecto' : 'Project home'}</span></a>}
      </div>
    </nav>
  </aside>;
}
