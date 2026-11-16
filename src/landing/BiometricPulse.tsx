/** Decorative ECG animation illustrating sensor monitoring, not patient data. */
export function BiometricPulse() {
  return (
    <div className="k-pulse-visual" aria-hidden="true">
      <svg viewBox="0 0 400 110" preserveAspectRatio="none" focusable="false">
        <line x1="0" y1="55" x2="400" y2="55" className="k-pulse-baseline" />
        <g className="k-pulse-beat">
          <path d="M0 55H70L85 55L96 49L109 65L131 10L151 100L169 45L182 55H260"
            className="k-pulse-path k-pulse-glow" />
          <path d="M0 55H70L85 55L96 49L109 65L131 10L151 100L169 45L182 55H260"
            className="k-pulse-path" />
        </g>
      </svg>
    </div>
  );
}
