import { useEffect, useRef, useState, type ReactNode } from 'react';
import english from '../../content/landing.json';
import spanish from '../../content/landing.es.json';

/**
 * Public landing page (P1). A single scrolling page: hero, video, challenge,
 * advantages, technology, call to action. The app itself lives at /app/.
 * Copy lives in content/landing.json.
 */

type Copy = typeof english;
type Language = 'en' | 'es';
type Theme = 'day' | 'night';

const COPY: Record<Language, Copy> = { en: english, es: spanish };
const L = english.links;
const PREFERENCES_KEY = 'kawsay:landing-preferences';

function readPreferences(): { language: Language; theme: Theme } {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? '{}');
    return {
      language: saved?.language === 'es' ? 'es' : 'en',
      theme: saved?.theme === 'day' ? 'day' : 'night',
    };
  } catch {
    return { language: 'en', theme: 'night' };
  }
}

function demoLink(path: string, language: Language): string {
  const url = new URL(path, window.location.origin);
  url.searchParams.set('lang', language);
  return url.pathname + url.search + url.hash;
}

// ── Icons: 24×24 strokes, drawn here so the page needs no icon library ─────────
const PATHS: Record<string, ReactNode> = {
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
  moon: <path d="M20.8 15.5A9 9 0 0 1 8.5 3.2a9 9 0 1 0 12.3 12.3Z" />,
  slope: <><path d="M3 6l7 7 4-4 7 7" /><path d="M21 11v5h-5" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  signal: <><path d="M5 12.5a10 10 0 0 1 14 0" /><path d="M8.5 16a5 5 0 0 1 7 0" /><circle cx="12" cy="19.5" r="1" /><path d="M3 3l18 18" /></>,
  landing: <><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M4 21h16" /></>,
  mirror: <><circle cx="8" cy="7" r="2.5" /><path d="M4 21v-5a4 4 0 0 1 8 0v5" /><circle cx="17" cy="7" r="2.5" strokeDasharray="2 2" /><path d="M13.5 21v-5a3.5 3.5 0 0 1 7 0v5" strokeDasharray="2 2" /></>,
  rules: <><path d="M4 6h10" /><path d="M4 12h7" /><path d="M4 18h10" /><path d="M16 10l2.5 2.5L22 9" /></>,
  loop: <><path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 4v5h-5" /></>,
  watch: <><rect x="6" y="6" width="12" height="12" rx="3" /><path d="M9 6l1-3h4l1 3" /><path d="M9 18l1 3h4l1-3" /><path d="M9 12h1.5l1-2 1.5 4 1-2H15" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  offline: <><path d="M2 8.8a15 15 0 0 1 4.2-2.7" /><path d="M10.7 5.1A15 15 0 0 1 22 8.8" /><path d="M5 12.6a10 10 0 0 1 5.2-2.6" /><path d="M8.5 16.4a5 5 0 0 1 7 0" /><path d="M3 3l18 18" /></>,
  book: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 21V5" /><path d="M9 8h6" /></>,
  nasa: <><circle cx="12" cy="12" r="4" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-25 12 12)" /></>,
  standard: <><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></>,
  code: <><path d="M8 7l-5 5 5 5" /><path d="M16 7l5 5-5 5" /><path d="M13.5 4l-3 16" /></>,
  desktop: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8" /><path d="M12 16v4" /></>,
  delay: <><path d="M5 19a7 7 0 0 1 0-14" /><path d="M19 5a7 7 0 0 1 0 14" /><path d="M9 12h6" /><path d="M13 10l2 2-2 2" /></>,
  cloud: <><path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z" /><path d="M12 12v5" /><path d="M10 15l2 2 2-2" /></>,
  warning: <><path d="M12 3l10 18H2z" /><path d="M12 10v5" /><circle cx="12" cy="18" r=".6" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9.5" /></>,
  arrow: <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>,
  play: <><circle cx="12" cy="12" r="9" /><path d="M10 8.5v7l6-3.5z" /></>,
  download: <><path d="M12 4v11" /><path d="M7 10l5 5 5-5" /><path d="M4 20h16" /></>,
  github: <path d="M9 19c-4 1.3-4-2-6-2.5m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6 0C6.8 3.3 5.8 3.6 5.8 3.6a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4.4 10c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2v3.5" />,
};

