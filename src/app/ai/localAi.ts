/**
 * Optional local AI (P1): rewrites a "Why?" explanation in plainer words, on this device.
 *
 * - Runs in the browser with WebLLM on WebGPU. The model is downloaded once, only when the crew
 *   member asks for it, and kept in the browser cache: after that it works with no network.
 * - It never decides anything. Its only input is the rules' own explanation text, and every
 *   answer goes through checkRewrite(); if the answer fails, the rules text is shown instead.
 * - The library is imported lazily, so the app does not load it unless the AI is used.
 */
import { create } from 'zustand';
import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import { checkRewrite, type GuardResult } from './guard';
import type { Lang } from '../format';

/** Small multilingual instruct model, 4-bit (≈1.6 GB of GPU memory). Swap here if a device needs less. */
export const AI_MODEL = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
const ANSWER_TIMEOUT_MS = 30_000;

export type AiPhase = 'checking' | 'unsupported' | 'off' | 'loading' | 'ready' | 'error';

interface AiState {
  phase: AiPhase;
  /** Download / load progress, 0..1. */
  progress: number;
  /** The model is already on this device: turning the AI on needs no network. */
  cached: boolean;
}

export const useLocalAi = create<AiState>(() => ({ phase: 'checking', progress: 0, cached: false }));

type Gpu = { requestAdapter(): Promise<unknown | null> };
const gpu = (): Gpu | undefined => (typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { gpu?: Gpu }).gpu);

let probing: Promise<void> | null = null;
let loading: Promise<MLCEngineInterface> | null = null;
let engine: MLCEngineInterface | null = null;
const answers = new Map<string, string>();

/** Is WebGPU here, and is the model already downloaded? Safe to call many times. */
export function probeLocalAi(): Promise<void> {
  probing ??= (async () => {
    try {
      const adapter = await gpu()?.requestAdapter();
      if (!adapter) { useLocalAi.setState({ phase: 'unsupported' }); return; }
      const { hasModelInCache } = await import('./webllm');
      useLocalAi.setState({ phase: 'off', cached: await hasModelInCache(AI_MODEL) });
    } catch {
      useLocalAi.setState({ phase: 'unsupported' });
    }
  })();
  return probing;
}

/** Download (first time) and load the model. Resolves when it can answer. */
export function loadLocalAi(): Promise<MLCEngineInterface> {
  if (engine) return Promise.resolve(engine);
  loading ??= (async () => {
    useLocalAi.setState({ phase: 'loading', progress: 0 });
    try {
      const { CreateMLCEngine } = await import('./webllm');
      engine = await CreateMLCEngine(AI_MODEL, {
        initProgressCallback: (r) => useLocalAi.setState({ progress: r.progress }),
      });
      useLocalAi.setState({ phase: 'ready', progress: 1, cached: true });
      return engine;
    } catch (err) {
      loading = null;
      useLocalAi.setState({ phase: 'error' });
      throw err;
    }
  })();
  return loading;
}

const LANGUAGE: Record<Lang, string> = { en: 'English', es: 'Spanish' };

function prompt(lang: Lang): string {
  return [
    'You rewrite a health explanation for an astronaut who is not a doctor.',
    `Rewrite the text in plain, calm ${LANGUAGE[lang]}, in at most 5 short sentences, speaking to the astronaut as "you".`,
    'Keep the same facts, the same order and the same action to take.',
    'Use only numbers that appear in the text. Do not add causes, advice, diagnoses, medicine names or links.',
    'Reply with the rewritten text only.',
  ].join(' ');
}

/**
 * Reword the rules' explanation. Resolves with the guard's verdict: ok + text, or the reason the
 * answer was rejected. Rejects only when the model cannot run at all.
 */
export async function rewrite(source: string, lang: Lang): Promise<GuardResult> {
  const key = `${lang}\u0000${source}`;
  const cached = answers.get(key);
  if (cached) return { ok: true, text: cached };
  const ai = await loadLocalAi();
  const reply = ai.chat.completions.create({
    messages: [{ role: 'system', content: prompt(lang) }, { role: 'user', content: source }],
    temperature: 0,
    max_tokens: 220,
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { ai.interruptGenerate(); reject(new Error('timeout')); }, ANSWER_TIMEOUT_MS); });
  try {
    const res = await Promise.race([reply, timeout]);
    const verdict = checkRewrite(source, res.choices[0]?.message?.content ?? '');
    if (verdict.ok) answers.set(key, verdict.text);
    return verdict;
  } finally {
    clearTimeout(timer);
  }
}
