import type { ChoiceAnswer, ScoreAnswer } from "../../types/intuition";

type Props = {
  answer: ChoiceAnswer | ScoreAnswer;
  highlight?: string;
};

export function ProbBars({ answer, highlight }: Props) {
  const entries =
    answer.type === "choice"
      ? Object.entries(answer.probabilities)
      : Object.entries(answer.probabilities).map(([k, v]) => [
          answer.legend[k] ?? k,
          v,
        ]);

  const active =
    answer.type === "choice"
      ? answer.choice
      : String(Math.round(answer.score));

  return (
    <ul className="prob-bars" aria-label="Probabilities">
      {entries.map(([key, value]) => {
        const selected =
          highlight === key ||
          key === active ||
          (answer.type === "choice" && key === answer.choice);
        const pct = Math.round(Number(value) * 100);
        return (
          <li key={String(key)} className={selected ? "is-selected" : undefined}>
            <div className="prob-bars__meta">
              <span className="prob-bars__label">{String(key)}</span>
              <span className="prob-bars__value">{pct}%</span>
            </div>
            <div className="prob-bars__track">
              <div
                className="prob-bars__fill"
                style={{ ["--fill" as string]: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
