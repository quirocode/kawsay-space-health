import type { Status } from '../domain/types';
import ui from '../../content/ui.json';

/** Status is never colour alone: icon + word + colour (AGENTS.md). Seeded by P1, owned by P2. */
const STYLE: Record<Status, { fg: string; bg: string }> = {
  green: { fg: 'text-ok', bg: 'bg-ok/12' },
  yellow: { fg: 'text-watch', bg: 'bg-watch/14' },
  red: { fg: 'text-act', bg: 'bg-act/12' },
  stale: { fg: 'text-stale', bg: 'hatch' },
};

export function StatusIcon({ status, size = 22 }: { status: Status; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (status) {
    case 'green':
      return (<svg {...common}><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg>);
    case 'yellow':
      return (<svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" /></svg>);
    case 'red':
      return (<svg {...common}><circle cx="12" cy="12" r="9" /><path d="M8 12h8m-3-3 3 3-3 3" /></svg>);
    case 'stale':
      return (<svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2M5 5l14 14" /></svg>);
  }
}

export function StatusBadge({ status, label, size = 'md' }: { status: Status; label?: string; size?: 'sm' | 'md' }) {
  const s = STYLE[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold ${s.fg} ${s.bg} ${
        size === 'sm' ? 'px-2 py-0.5 text-[15px]' : 'px-3 py-1 text-[17px]'
      }`}
    >
      <StatusIcon status={status} size={size === 'sm' ? 18 : 22} />
      {label ?? ui.status[status]}
    </span>
  );
}
