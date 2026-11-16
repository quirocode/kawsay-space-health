/**
 * The WebLLM library behind one module, so the build names its chunk "webllm-*.js".
 * That chunk is not precached by the service worker (6 MB that most crews never need);
 * vite.config.ts caches it on first use instead, so the local AI keeps working offline.
 */
export { CreateMLCEngine, hasModelInCache } from '@mlc-ai/web-llm';
