import { Navigate, Route, Routes } from "react-router-dom";
import { Panel } from "./components/Panel";
import { getToken } from "./lib/api";
import { Landing } from "./pages/Landing";
import { SharePage } from "./pages/SharePage";
import { useSession } from "./store/useSession";

function AppDashboard() {
  if (!getToken()) return <Navigate to="/" replace />;
  return <Dashboard />;
}

function Dashboard() {
  const s = useSession();
  return (
    <main className="app">
      <Panel
        source={s.source}
        session={s.session}
        sessionDate={s.sessionDate}
        days={s.days}
        beat={s.beat}
        selectedIndex={s.selectedIndex}
        playing={s.playing}
        liveAvailable={s.liveAvailable}
        rejudging={s.rejudging}
        error={s.error}
        shareUrl={s.shareUrl}
        readOnly={false}
        onSelect={s.select}
        onReplay={s.startReplay}
        onStop={s.stopReplay}
        onRejudge={s.rejudge}
        onUseDemo={s.useDemo}
        onClearLive={s.clearLive}
        onLoadDay={s.loadDay}
        onShare={() => void s.createShare()}
      />
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppDashboard />} />
      <Route path="/s/:id" element={<SharePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
