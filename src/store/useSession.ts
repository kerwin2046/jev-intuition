import { useCallback, useEffect, useRef, useState } from "react";
import demoSession from "../fixtures/session-demo.json";
import type { Answer, IntuitionBeat, Session } from "../types/intuition";

const baseSession = demoSession as Session;

export type SourceMode = "demo" | "live";

export type DaySummary = {
  date: string;
  title: string;
  beatCount: number;
};

function applyLiveSession(
  next: Session,
  setSource: (s: SourceMode) => void,
  setSession: (s: Session) => void,
  setSelectedIndex: (i: number) => void,
  followLive: boolean,
) {
  if (next.beats.length === 0) return false;
  setSource("live");
  setSession(next);
  setSelectedIndex(followLive ? next.beats.length - 1 : 0);
  return true;
}

export function useSession() {
  const [source, setSource] = useState<SourceMode>("demo");
  const [session, setSession] = useState<Session>(() =>
    structuredClone(baseSession),
  );
  const [sessionDate, setSessionDate] = useState<string | null>(null);
  const [days, setDays] = useState<DaySummary[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [liveAvailable, setLiveAvailable] = useState(false);
  const [rejudging, setRejudging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const followLiveRef = useRef(true);

  const beat: IntuitionBeat | undefined = session.beats[selectedIndex];

  const refreshDays = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      const data = (await res.json()) as {
        current?: string;
        sessions?: DaySummary[];
      };
      setDays(data.sessions ?? []);
      if (data.current) setSessionDate(data.current);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d: { live?: boolean }) => setLiveAvailable(Boolean(d.live)))
      .catch(() => setLiveAvailable(false));
  }, []);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((d: { session?: Session; date?: string }) => {
        if (d.date) setSessionDate(d.date);
        if (d.session) {
          applyLiveSession(
            d.session,
            setSource,
            setSession,
            setSelectedIndex,
            true,
          );
        }
      })
      .catch(() => undefined)
      .finally(() => {
        void refreshDays();
      });
  }, [refreshDays]);

  useEffect(() => {
    const es = new EventSource("/api/events");

    const onSession = (ev: MessageEvent) => {
      try {
        const next = JSON.parse(String(ev.data)) as Session;
        if (
          applyLiveSession(
            next,
            setSource,
            setSession,
            setSelectedIndex,
            followLiveRef.current,
          )
        ) {
          setPlaying(false);
          void refreshDays();
        }
      } catch {
        /* ignore */
      }
    };

    es.addEventListener("session", onSession);
    return () => {
      es.removeEventListener("session", onSession);
      es.close();
    };
  }, [refreshDays]);

  const select = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(session.beats.length - 1, index));
      setSelectedIndex(clamped);
      followLiveRef.current = clamped === session.beats.length - 1;
      setError(null);
    },
    [session.beats.length],
  );

  const stopReplay = useCallback(() => {
    setPlaying(false);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startReplay = useCallback(() => {
    if (source !== "demo" || session.beats.length === 0) return;
    stopReplay();
    setSelectedIndex(0);
    setPlaying(true);
    setError(null);
  }, [session.beats.length, source, stopReplay]);

  const useDemo = useCallback(() => {
    stopReplay();
    setSource("demo");
    setSession(structuredClone(baseSession));
    setSelectedIndex(0);
    followLiveRef.current = true;
    setError(null);
  }, [stopReplay]);

  const clearLive = useCallback(async () => {
    stopReplay();
    try {
      const res = await fetch("/api/session/reset", { method: "POST" });
      const data = (await res.json()) as { session: Session; date?: string };
      setSource("live");
      setSession(data.session);
      if (data.date) setSessionDate(data.date);
      setSelectedIndex(0);
      followLiveRef.current = true;
      await refreshDays();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    }
  }, [refreshDays, stopReplay]);

  const loadDay = useCallback(
    async (date: string) => {
      stopReplay();
      try {
        const res = await fetch(
          `/api/session?date=${encodeURIComponent(date)}`,
        );
        const data = (await res.json()) as {
          session?: Session;
          date?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        if (data.date) setSessionDate(data.date);
        if (data.session) {
          setSource("live");
          setSession(data.session);
          setSelectedIndex(
            data.session.beats.length > 0 ? data.session.beats.length - 1 : 0,
          );
          followLiveRef.current = true;
        }
        await refreshDays();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load day failed");
      }
    },
    [refreshDays, stopReplay],
  );

  useEffect(() => {
    if (!playing || source !== "demo") return;

    if (selectedIndex >= session.beats.length - 1) {
      setPlaying(false);
      return;
    }

    const current = session.beats[selectedIndex];
    const next = session.beats[selectedIndex + 1];
    const delay = Math.min(1800, Math.max(700, (next.t - current.t) / 3));

    timerRef.current = window.setTimeout(() => {
      setSelectedIndex((i) => i + 1);
    }, delay);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playing, selectedIndex, session.beats, source]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        stopReplay();
        select(selectedIndex + 1);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        stopReplay();
        select(selectedIndex - 1);
      } else if (e.key === " " && source === "demo") {
        e.preventDefault();
        if (playing) stopReplay();
        else startReplay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, select, selectedIndex, source, startReplay, stopReplay]);

  const rejudge = useCallback(async () => {
    if (!beat || !liveAvailable || rejudging) return;
    setRejudging(true);
    setError(null);
    stopReplay();
    try {
      const res = await fetch("/api/systemone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "jev-latest",
          state: beat.state,
          questions: { [beat.questionKey]: beat.question },
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        answers?: Record<string, Answer>;
      };
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const nextAnswer = data.answers?.[beat.questionKey];
      if (!nextAnswer) {
        throw new Error("No answer returned for question key");
      }
      setSession((prev) => {
        const beats = prev.beats.map((b, i) =>
          i === selectedIndex
            ? {
                ...b,
                answer: nextAnswer,
                acted: `${b.acted.split("·")[0]?.trim() ?? b.acted} · re-judged live`,
              }
            : b,
        );
        return { ...prev, beats };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Re-judge failed");
    } finally {
      setRejudging(false);
    }
  }, [beat, liveAvailable, rejudging, selectedIndex, stopReplay]);

  return {
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
  };
}