function Icon({ name, className = 'h-6 w-6' }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {PATHS[name]}
    </svg>
  );
}

/** Adds .is-visible once an element scrolls into view. */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      }),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function SectionTitle({ title, accent, subtitle }: { title: string; accent: string; subtitle: string }) {
  return (
    <div className="reveal mx-auto mb-14 max-w-3xl text-center">
      <h2 className="text-4xl font-bold tracking-tight text-balance md:text-5xl">
        {title} <span className="text-l-accent">{accent}</span>
      </h2>
      <p className="mt-4 text-lg text-l-muted md:text-xl">{subtitle}</p>
    </div>
  );
}

const BTN = 'inline-flex items-center justify-center gap-2 rounded-[10px] px-8 py-5 text-lg font-medium transition-colors';
const BTN_FILLED = `${BTN} btn-glow bg-l-nasa text-white hover:bg-l-nasa-hover`;
const BTN_OUTLINE = `${BTN} border border-l-accent bg-l-bg text-l-accent hover:bg-l-bg-2`;

function Nav({ copy, language, theme, onLanguageChange, onThemeChange }: {
  copy: Copy;
  language: Language;
  theme: Theme;
  onLanguageChange: () => void;
  onThemeChange: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  const links = [
    { href: '#challenge', label: copy.nav.challenge },
    { href: '#advantages', label: copy.nav.advantages },
    { href: '#technology', label: copy.nav.technology },
  ];
  return (
    <header className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md transition-colors ${scrolled ? 'border-l-line bg-l-bg/80' : 'border-transparent bg-transparent'}`}>
      <nav aria-label={copy.nav.label} className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:px-4 lg:gap-6 lg:px-8">
        <a href="#top" className="text-lg font-bold tracking-tight text-l-accent sm:text-2xl">{copy.hero.title}</a>
        <ul className="ml-auto hidden items-center gap-4 text-sm md:flex lg:gap-6">
          {links.map((l) => (
            <li key={l.href}><a href={l.href} className="text-l-muted transition-colors hover:text-l-ink">{l.label}</a></li>
          ))}
        </ul>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'night'}
            aria-label={copy.nav.nightMode}
            title={theme === 'night' ? copy.nav.switchToDay : copy.nav.switchToNight}
            className="landing-theme-switch"
            onClick={onThemeChange}
          >
            <Icon name="sun" className="h-4 w-4" />
            <Icon name="moon" className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={copy.nav.switchLanguage}
            title={copy.nav.switchLanguage}
            className="landing-language-button"
            onClick={onLanguageChange}
          >
            <span lang={language === 'en' ? 'es' : 'en'}>{language === 'en' ? 'ES' : 'EN'}</span>
          </button>
          <a href={demoLink(L.app, language)} className="rounded-[10px] bg-l-nasa px-3 py-2 text-sm font-medium whitespace-nowrap text-white hover:bg-l-nasa-hover sm:px-4">
            {copy.nav.demo}
          </a>
        </div>
      </nav>
    </header>
  );
}

function Hero({ copy, language }: { copy: Copy; language: Language }) {
  return (
    <section id="top" className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-4">
      <div className="stars" aria-hidden />
      <div className="planet" aria-hidden />
      <div className="hero-fade absolute inset-0" aria-hidden />
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-l-accent/40 bg-l-accent-soft px-4 py-1.5 text-xs font-semibold tracking-[0.14em] text-l-accent uppercase">
          <Icon name="nasa" className="h-4 w-4" />
          {copy.hero.badge}
        </p>
        <h1 className="mt-6 text-6xl font-bold tracking-tight text-l-accent sm:text-7xl md:text-8xl">{copy.hero.title}</h1>
        <p className="mt-6 max-w-2xl text-lg text-pretty text-l-ink/85 md:text-2xl">{copy.hero.subtitle}</p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <a href={demoLink(L.app, language)} className={BTN_FILLED}>
            {copy.hero.primary}
            <Icon name="arrow" className="h-5 w-5" />
          </a>
          <a href="#video" className={BTN_OUTLINE}>
            <Icon name="play" className="h-5 w-5" />
            {copy.hero.secondary}
          </a>
        </div>
        <a href="#video" aria-label={copy.hero.scroll} className="mt-14 flex h-10 w-6 justify-center rounded-full border-2 border-l-accent/60 pt-2">
          <span className="scroll-dot h-2 w-1 rounded-full bg-l-accent" />
        </a>
      </div>
    </section>
  );
}

function Video({ copy, language }: { copy: Copy; language: Language }) {
  return (
    <section id="video" className="bg-l-bg px-4 py-20 md:py-24">
      <div className="mx-auto max-w-5xl">
        <SectionTitle title={copy.video.title} accent={copy.video.titleAccent} subtitle={copy.video.subtitle} />
        <div className="reveal relative flex aspect-video flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-l-line bg-l-bg-2 text-center">
          <div className="grid-glow absolute inset-0" aria-hidden />
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-l-accent-soft text-l-accent">
            <Icon name="play" className="h-10 w-10" />
          </span>
          <p className="relative text-2xl font-semibold">{copy.video.soon}</p>
          <p className="relative max-w-md px-4 text-l-muted">{copy.video.soonHint}</p>
          <a href={demoLink(L.app, language)} className="relative mt-2 inline-flex items-center gap-2 font-medium text-l-accent hover:underline">
            {copy.hero.primary}
            <Icon name="arrow" className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, text, tone }: { icon: string; title: string; text: string; tone: 'danger' | 'accent' }) {
  const chip = tone === 'danger' ? 'bg-l-danger-soft text-l-danger' : 'bg-l-accent-soft text-l-accent';
  return (
    <li className="reveal flex gap-4 rounded-xl border border-l-line bg-l-card p-6">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${chip}`}><Icon name={icon} className="h-5 w-5" /></span>
      <div>
        <h4 className="text-lg font-semibold">{title}</h4>
        <p className="mt-1 text-l-muted">{text}</p>
      </div>
    </li>
  );
}

