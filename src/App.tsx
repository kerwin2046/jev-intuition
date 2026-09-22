import { Panel } from "./components/Panel";
import { useSession } from "./store/useSession";

export default function App() {
  const {
    source,
    session,
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
  } = useSession();

  return (
    <main className="app">
      <Panel
        source={source}
        session={session}
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
      />
    </main>
  );
}
