import type { DaySummary } from "../store/useSession";
import type { IntuitionBeat, Session } from "../types/intuition";
import { Controls } from "./Controls";
import { ContextInstrument } from "./instruments/ContextInstrument";
import { GateInstrument } from "./instruments/GateInstrument";
import { RouteInstrument } from "./instruments/RouteInstrument";
import { Timeline } from "./Timeline";

type Props = {
  source: "demo" | "live";
  session: Session;
  sessionDate: string | null;
  days: DaySummary[];
  beat: IntuitionBeat | undefined;
  selectedIndex: number;
  playing: boolean;
  liveAvailable: boolean;
  rejudging: boolean;
  error: string | null;
  onSelect: (index: number) => void;
  onReplay: () => void;
  onStop: () => void;
  onRejudge: () => void;
  onUseDemo: () => void;
  onClearLive: () => void;
  onLoadDay: (date: string) => void;
};

function latestOfKind(
  beats: IntuitionBeat[],
  upTo: number,
  kind: IntuitionBeat["kind"],
): IntuitionBeat | undefined {
  for (let i = upTo; i >= 0; i--) {
    if (beats[i]?.kind === kind) return beats[i];
  }
  return undefined;
}

export function Panel({
  source,
  session,
  sessionDate,
  days,
  beat,
  selectedIndex,
  playing,
  liveAvailable,
  rejudging,
  error,
  onSelect,
  onReplay,
  onStop,
  onRejudge,
  onUseDemo,
  onClearLive,
  onLoadDay,
}: Props) {
  const routeBeat = latestOfKind(session.beats, selectedIndex, "route");
  const compactBeat = latestOfKind(session.beats, selectedIndex, "compact");
  const gateBeat = latestOfKind(session.beats, selectedIndex, "gate");

  return (
    <div className="panel">
      <header className="panel__brand">
        <p className="panel__mark">INTUITION</p>
        <p className="panel__tag">
          System One ·{" "}
          {source === "live"
            ? `Claude live${sessionDate ? ` · ${sessionDate}` : ""}`
            : "demo replay"}
        </p>
      </header>

      <div className="panel__session">
        <p className="panel__session-title">{session.title}</p>
        {beat ? (
          <p className="panel__intent">
            <span className="panel__turn">T{beat.turn}</span>
            {beat.intent}
          </p>
        ) : source === "live" ? (
          <p className="panel__intent">
            Waiting for Claude to push a Jev decision…
          </p>
        ) : null}
      </div>

      <div className="panel__body">
        <div className="panel__instruments" key={beat?.id ?? "empty"}>
          <RouteInstrument
            beat={routeBeat}
            active={beat?.kind === "route"}
          />
          <ContextInstrument
            beat={compactBeat}
            active={beat?.kind === "compact"}
          />
          <GateInstrument beat={gateBeat} active={beat?.kind === "gate"} />
        </div>

        <aside className="panel__side">
          <Timeline
            beats={session.beats}
            selectedIndex={selectedIndex}
            onSelect={onSelect}
          />
          <Controls
            source={source}
            playing={playing}
            liveAvailable={liveAvailable}
            rejudging={rejudging}
            error={error}
            beatCount={session.beats.length}
            sessionDate={sessionDate}
            days={days}
            onReplay={onReplay}
            onStop={onStop}
            onRejudge={onRejudge}
            onUseDemo={onUseDemo}
            onClearLive={onClearLive}
            onLoadDay={onLoadDay}
          />
          {beat ? (
            <p className="panel__acted" key={`acted-${beat.id}`}>
              {beat.acted}
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
