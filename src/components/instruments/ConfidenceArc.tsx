type Props = {
  confidence: number;
  label?: string;
};

/** Semi-circle confidence arc — needle settles via CSS. */
export function ConfidenceArc({ confidence, label = "confidence" }: Props) {
  const clamped = Math.max(0, Math.min(1, confidence));
  const angle = -90 + clamped * 180;
  const pct = Math.round(clamped * 100);

  return (
    <div className="confidence-arc" role="img" aria-label={`${label} ${pct}%`}>
      <svg viewBox="0 0 120 70" className="confidence-arc__svg">
        <path
          className="confidence-arc__track"
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
        />
        <path
          className="confidence-arc__fill"
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          pathLength={100}
          strokeDasharray={`${clamped * 100} 100`}
        />
        <line
          className="confidence-arc__needle"
          x1="60"
          y1="60"
          x2="60"
          y2="18"
          style={{ ["--angle" as string]: `${angle}deg` }}
        />
        <circle className="confidence-arc__hub" cx="60" cy="60" r="3.5" />
      </svg>
      <div className="confidence-arc__readout">
        <span className="confidence-arc__pct">{pct}</span>
        <span className="confidence-arc__unit">%</span>
        <span className="confidence-arc__label">{label}</span>
      </div>
    </div>
  );
}
