import { lazy, Suspense, useEffect, useState } from 'react';
import { create } from 'zustand';
import type { BodyZone, Status } from '../../domain/types';
import { BODY_ZONES } from '../../domain/types';
import { te, ui, useLang } from '../../app/i18n';
import { useApp } from '../../app/store';
import { CREW } from '../../data/crew';
import copy from '../../../content/anatomy.json';
import { MUSCLE_GROUPS, ORGAN_GROUPS, regionZone, type AnatomyMode, type AnatomyRegion, type AnatomySex } from './anatomyRegions';
const AnatomyCanvas = lazy(() => import('./AnatomyCanvas'));
export type ZoneFill = Status | 'none';
export const ZONE_LABEL: Record<BodyZone, string> = {
  eyes: 'Eyes',
  brain: 'Brain',
  inner_ear: 'Balance',
  heart: 'Heart',
  lungs: 'Lungs',
  bones: 'Bones and spine',
  muscles: 'Muscles',
  kidneys: 'Kidneys',
  skin_immune: 'Skin and immunity',
  gut: 'Digestion',
};


export const useAnatomy = create<{
  mode: AnatomyMode;
  sex: AnatomySex;
  setMode: (mode: AnatomyMode) => void;
  setSex: (sex: AnatomySex) => void;
}>((set) => ({
  mode: 'muscles',
  sex: CREW[useApp.getState().crewId]?.sex ?? 'female',
  setMode: (mode) => set({ mode }),
  setSex: (sex) => set({ sex }),
}));

useApp.subscribe((state, prev) => {
  if (state.crewId !== prev.crewId) {
    const nextSex = CREW[state.crewId]?.sex;
    if (nextSex) useAnatomy.setState({ sex: nextSex });
  }
});

export function AnatomyModeSwitch() {
  const t = copy[useLang()];
  const { mode, sex, setMode, setSex } = useAnatomy();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="workspace-segmented" role="group" aria-label={t.bodySex}>
        <button type="button" aria-pressed={sex === 'female'} onClick={() => setSex('female')}>{t.female}</button>
        <button type="button" aria-pressed={sex === 'male'} onClick={() => setSex('male')}>{t.male}</button>
      </div>
      <div className="workspace-segmented" role="group" aria-label={t.select}>
        <button type="button" aria-pressed={mode === 'muscles'} onClick={() => setMode('muscles')}>{t.muscles}</button>
        <button type="button" aria-pressed={mode === 'organs'} onClick={() => setMode('organs')}>{t.organs}</button>
      </div>
    </div>
  );
}

