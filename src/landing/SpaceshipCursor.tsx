import { useEffect, useRef } from 'react';

type Spark = { element: HTMLSpanElement; created: number; x: number; y: number; drift: number };

/** Only mounted on the public landing. Pointer events always pass through. */
export function SpaceshipCursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const shipRef = useRef<HTMLDivElement>(null);
  const sparkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current, ship = shipRef.current, layer = sparkRef.current;
    if (!root || !ship || !layer || typeof matchMedia !== 'function') return;
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || reduced.matches) return;
    let x = -100, y = -100, targetX = -100, targetY = -100;
    let rotation = 0, targetRotation = 0, previousX = -100, frame = 0;
    let lastSpark = 0, visible = false, boostUntil = 0;
    const sparks: Spark[] = [];
    const MAX_SPARKS = 24;

    const spawn = (now: number, count: number) => {
      for (let i = 0; i < count && sparks.length < MAX_SPARKS; i++) {
        const element = document.createElement('span');
        const size = 1.4 + Math.random() * 2;
        element.className = 'k-cursor-spark';
        element.style.width = size + 'px';
        element.style.height = size + 'px';
        element.style.background = i % 2 ? '#FFD76A' : '#FFE8A3';
        layer.append(element);
        sparks.push({ element, created: now, x: x + (Math.random() - .5) * 7,
          y: y + 23, drift: (Math.random() - .5) * 15 });
      }
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      if (!visible) {
        visible = true; x = event.clientX; y = event.clientY;
        previousX = x; root.style.opacity = '1';
      }
      targetX = event.clientX; targetY = event.clientY;
      targetRotation = Math.max(-33, Math.min(33, (targetX - previousX) * 1.15));
      previousX = targetX;
    };
    const hide = () => { visible = false; root.style.opacity = '0'; };
    const click = () => { if (visible) { boostUntil = performance.now() + 170; spawn(performance.now(), 5); } };
    const tick = (now: number) => {
      x += (targetX - x) * 0.72;
      y += (targetY - y) * 0.72;
      rotation += (targetRotation - rotation) * 0.22;
      targetRotation *= 0.88;
      ship.style.transform = 'translate3d(' + (x - 19) + 'px,' + (y - 14) + 'px,0) rotate(' +
        rotation.toFixed(1) + 'deg) scale(' + (now < boostUntil ? 1.12 : 1) + ')';
      if (visible && now - lastSpark > (now < boostUntil ? 35 : 85) &&
          Math.hypot(targetX - x, targetY - y) > 1.2) {
        lastSpark = now; spawn(now, 1);
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const item = sparks[i];
        const progress = (now - item.created) / 740;
        if (progress >= 1) { item.element.remove(); sparks.splice(i, 1); continue; }
        item.element.style.transform = 'translate3d(' + (item.x + item.drift * progress) + 'px,' +
          (item.y + progress * 22) + 'px,0)';
        item.element.style.opacity = String((1 - progress) * 0.95);
      }
      frame = requestAnimationFrame(tick);
    };
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', hide);
    document.addEventListener('pointerdown', click, { passive: true });
    window.addEventListener('blur', hide);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', hide);
      document.removeEventListener('pointerdown', click);
      window.removeEventListener('blur', hide);
      for (const spark of sparks) spark.element.remove();
    };
  }, []);

  return (
    <div ref={rootRef} className="k-cursor-root" aria-hidden="true">
      <div ref={sparkRef} className="k-cursor-particles" />
      <div ref={shipRef} className="k-cursor-ship">
        <svg width="38" height="44" viewBox="0 0 38 44" fill="none" aria-hidden="true">
          <path d="M15 31L19 43L23 31" fill="#FFD76A" opacity=".85" />
          <path d="M16.5 30L19 39L21.5 30" fill="#FFE8A3" />
          <path d="M19 2C12 10 11 19 12 32L19 29L26 32C27 19 26 10 19 2Z" fill="#F4FAFF" stroke="#75E6F0" strokeWidth="1.1" />
          <path d="M19 6C15 12 14.5 17 15 24H23C23.5 17 23 12 19 6Z" fill="#93AABE" />
          <path d="M19 11C16.4 14.6 16 18 16.5 21H21.5C22 18 21.6 14.6 19 11Z" fill="#75E6F0" />
          <path d="M12 22L5 33L13 30M26 22L33 33L25 30" fill="#BBCDDD" stroke="#75E6F0" strokeWidth=".9" />
        </svg>
      </div>
    </div>
  );
}