function Challenge({ copy }: { copy: Copy }) {
  const c = copy.challenge;
  return (
    <section id="challenge" className="bg-gradient-to-b from-l-bg to-l-bg-2 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionTitle title={c.title} accent={c.titleAccent} subtitle={c.subtitle} />
        <div className="grid gap-12 md:grid-cols-2 md:gap-8">
          <div>
            <h3 className="reveal mb-6 flex items-center gap-3 text-2xl font-bold">
              <Icon name="warning" className="h-7 w-7 text-l-danger" />
              {c.problemsTitle}
            </h3>
            <ul className="flex flex-col gap-4">
              {c.problems.map((p) => <FeatureCard key={p.icon} {...p} tone="danger" />)}
            </ul>
          </div>
          <div>
            <h3 className="reveal mb-6 flex items-center gap-3 text-2xl font-bold">
              <Icon name="check" className="h-7 w-7 text-l-accent" />
              {c.solutionsTitle}
            </h3>
            <ul className="flex flex-col gap-4">
              {c.solutions.map((s) => <FeatureCard key={s.icon} {...s} tone="accent" />)}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Counts up to the target once it is on screen. */
function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || value === 0) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) { setShown(value); return; }
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - start) / 1200);
        setShown(Math.round(value * (1 - (1 - p) ** 3)));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value]);
  return <span ref={ref}>{shown}</span>;
}

