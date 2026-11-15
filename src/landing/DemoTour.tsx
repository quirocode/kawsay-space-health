import { useRef, useState, type KeyboardEvent } from 'react';
import type english from '../../content/landing.json';

const STOPS = [
  { id: 'future', path: '/app/#/' },
  { id: 'check', path: '/app/#/check' },
  { id: 'watch', path: '/app/#/watch' },
  { id: 'suit', path: '/app/#/suit' },
] as const;

type TourCopy = typeof english.tour;

export function DemoTour({ copy, language, linkTo }: {
  copy: TourCopy;
  language: 'en' | 'es';
  linkTo: (path: string) => string;
}) {
  const [active, setActive] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const stop = STOPS[active];
  const details = copy.steps[stop.id];
  const screenshot = `/demo-tour/${stop.id}-${language}.webp`;

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = STOPS.length - 1;
    let next: number;
    switch (event.key) {
      case 'ArrowRight': next = index === last ? 0 : index + 1; break;
      case 'ArrowLeft': next = index === 0 ? last : index - 1; break;
      case 'Home': next = 0; break;
      case 'End': next = last; break;
      default: return;
    }
    event.preventDefault();
    setActive(next);
    document.getElementById(`tour-tab-${STOPS[next].id}`)?.focus();
  }

  return (
    <section id="demo-tour" aria-labelledby="tour-title" className="border-y border-l-line bg-l-bg-2 px-4 py-20 md:px-8 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 max-w-2xl">
          <h2 id="tour-title" className="text-4xl font-bold tracking-tight text-balance md:text-5xl">{copy.title}</h2>
          <p className="mt-4 text-lg text-l-muted">{copy.intro}</p>
        </div>
        <div role="tablist" aria-labelledby="tour-title" className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4">
          {STOPS.map(({ id }, index) => (
            <button
              key={id}
              type="button"
              id={`tour-tab-${id}`}
              role="tab"
              aria-selected={active === index}
              aria-controls={`tour-panel-${id}`}
              tabIndex={active === index ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={(event) => handleTabKey(event, index)}
              className="demo-tour-tab flex min-h-14 cursor-pointer items-center gap-2 rounded-xl border border-l-line bg-l-card px-3 py-2 text-left text-sm font-semibold transition-colors hover:border-l-accent sm:gap-3 sm:px-4"
            >
              <span aria-hidden className="demo-tour-step grid size-7 shrink-0 place-items-center rounded-full text-xs tabular-nums">{index + 1}</span>
              {copy.steps[id].tab}
            </button>
          ))}
        </div>
        {STOPS.map(({ id }, index) => (
          <div
            key={id}
            id={`tour-panel-${id}`}
            role="tabpanel"
            aria-labelledby={`tour-tab-${id}`}
            hidden={active !== index}
            tabIndex={0}
            className="rounded-2xl border border-l-line bg-l-card"
          >
            {active === index && (
              <div className="grid items-center gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-8 lg:p-8">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">{details.title}</h3>
                  <p className="mt-3 text-l-muted">{details.description}</p>
                  <div className="mt-5 rounded-lg border-s-2 border-l-accent bg-l-accent-soft px-4 py-3">
                    <p className="text-sm font-semibold text-l-accent">{copy.tryThis}</p>
                    <p className="mt-1 text-sm leading-relaxed">{details.action}</p>
                  </div>
                  <a href={linkTo(stop.path)} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-l-nasa px-4 text-sm font-semibold text-white hover:bg-l-nasa-hover">
                    {copy.openScreen}
                    <span aria-hidden>→</span>
                  </a>
                </div>
                <figure className="overflow-hidden rounded-xl border border-l-line bg-l-bg">
                  <button
                    type="button"
                    className="block w-full cursor-zoom-in text-start hover:bg-l-accent-soft focus-visible:-outline-offset-4"
                    aria-haspopup="dialog"
                    onClick={() => dialog.current?.showModal()}
                  >
                    <img src={screenshot} alt={details.imageAlt} width={1440} height={stop.id === 'future' ? 1100 : 920} decoding="async" className="block h-auto w-full" />
                    <span className="flex min-h-11 items-center justify-between gap-2 border-t border-l-line px-3 text-sm font-semibold text-l-accent">
                      {copy.enlarge}
                      <span aria-hidden>↗︎</span>
                    </span>
                  </button>
                </figure>
              </div>
            )}
          </div>
        ))}
      </div>
      <dialog ref={dialog} aria-label={details.title} className="demo-tour-dialog rounded-xl border border-l-line bg-l-bg text-l-ink">
        <div className="flex items-center justify-between gap-4 px-3 py-2 sm:px-4">
          <h3 className="font-semibold">{details.tab}</h3>
          <form method="dialog">
            <button className="min-h-11 cursor-pointer rounded-lg border border-l-line px-3 text-sm font-semibold hover:bg-l-accent-soft">{copy.close}</button>
          </form>
        </div>
        <img src={screenshot} alt="" width={1440} height={stop.id === 'future' ? 1100 : 920} className="mx-auto block h-auto w-auto object-contain" />
      </dialog>
    </section>
  );
}
