/**
 * Alarm tone, generated with Web Audio: no audio files to ship, works offline.
 * Emergency repeats until silenced; a warning sounds three times.
 * Browsers block audio until the first tap, so every call is allowed to fail quietly:
 * the alarm on screen never depends on the sound.
 */
let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let playing: 'emergency' | 'warning' | null = null;

function beep(frequency: number, at: number, duration: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

function pattern() {
  if (!ctx) return;
  const t = ctx.currentTime;
  beep(880, t, 0.22);
  beep(660, t + 0.3, 0.22);
}

export function startAlarm(level: 'emergency' | 'warning') {
  if (playing === level) return;
  stopAlarm();
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    void ctx.resume().catch(() => undefined);
    playing = level;
    let left = level === 'warning' ? 3 : Infinity;
    const play = () => {
      if (left-- <= 0) return stopAlarm();
      pattern();
    };
    play();
    timer = setInterval(play, 1400);
  } catch {
    playing = null;
  }
}

export function stopAlarm() {
  if (timer) clearInterval(timer);
  timer = null;
  playing = null;
}
