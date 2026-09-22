type Props = {
  source: "demo" | "live";
  playing: boolean;
  liveAvailable: boolean;
  rejudging: boolean;
  error: string | null;
  beatCount: number;
  onReplay: () => void;
  onStop: () => void;
  onRejudge: () => void;
  onUseDemo: () => void;
  onClearLive: () => void;
};

export function Controls({
  source,
  playing,
  liveAvailable,
  rejudging,
  error,
  beatCount,
  onReplay,
  onStop,
  onRejudge,
  onUseDemo,
  onClearLive,
}: Props) {
  return (
    <div className="controls">
      <div className="controls__actions">
        {source === "demo" ? (
          playing ? (
            <button type="button" className="btn" onClick={onStop}>
              Pause
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary"
              onClick={onReplay}
            >
              Replay
            </button>
          )
        ) : (
          <button type="button" className="btn" onClick={onClearLive}>
            Clear live
          </button>
        )}
        <button
          type="button"
          className="btn"
          onClick={onUseDemo}
          disabled={source === "demo"}
        >
          Demo
        </button>
        <button
          type="button"
          className="btn"
          onClick={onRejudge}
          disabled={!liveAvailable || rejudging || beatCount === 0}
          title={
            liveAvailable
              ? "Re-run this beat against live Jev"
              : "Set TYPESAFE_API_KEY to enable live re-judge"
          }
        >
          {rejudging ? "Judging…" : "Re-judge with Jev"}
        </button>
      </div>
      <p className="controls__hint">
        {source === "live"
          ? `Live from Claude · ${beatCount} beat${beatCount === 1 ? "" : "s"} · ↑↓ j/k`
          : liveAvailable
            ? "Demo fixture · waiting for Claude beats · ↑↓ j/k · space replay"
            : "Demo fixture · set TYPESAFE_API_KEY · ↑↓ j/k · space"}
      </p>
      {error ? <p className="controls__error">{error}</p> : null}
    </div>
  );
}
