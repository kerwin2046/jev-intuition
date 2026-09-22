import { Panel } from "./components/Panel";
import { useSession } from "./store/useSession";

export default function App() {
  const {
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
    select,
    startReplay,
    stopReplay,
    rejudge,
    useDemo,
    clearLive,
    loadDay,
  } = useSession();

  return (
    <main className="app">
      <Panel
        source={source}
        session={session}
        sessionDate={sessionDate}
        days={days}
        beat={beat}
        selectedIndex={selectedIndex}
        playing={playing}
        liveAvailable={liveAvailable}
        rejudging={rejudging}
        error={error}
        onSelect={select}
        onReplay={startReplay}
        onStop={stopReplay}
        onRejudge={rejudge}
        onUseDemo={useDemo}
        onClearLive={clearLive}
        onLoadDay={loadDay}
      />
    </main>
  );
}