function Advantages({ copy }: { copy: Copy }) {
  const a = copy.advantages;
  return (
    <section id="advantages" className="relative overflow-hidden bg-gradient-to-b from-l-bg-2 via-l-bg to-l-bg-2 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionTitle title={a.title} accent={a.titleAccent} subtitle={a.subtitle} />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {a.stats.map((s) => (
            <li key={s.icon} className="reveal flex flex-col items-center rounded-xl border border-l-line bg-l-card px-6 py-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-l-accent-soft text-l-accent"><Icon name={s.icon} /></span>
              <p className="mt-5 text-5xl font-bold text-l-accent tabular-nums">
                {s.prefix}<CountUp value={s.value} /><span className="text-2xl">{s.suffix}</span>
              </p>
              <p className="mt-3 text-lg font-semibold">{s.label}</p>
              <p className="mt-1 text-sm text-l-muted">{s.hint}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Technology({ copy }: { copy: Copy }) {
  const t = copy.technology;
  return (
    <section id="technology" className="bg-l-bg px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionTitle title={t.title} accent={t.titleAccent} subtitle={t.subtitle} />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {t.items.map((item) => (
            <li key={item.icon} className="reveal group rounded-xl border border-l-line bg-l-card p-6 transition-colors hover:border-l-accent/50">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-l-accent-soft text-l-accent"><Icon name={item.icon} className="h-5 w-5" /></span>
              <h3 className="mt-5 text-xl font-semibold">{item.title}</h3>
              <p className="mt-2 text-l-muted">{item.text}</p>
            </li>
          ))}
        </ul>
        <ul className="reveal mt-12 flex flex-wrap justify-center gap-3" aria-label={t.stackLabel}>
          {t.stack.map((s) => (
            <li key={s} className="rounded-full border border-l-line px-4 py-1.5 text-sm text-l-muted">{s}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CallToAction({ copy, language }: { copy: Copy; language: Language }) {
  const c = copy.cta;
  return (
    <section id="demo" className="bg-gradient-to-b from-l-bg to-l-bg-2 px-4 py-24">
      <div className="reveal relative mx-auto max-w-4xl overflow-hidden rounded-2xl border border-l-line bg-l-card px-6 py-14 text-center md:px-12">
        <div className="grid-glow absolute inset-0" aria-hidden />
        <h2 className="relative text-3xl font-bold md:text-4xl">{c.title}</h2>
        <p className="relative mx-auto mt-4 max-w-2xl text-lg text-l-muted">{c.text}</p>
        <div className="relative mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <a href={demoLink(L.app, language)} className={BTN_FILLED}>
            {c.web}
            <Icon name="arrow" className="h-5 w-5" />
          </a>
          <a href={L.download} className={BTN_OUTLINE} target="_blank" rel="noreferrer">
            <Icon name="download" className="h-5 w-5" />
            {c.download}
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer({ copy, language }: { copy: Copy; language: Language }) {
  const f = copy.footer;
  const col = (title: string, items: { label: string; href: string }[]) => (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-4 flex flex-col gap-2 text-sm text-l-muted">
        {items.map((i) => (
          <li key={i.href}>
            <a href={i.href.startsWith('/app/') ? demoLink(i.href, language) : i.href} className="hover:text-l-ink" {...(i.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>{i.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <footer className="border-t border-l-line bg-l-bg-2 px-4 pt-16 pb-10">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-2xl font-bold text-l-accent">{copy.hero.title}</p>
          <p className="mt-3 text-sm text-l-muted">{f.tagline}</p>
        </div>
        {col(f.appTitle, f.app)}
        {col(f.resourcesTitle, f.resources)}
        <div>
          <h3 className="font-semibold">{f.connectTitle}</h3>
          <a href={L.repo} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm text-l-muted hover:text-l-ink">
            <Icon name="github" className="h-5 w-5" />
            {f.repoLabel}
          </a>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-2 border-t border-l-line pt-6 text-sm text-l-muted md:flex-row md:justify-between">
        <p>{f.copyright}</p>
        <p>{f.disclaimer}</p>
      </div>
    </footer>
  );
}

export function Landing() {
  const [preferences, setPreferences] = useState(readPreferences);
  const { language, theme } = preferences;
  const copy = COPY[language];

  useReveal();
  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dataset.landingTheme = theme;
    document.title = copy.pageTitle;
    document.querySelector('meta[name="description"]')?.setAttribute('content', copy.pageDescription);
    const background = getComputedStyle(root).getPropertyValue('--l-bg').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);

    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
      // Keep the controls usable when browser storage is unavailable.
    }
  }, [copy, language, preferences, theme]);

  return (
    <>
      <Nav
        copy={copy}
        language={language}
        theme={theme}
        onLanguageChange={() => setPreferences((current) => ({
          ...current,
          language: current.language === 'en' ? 'es' : 'en',
        }))}
        onThemeChange={() => setPreferences((current) => ({
          ...current,
          theme: current.theme === 'night' ? 'day' : 'night',
        }))}
      />
      <main>
        <Hero copy={copy} language={language} />
        <Video copy={copy} language={language} />
        <Challenge copy={copy} />
        <Advantages copy={copy} />
        <Technology copy={copy} />
        <CallToAction copy={copy} language={language} />
      </main>
      <Footer copy={copy} language={language} />
    </>
  );
}