export function BodyFigure({ zones, variant, title, selected, onSelect, sharedControls = false, onShowDetails }: {
  zones: Partial<Record<BodyZone, ZoneFill>>;
  variant: 'today' | 'future';
  title: string;
  selected?: BodyZone | null;
  onSelect?: (zone: BodyZone) => void;
  sharedControls?: boolean;
  onShowDetails?: () => void;
}) {
  const lang = useLang();
  const t = copy[lang];
  const crewId = useApp((s) => s.crewId);
  const { mode, sex, setMode, setSex } = useAnatomy();
  const [region, setRegion] = useState<AnatomyRegion | null>(null);
  const [hover, setHover] = useState<AnatomyRegion | null>(null);
  const [isolate, setIsolate] = useState(false);
  const [reset, setReset] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const crewSex = CREW[crewId]?.sex;
    if (crewSex) setSex(crewSex);
  }, [crewId, setSex]);

  const regions: readonly AnatomyRegion[] = mode === 'muscles' ? MUSCLE_GROUPS : ORGAN_GROUPS;
  const active = region && regions.includes(region) && regionZone(mode, region) === selected ? region : null;
  const preview = hover && regions.includes(hover) ? hover : null;
  const pick = (next: AnatomyRegion) => {
    setRegion(next);
    onSelect?.(regionZone(mode, next));
  };
  const word = (zone: BodyZone) => {
    const status = zones[zone] ?? 'none';
    return status === 'none' ? t.noData : ui.status[status];
  };
  return (
    <div className="flex h-full w-full flex-col gap-2" data-anatomy={variant} data-anatomy-sex={sex}>
      <div className="flex flex-wrap justify-center gap-2">
        {!sharedControls && (
          <>
            <button type="button" onClick={() => { setRegion(null); setHover(null); setIsolate(false); setSex(sex === 'female' ? 'male' : 'female'); }} className="min-h-10 rounded-full border border-line bg-surface-2 px-3 text-sm font-bold">
              {sex === 'female' ? t.toMale : t.toFemale}
            </button>
            <button type="button" onClick={() => { setRegion(null); setHover(null); setIsolate(false); setMode(mode === 'muscles' ? 'organs' : 'muscles'); }} className="min-h-10 rounded-full border border-line bg-surface-2 px-3 text-sm font-bold">
              {mode === 'muscles' ? t.toOrgans : t.toMuscles}
            </button>
          </>
        )}
        <button type="button" onClick={() => { setIsolate(false); setReset((n) => n + 1); }} className="min-h-9 rounded-lg border border-line px-3 text-xs text-ink-2 hover:text-ink">{t.reset}</button>
      </div>
      {!sharedControls && <p className="text-center text-xs text-ink-2">{t.gesture}</p>}
      <div className="relative min-h-[300px] flex-1 overflow-hidden rounded-card bg-surface-2">
        <Suspense fallback={<p className="p-4 text-sm">{t.loading}</p>}>
          <AnatomyCanvas key={retry} mode={mode} sex={sex} zones={zones} selected={selected}
            region={active} hover={preview} title={title} reset={reset} isolate={isolate}
            onHover={setHover} onPick={pick} onReady={setState} />
        </Suspense>
        {state === 'loading' && <p role="status" className="pointer-events-none absolute bottom-2 inset-x-2 rounded bg-surface p-2 text-sm">{t.loading}</p>}
        {state === 'error' && <div role="status" className="absolute inset-x-2 top-2 rounded bg-surface p-3 text-sm">
          <p>{t.error}</p>
          <button type="button" onClick={() => setRetry((n) => n + 1)} className="mt-2 min-h-10 underline">{t.retry}</button>
        </div>}
        {(preview ?? active) && state === 'ready' && (
          <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-future bg-surface px-3 py-1 text-xs font-semibold text-brand-ink">
            {t.regions[(preview ?? active)!]}
          </span>
        )}
      </div>
      <div role="group" aria-label={t.select} className="flex flex-wrap justify-center gap-1.5">
        {regions.map((item) => (
          <button key={item} type="button" aria-pressed={active === item}
            onClick={() => pick(item)}
            onMouseEnter={() => setHover(item)} onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(item)} onBlur={() => setHover(null)}
            className={`min-h-10 rounded-full border px-2.5 text-xs font-semibold ${active === item ? 'border-future bg-brand-bg text-brand-ink' : 'border-line hover:border-future hover:text-brand-ink'}`}>
            {t.regions[item]}
          </button>
        ))}
      </div>
      {active && <div className="flex flex-wrap items-center justify-between gap-x-2 text-sm" aria-live="polite">
        <p className="font-bold">{t.regions[active]} · {word(regionZone(mode, active))}</p>
        <button type="button" aria-pressed={isolate} onClick={() => setIsolate((v) => !v)} className="min-h-10 text-brand-ink underline">{isolate ? t.showAll : t.isolate}</button>
        {onShowDetails && <button type="button" onClick={onShowDetails}
          className="dashboard-mobile-details min-h-10 font-semibold text-brand-ink underline">
          {lang === 'es' ? 'Ver evaluación' : 'View assessment'}
        </button>}
        {mode === 'muscles' && <p className="basis-full text-xs text-ink-2">{t.assessment}</p>}
      </div>}
      <details className="text-xs text-ink-2">
        <summary className="cursor-pointer py-2">{t.zones}</summary>
        <p className="mb-2">{t.zoneNote}</p>
        <div className="flex flex-wrap gap-1">
          {BODY_ZONES.map((zone) => <button key={zone} type="button" onClick={() => { setRegion(null); setHover(null); setIsolate(false); onSelect?.(zone); }}
            className="min-h-9 rounded border border-line px-2" aria-pressed={selected === zone}>{te(ZONE_LABEL[zone])}: {word(zone)}</button>)}
        </div>
      </details>
      <a href="/anatomy/ATTRIBUTION.md" target="_blank" rel="noreferrer" className="text-center text-[11px] text-ink-2 underline">
        {sex === 'female' ? 'HuBMAP HRA (Visible Human Female) · Z-Anatomy · CC BY 4.0 / CC BY-SA 4.0' : 'Z-Anatomy / BodyParts3D · CC BY-SA 4.0'}
      </a>
    </div>
  );
}
