import type { IntuitionBeat } from "../../types/intuition";
import { ConfidenceArc } from "./ConfidenceArc";
import { ProbBars } from "./ProbBars";

type Props = {
  beat: IntuitionBeat | undefined;
  active: boolean;
};

export function RouteInstrument({ beat, active }: Props) {
  const answer =
    beat?.kind === "route" && beat.answer.type === "choice"
      ? beat.answer
      : null;

  return (
    <section
      className={`instrument ${active ? "is-active" : "is-dim"}`}
      data-kind="route"
      aria-label="Route instrument"
    >
      <header className="instrument__head">
        <h2 className="instrument__title">Route</h2>
        <p className="instrument__sub">model · handler</p>
      </header>
      {answer ? (
        <>
          <p className="instrument__verdict">
            <span className="instrument__verdict-key">{answer.choice}</span>
            <span className="instrument__verdict-sep">→</span>
            <span className="instrument__verdict-act">
              {beat?.acted.split("·")[0]?.trim()}
            </span>
          </p>
          <ProbBars answer={answer} />
          <ConfidenceArc confidence={answer.confidence} />
        </>
      ) : (
        <p className="instrument__idle">Standby — waiting for a route beat</p>
      )}
    </section>
  );
}
