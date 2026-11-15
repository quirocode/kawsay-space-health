import type { KeyboardEvent } from 'react';
import type { BodyZone, Status } from '../../domain/types';
import { te, ui } from '../../app/i18n';

/**
 * Provisional human figure (P1) with one shape per BodyZone id, until P4 exports
 * design/exports/body.svg. Same ids, so swapping the artwork does not change callers.
 */
export type ZoneFill = Status | 'none';

const FILL: Record<ZoneFill, string> = {
  green: 'var(--zone-ok)',
  yellow: 'var(--status-watch)',
  red: 'var(--status-act)',
  stale: 'url(#hatch)',
  none: 'var(--figure-line)',
};

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

/** Paint order matters: big zones first, small ones on top. */
const SHAPES: { zone: BodyZone; d: string; kind?: 'stroke' }[] = [
  { zone: 'muscles', d: 'M88 300 C82 360 84 420 92 470 L112 470 C114 420 116 360 116 300 Z M152 300 C158 360 156 420 148 470 L128 470 C126 420 124 360 124 300 Z M64 128 C50 170 46 210 48 250 L62 252 C66 214 72 176 82 142 Z M176 128 C190 170 194 210 192 250 L178 252 C174 214 168 176 158 142 Z' },
  { zone: 'lungs', d: 'M90 136 C80 160 80 196 92 214 C104 212 112 196 112 170 C112 150 104 136 90 136 Z M150 136 C160 160 160 196 148 214 C136 212 128 196 128 170 C128 150 136 136 150 136 Z' },
  { zone: 'heart', d: 'M124 164 C124 154 138 152 140 162 C142 152 156 154 154 166 C152 180 140 188 136 194 C130 186 124 178 124 164 Z' },
  { zone: 'gut', d: 'M96 226 C94 252 100 276 120 282 C140 276 146 252 144 226 C130 236 110 236 96 226 Z' },
  { zone: 'kidneys', d: 'M92 236 C84 240 84 256 92 260 C98 258 98 240 92 236 Z M148 236 C156 240 156 256 148 260 C142 258 142 240 148 236 Z' },
  { zone: 'bones', d: 'M120 112 L120 290 M104 296 L100 466 M136 296 L140 466 M98 296 L142 296', kind: 'stroke' },
  { zone: 'brain', d: 'M88 56 C88 30 104 18 120 18 C136 18 152 30 152 56 C140 50 100 50 88 56 Z' },
  { zone: 'eyes', d: 'M98 66 a8 6 0 1 0 16 0 a8 6 0 1 0 -16 0 Z M126 66 a8 6 0 1 0 16 0 a8 6 0 1 0 -16 0 Z' },
  { zone: 'inner_ear', d: 'M73 60 a7 10 0 1 0 14 0 a7 10 0 1 0 -14 0 Z M153 60 a7 10 0 1 0 14 0 a7 10 0 1 0 -14 0 Z' },
  { zone: 'skin_immune', d: 'M40 262 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0 Z M176 262 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0 Z' },
];

const SILHOUETTE =
  'M120 14 C142 14 158 32 158 58 C158 80 146 96 132 100 L132 110 C150 112 168 118 178 128 C194 168 200 212 198 256 L170 258 C170 230 166 200 160 176 L158 300 C160 360 158 420 150 476 L126 476 L122 304 L118 304 L114 476 L90 476 C82 420 80 360 82 300 L80 176 C74 200 70 230 70 258 L42 256 C40 212 46 168 62 128 C72 118 90 112 108 110 L108 100 C94 96 82 80 82 58 C82 32 98 14 120 14 Z';

export function BodyFigure({
  zones,
  variant,
  title,
  selected,
  onSelect,
}: {
  zones: Partial<Record<BodyZone, ZoneFill>>;
  variant: 'today' | 'future';
  title: string;
  selected?: BodyZone | null;
  onSelect?: (z: BodyZone) => void;
}) {
  const future = variant === 'future';
  const statusWord: Record<Exclude<ZoneFill, 'none'>, string> = {
    green: ui.status.green, yellow: ui.status.yellow, red: ui.status.red, stale: ui.status.stale,
  };
  return (
    <svg
      viewBox="0 0 240 490"
      role="img"
      aria-label={title}
      className="h-full w-full"
      style={{ color: future ? 'var(--future)' : 'var(--ink)' }}
    >
      <defs>
        <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="var(--surface-2)" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="var(--status-stale)" strokeWidth="3" />
        </pattern>
      </defs>
      <path
        data-zone="silhouette"
        d={SILHOUETTE}
        fill={future ? 'var(--brand-bg)' : 'var(--figure-base)'}
        stroke={future ? 'currentColor' : 'var(--figure-line)'}
        strokeWidth={future ? 2.5 : 3}
        strokeDasharray={future ? '6 5' : undefined}
      />
      {SHAPES.map(({ zone, d, kind }) => {
        const fill = zones[zone] ?? 'none';
        const isSel = selected === zone;
        const paint = FILL[fill];
        const common = {
          d,
          'data-zone': zone,
          'data-status': fill,
          role: onSelect ? 'button' : undefined,
          tabIndex: onSelect ? 0 : undefined,
          'aria-label': onSelect ? `${te(ZONE_LABEL[zone])}: ${fill === 'none' ? te('no projection') : statusWord[fill]}` : undefined,
          onClick: onSelect ? () => onSelect(zone) : undefined,
          onKeyDown: onSelect
            ? (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(zone);
                }
              }
            : undefined,
          style: { cursor: onSelect ? 'pointer' : undefined, transition: 'fill 500ms ease-out, stroke 500ms ease-out, opacity 500ms' },
        };
        return kind === 'stroke' ? (
          <path key={zone} {...common} fill="none" stroke={paint} strokeWidth={isSel ? 12 : 8} strokeLinecap="round" opacity={fill === 'none' ? 0.5 : 0.9} />
        ) : (
          <path
            key={zone}
            {...common}
            fill={paint}
            fillOpacity={fill === 'none' ? 0.45 : fill === 'stale' || fill === 'green' ? 1 : 0.75}
            stroke={isSel ? 'var(--brand)' : fill === 'none' ? 'none' : fill === 'green' ? 'var(--status-ok)' : paint}
            strokeWidth={isSel ? 4 : 1.5}
          />
        );
      })}
    </svg>
  );
}
