import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Panel } from "../components/Panel";
import { api } from "../lib/api";
import { useSession } from "../store/useSession";
import type { Session } from "../types/intuition";

export function SharePage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<{
    session: Session;
    date: string;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    api<{ session: Session; date: string }>(
      `/api/share/${id}`,
      {},
      { auth: false },
    )
      .then((d) => setPayload({ session: d.session, date: d.date }))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="landing">
        <p className="landing__lead">Loading share…</p>
      </main>
    );
  }
  if (error || !payload) {
    return (
      <main className="landing">
        <p className="controls__error">{error || "Not found"}</p>
        <Link to="/">Back</Link>
      </main>
    );
  }

  return <ShareView session={payload.session} date={payload.date} />;
}

function ShareView({ session, date }: { session: Session; date: string }) {
  const s = useSession({ readOnlySession: session, readOnlyDate: date });
  return (
    <main className="app">
      <Panel
        source={s.source}
        session={s.session}
        sessionDate={s.sessionDate}
        days={[]}
        beat={s.beat}
        selectedIndex={s.selectedIndex}
        playing={false}
        liveAvailable={false}
        rejudging={false}
        error={null}
        shareUrl={null}
        readOnly
        onSelect={s.select}
        onReplay={() => undefined}
        onStop={() => undefined}
        onRejudge={() => undefined}
        onUseDemo={() => undefined}
        onClearLive={() => undefined}
        onLoadDay={() => undefined}
        onShare={() => undefined}
      />
    </main>
  );
}
