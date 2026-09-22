import type { DaySummary } from "../store/useSession";

type Props = {
  source: "demo" | "live";
  playing: boolean;
  liveAvailable: boolean;
  rejudging: boolean;
  error: string | null;
  beatCount: number;
  sessionDate: string | null;
  days: DaySummary[];
  onReplay: () => void;
  onStop: () => void;
  onRejudge: () => void;
  onUseDemo: () => void;
  onClearLive: () => void;
  onLoadDay: (date: string) => void;
};

export function Controls({
  source,
  playing,
  liveAvailable,
  rejudging,
  error,
  beatCount,
  sessionDate,
  days,
  onReplay,
  onStop,
  onRejudge,
  onUseDemo,
  onClearLive,
  onLoadDay,
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
            Clear today
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

      {days.length > 0 ? (
        <label className="controls__day">
          <span>Day</span>
          <select
            value={sessionDate ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v) onLoadDay(v);
            }}
          >
            {days.map((d) => (
              <option key={d.date} value={d.date}>
                {d.date} · {d.beatCount} beat{d.beatCount === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <p className="controls__hint">
        {source === "live"
          ? `Live · ${sessionDate ?? "today"} · ${beatCount} beat${beatCount === 1 ? "" : "s"} · saved to disk · ↑↓ j/k`
          : liveAvailable
            ? "Demo fixture · waiting for Claude beats · ↑↓ j/k · space replay"
            : "Demo fixture · set TYPESAFE_API_KEY · ↑↓ j/k · space"}
      </p>
      {error ? <p className="controls__error">{error}</p> : null}
    </div>
  );
}
