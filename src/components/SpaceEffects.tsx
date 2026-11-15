import { useEffect, useRef } from 'react';
import './space-effects.css';

/** Decorative, offline-friendly starfield and a pointer-only spaceship cursor. */
export function SpaceEffects({ landing = false }: { landing?: boolean }) {
  const pointer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const cursor = pointer.current;
    if (!cursor) return;
    let frame = 0;
    let position = { x: -100, y: -100 };

    const paint = () => {
      frame = 0;
      cursor.style.transform = `translate3d(${position.x - 10}px, ${position.y - 9}px, 0)`;
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      position = { x: event.clientX, y: event.clientY };
      cursor.classList.add('is-visible');
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const hide = () => cursor.classList.remove('is-visible');
    const sync = () => {
      const enabled = fine.matches && !reduced.matches;
      document.body.classList.toggle('space-cursor-active', enabled);
      if (enabled) {
        window.addEventListener('pointermove', move, { passive: true });
        document.addEventListener('pointerleave', hide);
        window.addEventListener('blur', hide);
      } else {
        cursor.classList.remove('is-visible');
        window.removeEventListener('pointermove', move);
        document.removeEventListener('pointerleave', hide);
        window.removeEventListener('blur', hide);
      }
    };
    sync();
    fine.addEventListener('change', sync);
    reduced.addEventListener('change', sync);
    return () => {
      fine.removeEventListener('change', sync);
      reduced.removeEventListener('change', sync);
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', hide);
      window.removeEventListener('blur', hide);
      document.body.classList.remove('space-cursor-active');
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <div className={`space-starfield${landing ? ' space-starfield-landing' : ''}`} aria-hidden="true" />
      <div ref={pointer} className="space-ship-cursor" aria-hidden="true">
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 3 27 13 21 18 16 29 12 19 3 16Z" fill="#EAF3FF" stroke="#0B3D91" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="m10 3 6 16-13-3" fill="#8DB4FF" stroke="#6F9BFF" strokeWidth="1.1" />
          <path d="m16 19 11-6-6 5-5 11" fill="#6F9BFF" opacity=".86" />
          <path d="m18 22 5 5-7-2" fill="#F9C74F" opacity=".9" />
          <g className="space-spark"><path d="M29 21v7m-3.5-3.5h7" stroke="#FFD45A" strokeWidth="1.7" strokeLinecap="round"/></g>
          <g className="space-spark"><path d="M35 12v5m-2.5-2.5h5" stroke="#FFE08A" strokeWidth="1.4" strokeLinecap="round"/></g>
          <g className="space-spark"><path d="M22 33v5m-2.5-2.5h5" stroke="#FFD45A" strokeWidth="1.5" strokeLinecap="round"/></g>
        </svg>
      </div>
    </>
  );
}
