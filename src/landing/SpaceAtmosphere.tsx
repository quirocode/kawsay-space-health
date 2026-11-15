import { useMemo, type CSSProperties } from 'react';

/** Additional atmospheric stars and nebulas; existing hero animations remain untouched. */
export function SpaceAtmosphere() {
  const stars = useMemo(() => Array.from({ length: 125 }, (_, i) => {
    const random = (salt: number) => {
      const value = Math.sin((i + 1) * 127.1 + salt * 311.7) * 43758.5453;
      return value - Math.floor(value);
    };
    return {
      x: random(1) * 100,
      y: random(2) * 100,
      size: random(3) > 0.95 ? 2.3 : 0.7 + random(4) * 1.2,
      duration: 4 + random(5) * 8,
      delay: -random(6) * 11,
      opacity: 0.3 + random(7) * 0.65,
      color: ['#F4FAFF', '#C3F7FF', '#DDD0FF'][Math.floor(random(8) * 3)],
    };
  }), []);
  return (
    <div className="k-atmosphere" aria-hidden="true">
      <div className="k-nebula k-nebula-violet" />
      <div className="k-nebula k-nebula-cyan" />
      <div className="k-nebula k-nebula-center" />
      {stars.map((star, index) => (
        <span key={index} className="k-ambient-star" style={{
          left: star.x + '%', top: star.y + '%',
          width: star.size, height: star.size, background: star.color,
          '--k-opacity': star.opacity,
          animationDuration: star.duration + 's', animationDelay: star.delay + 's',
        } as CSSProperties} />
      ))}
    </div>
  );
}
