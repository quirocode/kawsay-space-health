import { useEffect, useState } from 'react';
import { useLang } from '../app/i18n';
import { fill } from '../app/format';
import { WHY_COPY, whyToText, type Why } from '../app/why/explain';
import { probeLocalAi, rewrite, useLocalAi } from '../app/ai/localAi';
import { SourceItems } from './ui';

/**
 * "Why?" (P2 component, seeded by P1): the explanation, not a reading list.
 * What it means → in your case → do this now → when we check again, then the evidence folded.
 * Optional: read aloud (system voice, offline) and a plainer rewrite by the local AI.
 */
export function WhyPanel({ why, hideDoNow = false, defaultOpen = false }: { why: Why; hideDoNow?: boolean; defaultOpen?: boolean }) {
  const lang = useLang();
  const c = WHY_COPY[lang];
  const text = whyToText(hideDoNow ? { ...why, doNow: undefined } : why, lang);
  return (
    <details className="group text-[17px]" open={defaultOpen}>
      <summary className="inline-flex min-h-12 cursor-pointer items-center gap-2 font-bold text-brand-ink">
        <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-brand-ink text-[14px]">?</span>
        {c.labels.title}
      </summary>
      <WhyBody key={`${lang}:${text}`} why={why} text={text} hideDoNow={hideDoNow} />
    </details>
  );
}

const H = 'text-[14px] font-bold uppercase tracking-wide text-ink-2';
const ACTION = 'inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-line px-4 text-[16px] font-bold text-brand-ink hover:bg-surface-3 disabled:opacity-50';

function WhyBody({ why, text, hideDoNow }: { why: Why; text: string; hideDoNow: boolean }) {
  const lang = useLang();
  const c = WHY_COPY[lang];
  const ai = useLocalAi();
  const [aiText, setAiText] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [offer, setOffer] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { void probeLocalAi(); }, []);

  async function simplify() {
    if (!ai.cached && ai.phase !== 'ready' && !offer) { setOffer(true); return; }
    setOffer(false);
    setBusy(true);
    setNote(null);
    try {
      const verdict = await rewrite(text, lang);
      if (verdict.ok) setAiText(verdict.text);
      else setNote(c.ai.rejected);
    } catch {
      setNote(c.ai.failed);
    } finally {
      setBusy(false);
    }
  }

  const aiAvailable = ai.phase !== 'unsupported' && ai.phase !== 'checking';
  return (
    <div className="mt-2 flex flex-col gap-3 rounded-card border border-line bg-surface p-4 text-ink">
      {aiText ? (
        <section className="flex flex-col gap-2" aria-live="polite">
          <p className="whitespace-pre-line text-[18px]">{aiText}</p>
          <p className="text-[14px] text-ink-2">{c.ai.badge}</p>
          <button type="button" className={`${ACTION} self-start`} onClick={() => setAiText(null)}>{c.ai.showRules}</button>
        </section>
      ) : (
        <>
          <section>
            <h3 className={H}>{c.labels.meaning}</h3>
            <p className="mt-1 text-[18px]">{why.meaning}</p>
          </section>
          {why.yourCase.length > 0 && (
            <section>
              <h3 className={H}>{c.labels.yourCase}</h3>
              <ul className="mt-1 flex list-disc flex-col gap-1 pl-6">
                {why.yourCase.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </section>
          )}
          {why.doNow && !hideDoNow && (
            <section className="rounded-card border-2 border-brand-ink bg-brand-bg p-3">
              <h3 className={H}>{c.labels.doNow}</h3>
              <p className="mt-1 text-[18px] font-bold">{why.doNow}</p>
            </section>
          )}
          {(why.recheck || why.escalate) && (
            <section>
              <h3 className={H}>{c.labels.recheck}</h3>
              {why.recheck && <p className="mt-1">{why.recheck}</p>}
              {why.escalate && <p className="mt-1 font-bold">{why.escalate}</p>}
            </section>
          )}
        </>
      )}

      <div className="flex flex-wrap gap-2">
        <ReadAloud text={aiText ?? text} />
        {aiAvailable && !aiText && (
          <button type="button" className={ACTION} onClick={simplify} disabled={busy || ai.phase === 'loading'}>
            <span aria-hidden>✦</span>{c.ai.simplify}
          </button>
        )}
      </div>

      {offer && (
        <div role="dialog" aria-label={c.ai.offerTitle} className="flex flex-col gap-2 rounded-card bg-surface-2 p-3">
          <p className="font-bold">{c.ai.offerTitle}</p>
          <p className="text-[16px] text-ink-2">{c.ai.offerBody}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={ACTION} onClick={simplify}>{c.ai.download}</button>
            <button type="button" className={ACTION} onClick={() => setOffer(false)}>{c.ai.notNow}</button>
          </div>
        </div>
      )}
      {ai.phase === 'loading' && (
        <div className="flex flex-col gap-1" aria-live="polite">
          <p className="text-[15px] text-ink-2">{fill(c.ai.loading, { pct: Math.round(ai.progress * 100) })}</p>
          <div className="h-2 overflow-hidden rounded-full bg-surface-3"><div className="h-full bg-brand" style={{ width: `${Math.round(ai.progress * 100)}%` }} /></div>
        </div>
      )}
      {busy && ai.phase === 'ready' && <p className="text-[15px] text-ink-2" aria-live="polite">{c.ai.thinking}</p>}
      {note && <p className="text-[15px] text-ink-2" role="status">{note}</p>}

      {why.sources.length > 0 && (
        <details className="text-[15px] text-ink-2">
          <summary className="inline-flex min-h-12 cursor-pointer items-center font-bold text-brand-ink">{fill(c.labels.evidence, { n: why.sources.length })}</summary>
          <SourceItems sources={why.sources} />
          <p className="mt-2 text-[14px]">{c.labels.offlineLinks}</p>
        </details>
      )}
    </div>
  );
}

/** Reads the explanation with the system voice. Works offline where the OS has a local voice. */
function ReadAloud({ text }: { text: string }) {
  const lang = useLang();
  const c = WHY_COPY[lang];
  const [speaking, setSpeaking] = useState(false);
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  useEffect(() => () => { if (speaking) synth?.cancel(); }, [speaking, synth]);
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return null;
  const toggle = () => {
    synth.cancel();
    if (speaking) { setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'es' ? 'es-ES' : 'en-US';
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  };
  return (
    <button type="button" className={ACTION} onClick={toggle} aria-pressed={speaking}>
      <span aria-hidden>{speaking ? '■' : '▶'}</span>{speaking ? c.labels.stopReading : c.labels.readAloud}
    </button>
  );
}
