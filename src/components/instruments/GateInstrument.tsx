import type { IntuitionBeat } from "../../types/intuition";

const REVIEW_THRESHOLD = 0.55;

type Props = {
  beat: IntuitionBeat | undefined;
  active: boolean;
};

export function GateInstrument({ beat, active }: Props) {
  const answer =
    beat?.kind === "gate" && beat.answer.type === "noul" ? beat.answer : null;
  const noul = answer?.noul ?? 0;
  const pct = Math.round(noul * 100);
  const band =
    noul >= REVIEW_THRESHOLD
      ? "block"
      : noul >= REVIEW_THRESHOLD - 0.2
        ? "review"
        : "pass";

  return (
    <section
      className={`instrument ${active ? "is-active" : "is-dim"}`}
      data-kind="gate"
      aria-label="Gate instrument"
    >
      <header className="instrument__head">
        <h2 className="instrument__title">Gate</h2>
        <p className="instrument__sub">block · review · pass</p>
      </header>
      {answer ? (
        <>
          <p className="instrument__verdict">
            <span className={`instrument__verdict-key is-${band}`}>{band}</span>
            <span className="instrument__verdict-sep">noul</span>
            <span className="instrument__verdict-act">{pct}%</span>
          </p>
          <div
            className="gate-meter"
            role="img"
            aria-label={`Block probability ${pct}%, threshold ${Math.round(REVIEW_THRESHOLD * 100)}%`}
          >
            <div className="gate-meter__track">
              <div
                className="gate-meter__fill"
                style={{ ["--fill" as string]: `${pct}%` }}
              />
              <div
                className="gate-meter__threshold"
                style={{
                  ["--thr" as string]: `${REVIEW_THRESHOLD * 100}%`,
                }}
                title={`review threshold ${REVIEW_THRESHOLD}`}
              />
            </div>
            <div className="gate-meter__labels">
              <span>pass</span>
              <span>review</span>
              <span>block</span>
            </div>
          </div>
          <p className="instrument__acted">{beat?.acted}</p>
        </>
      ) : (
        <p className="instrument__idle">Standby — waiting for a gate beat</p>
      )}
    </section>
  );
}
