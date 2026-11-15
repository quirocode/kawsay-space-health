import { lazy, Suspense, useId, useState } from 'react';
import { create } from 'zustand';
import type { BodyZone, Status } from '../../domain/types';
import { BODY_ZONES } from '../../domain/types';
import { te, ui, useLang } from '../../app/i18n';
import copy from '../../../content/anatomy.json';
import type { AnatomyPart } from './AnatomyCanvas';
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


const useAnatomy = create<{ mode: 'muscles' | 'organs'; toggle: () => void }>((set) => ({
  mode: 'muscles',
  toggle: () => set((s) => ({ mode: s.mode === 'muscles' ? 'organs' : 'muscles' })),
}));

export function BodyFigure({ zones, variant, title, selected, onSelect }: {
  zones: Partial<Record<BodyZone, ZoneFill>>;
  variant: 'today' | 'future';
  title: string;
  selected?: BodyZone | null;
  onSelect?: (zone: BodyZone) => void;
}) {
  const lang = useLang();
  const t = copy[lang];
  const id = useId();
  const { mode, toggle } = useAnatomy();
  const [parts, setParts] = useState<AnatomyPart[]>([]);
  const [part, setPart] = useState<AnatomyPart | null>(null);
  const [isolate, setIsolate] = useState(false);
  const [reset, setReset] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const activePart = parts.find((p) => p.id === part?.id && p.zone === selected);
  const pick = (p: AnatomyPart) => { setPart(p); onSelect?.(p.zone); };
  const word = (zone: BodyZone) => {
    const status = zones[zone] ?? 'none';
    return status === 'none' ? t.noData : ui.status[status];
  };
  return (
    <div className="flex h-full w-full flex-col gap-2" data-anatomy={variant}>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={toggle} className="min-h-10 rounded-full border border-line bg-surface-2 px-3 text-sm font-bold">
          {mode === 'muscles' ? t.toOrgans : t.toMuscles}
        </button>
        <button type="button" onClick={() => { setIsolate(false); setReset((n) => n + 1); }} className="min-h-10 rounded-full border border-line px-3 text-sm">{t.reset}</button>
      </div>
      <p className="text-center text-xs text-ink-2">{mode === 'muscles' ? t.muscles : t.organs} · {t.gesture}</p>
      <div className="relative min-h-[300px] flex-1 overflow-hidden rounded-card bg-surface-2">
        <Suspense fallback={<p className="p-4 text-sm">{t.loading}</p>}>
          <AnatomyCanvas key={retry} mode={mode} zones={zones} selected={selected}
            part={activePart?.id ?? ''} title={title} reset={reset} isolate={isolate}
            onParts={setParts} onPick={pick} onReady={setState} />
        </Suspense>
        {state === 'loading' && <p role="status" className="pointer-events-none absolute bottom-2 inset-x-2 rounded bg-surface p-2 text-sm">{t.loading}</p>}
        {state === 'error' && <div role="status" className="absolute inset-x-2 top-2 rounded bg-surface p-3 text-sm">
          <p>{t.error}</p>
          <button type="button" onClick={() => setRetry((n) => n + 1)} className="mt-2 min-h-10 underline">{t.retry}</button>
        </div>}
      </div>
      <label htmlFor={id} className="text-xs font-semibold">{t.select}</label>
      <select id={id} value={activePart?.id ?? ''} onChange={(event) => {
        const found = parts.find((p) => p.id === event.target.value);
        if (found) pick(found);
      }} className="min-h-10 w-full rounded border border-line bg-surface px-2 text-sm">
        <option value="">{t.tap}</option>
        {parts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {activePart && <div className="text-sm" aria-live="polite">
        <p className="font-bold">{activePart.name} · {word(activePart.zone)}</p>
        <p className="text-xs text-ink-2">{t.assessment}</p>
        <button type="button" aria-pressed={isolate} onClick={() => setIsolate((v) => !v)} className="min-h-10 text-brand-ink underline">{isolate ? t.showAll : t.isolate}</button>
      </div>}
      <details className="text-xs text-ink-2">
        <summary className="cursor-pointer py-2">{t.zones}</summary>
        <p className="mb-2">{t.zoneNote}</p>
        <div className="flex flex-wrap gap-1">
          {BODY_ZONES.map((zone) => <button key={zone} type="button" onClick={() => { setPart(null); setIsolate(false); onSelect?.(zone); }}
            className="min-h-9 rounded border border-line px-2" aria-pressed={selected === zone}>{te(ZONE_LABEL[zone])}: {word(zone)}</button>)}
        </div>
      </details>
      <a href="/anatomy/ATTRIBUTION.md" target="_blank" rel="noreferrer" className="text-center text-[11px] text-ink-2 underline">Z-Anatomy / BodyParts3D · CC BY-SA 4.0</a>
    </div>
  );
}
