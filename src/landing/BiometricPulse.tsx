/** Decorative pulse; an illustration, not a patient reading. */
export function BiometricPulse() {
  return (
    <section className="k-pulse-section" aria-label="Biometric intelligence">
      <div className="k-pulse-container">
        <div className="k-pulse-card">
          <div className="k-pulse-copy">
            <p className="k-pulse-eyebrow">BIOMETRIC INTELLIGENCE</p>
            <h2>Designed for life in orbit.</h2>
            <p>Offline-first. Explainable. Crew-centered.</p>
          </div>
          <div className="k-pulse-visual" aria-hidden="true">
            <svg viewBox="0 0 800 120" preserveAspectRatio="none" focusable="false">
              <line x1="0" y1="60" x2="800" y2="60" className="k-pulse-baseline" />
              <g className="k-pulse-beat">
                <path d="M0 60H85L105 60L116 54L128 68L146 20L165 104L182 51L194 60H260" className="k-pulse-path k-pulse-glow" />
                <path d="M0 60H85L105 60L116 54L128 68L146 20L165 104L182 51L194 60H260" className="k-pulse-path" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
