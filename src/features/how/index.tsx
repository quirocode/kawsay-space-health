import { Link } from 'wouter';
import howCopy from '../../../content/how.json';
import { useLang } from '../../app/i18n';
import { StatusBadge } from '../../components/StatusBadge';
import { BTN_PRIMARY, CARD, PANEL, Screen, SourceTag } from '../../components/ui';
import type { Status } from '../../domain/types';

/** "How UPRIGHT decides": the whole reasoning path on one screen, so nothing feels like a black box. */
export function HowScreen() {
  const lang = useLang();
  const t = howCopy[lang];
  const statuses: Status[] = ['green', 'yellow', 'red', 'stale'];
  return (
    <Screen>
      <div className={`${CARD} flex flex-col gap-3`}>
        <h1 className="text-[30px] font-bold">{t.title}</h1>
        <p className="max-w-[75ch] text-ink-2">{t.intro}</p>
      </div>

      <div className={`${CARD} flex flex-col gap-4`}>
        <h2 className="text-[22px] font-bold">{t.loopTitle}</h2>
        <ol className="grid gap-3 md:grid-cols-5">
          {t.loop.map((s, i) => (
            <li key={s.name} className={`${PANEL} flex flex-col gap-2`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-[20px] font-bold text-on-brand">{i + 1}</span>
              <span className="text-[19px] font-bold">{s.name}</span>
              <span className="text-[16px] text-ink-2">{s.text}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className={`${CARD} flex flex-col gap-3`}>
          <h2 className="text-[22px] font-bold">{t.statusTitle}</h2>
          {statuses.map((s) => (
            <div key={s} className="flex items-start gap-3">
              <span className="w-[140px] shrink-0"><StatusBadge status={s} size="sm" /></span>
              <span className="text-[16px]">{t.statuses[s]}</span>
            </div>
          ))}
        </div>
        <div className={`${CARD} flex flex-col gap-3`}>
          <h2 className="text-[22px] font-bold">{t.sourcesTitle}</h2>
          <div className="flex items-start gap-3"><SourceTag official /><span className="text-[16px]">{t.nasa}</span></div>
          <div className="flex items-start gap-3"><SourceTag official={false} /><span className="text-[16px]">{t.prototype}</span></div>
        </div>
      </div>

      <div className={`${CARD} flex flex-col gap-3`}>
        <h2 className="text-[22px] font-bold">{t.phasesTitle}</h2>
        <p className="max-w-[80ch]">{t.phasesText}</p>
        <Link href="/suit" className={`${BTN_PRIMARY} self-start`}>{t.goSuit}</Link>
      </div>

      <div className={`${CARD} flex flex-col gap-3`}>
        <h2 className="text-[22px] font-bold">{t.aiTitle}</h2>
        <ul className="flex list-disc flex-col gap-1 pl-6">{t.ai.map((x) => <li key={x}>{x}</li>)}</ul>
      </div>
    </Screen>
  );
}
