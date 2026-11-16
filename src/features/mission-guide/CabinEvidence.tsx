import { ago, clock, dec } from '../../app/format';
import { useLang } from '../../app/i18n';
import { readingOrigin } from '../../components/readingEvidence';
import { cabinCo2, CABIN_CO2_LIMIT } from '../../domain/cabinCo2';
import { SRC } from '../../domain/indicators';
import { lastNDaysAvg } from '../../domain/rules';
import type { MissionContext, Reading } from '../../domain/types';

export function CabinEvidence({ readings, nowTs, context }: { readings: Reading[]; nowTs: number; context: MissionContext }) {
  const lang = useLang();
  const es = lang === 'es';
  const co2 = cabinCo2(readings, nowTs);
  const available = readings.filter((r) => r.ts <= nowTs);
  const latest = (id: string) => available.reduce<Reading | undefined>((best, r) =>
    r.indicatorId === id && (!best || r.ts >= best.ts) ? r : best, undefined);
  const headache = latest('headache_score');
  const sleep = latest('sleep_hours');
  const sleepAvg = lastNDaysAvg(available, 'sleep_hours', 3, context);
  const describe = (r: Reading) => `${readingOrigin(r, lang)} · ${clock(r.ts)} · ${ago(nowTs - r.ts, lang)}`;
  const num = (v: number) => dec(Number(v.toFixed(2)), lang);
  return (
    <section className="cabin-evidence rounded-card border border-line bg-surface-2 p-4">
      <h2 className="font-bold">{es ? '¿Por qué apareció el hallazgo?' : 'Why did this finding appear?'}</h2>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-ink-2">{es ? 'CO₂ · promedio de 1 h' : 'CO₂ · 1-hour average'}</dt>
          <dd className={`mt-1 font-bold ${co2.value !== null && co2.value > CABIN_CO2_LIMIT ? 'text-watch' : ''}`}>
            {co2.value === null ? (es ? 'Datos insuficientes' : 'Insufficient data') : `${num(co2.value)} mmHg`}
          </dd>
          <dd className="mt-1 text-xs text-ink-2">{clock(co2.start)}–{clock(co2.end)} · {num(co2.coveredMinutes)}/60 min</dd>
          {co2.latest && <dd className="mt-1 text-xs text-ink-2">
            {es ? 'Última muestra' : 'Latest sample'} · {num(co2.latest.value)} mmHg · {describe(co2.latest)}
            {co2.origins.length > 1 && (es ? ' · Fuentes mixtas en la ventana' : ' · Mixed sources in this window')}
          </dd>}
        </div>
        {headache && headache.missionDay === context.missionDay && <div>
          <dt className="text-ink-2">{es ? 'Dolor de cabeza' : 'Headache'}</dt>
          <dd className="mt-1 font-bold">{headache.value}/5</dd>
          <dd className="mt-1 text-xs text-ink-2">{describe(headache)}</dd>
        </div>}
        {sleep && sleepAvg !== undefined && <div>
          <dt className="text-ink-2">{es ? 'Sueño · últimos 3 días' : 'Sleep · last 3 days'}</dt>
          <dd className="mt-1 font-bold">{num(sleepAvg)} h</dd>
          <dd className="mt-1 text-xs text-ink-2">{describe(sleep)}</dd>
        </div>}
      </dl>
      <p className="mt-3 border-t border-line pt-3 text-xs text-ink-2">
        {es
          ? 'NASA V2 6004 fija un máximo de 3 mmHg en promedio durante una hora para el hábitat. UPRIGHT exige cobertura completa con muestras separadas por hasta 15 min. El cruce con síntomas y sueño es una regla del prototipo.'
          : 'NASA V2 6004 sets a 1-hour habitat average limit of 3 mmHg. UPRIGHT requires full coverage with samples at most 15 min apart. Combining symptoms and sleep is a prototype rule.'}
        {' '}<a className="font-semibold text-brand-ink underline" href={SRC.co2.url} target="_blank" rel="noreferrer">{es ? 'Ver norma NASA' : 'View NASA standard'}</a>
      </p>
    </section>
  );
}
