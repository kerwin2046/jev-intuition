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
  shareUrl: string | null;
  readOnly?: boolean;
  onReplay: () => void;
  onStop: () => void;
  onRejudge: () => void;
  onUseDemo: () => void;
  onClearLive: () => void;
  onLoadDay: (date: string) => void;
  onShare: () => void;
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
  shareUrl,
  readOnly,
  onReplay,
  onStop,
  onRejudge,
  onUseDemo,
  onClearLive,
  onLoadDay,
  onShare,
}: Props) {
  return (
    <div className="controls">
      <div className="controls__actions">
        {readOnly ? null : source === "demo" ? (
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
        {!readOnly ? (
          <button
            type="button"
            className="btn"
            onClick={onUseDemo}
            disabled={source === "demo"}
          >
            Demo
          </button>
        ) : null}
        {!readOnly ? (
          <button
            type="button"
            className="btn"
            onClick={onRejudge}
            disabled={!liveAvailable || rejudging || beatCount === 0}
          >
            {rejudging ? "Judging…" : "Re-judge"}
          </button>
        ) : null}
        {!readOnly && source === "live" ? (
          <button type="button" className="btn btn--primary" onClick={onShare}>
            Share day
          </button>
        ) : null}
      </div>

      {!readOnly && days.length > 0 ? (
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

      {shareUrl ? (
        <p className="controls__share">
          Shared: <a href={shareUrl}>{shareUrl}</a>
        </p>
      ) : null}

      <p className="controls__hint">
        {readOnly
          ? `Read-only share · ${sessionDate ?? ""} · ${beatCount} beats`
          : source === "live"
            ? `Cloud · ${sessionDate ?? "today"} · ${beatCount} beats · ↑↓ j/k`
            : "Demo fixture · create a space on / to ingest live beats"}
      </p>
      {error ? <p className="controls__error">{error}</p> : null}
    </div>
  );
}
