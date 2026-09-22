import type { IntuitionBeat } from "../types/intuition";

type Props = {
  beats: IntuitionBeat[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

export function Timeline({ beats, selectedIndex, onSelect }: Props) {
  return (
    <ol className="timeline" aria-label="Session beats">
      {beats.map((beat, index) => {
        const selected = index === selectedIndex;
        return (
          <li key={beat.id}>
            <button
              type="button"
              className={`timeline__beat ${selected ? "is-selected" : ""}`}
              onClick={() => onSelect(index)}
              aria-current={selected ? "step" : undefined}
            >
              <span className="timeline__t">
                {(beat.t / 1000).toFixed(1)}s
              </span>
              <span className="timeline__kind" data-kind={beat.kind}>
                {beat.kind}
              </span>
              <span className="timeline__label">{beat.label}</span>
              <span className="timeline__latency">{beat.latencyMs}ms</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
