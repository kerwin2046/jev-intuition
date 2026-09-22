import { useCallback, useEffect, useRef, useState } from "react";
import demoSession from "../fixtures/session-demo.json";
import type { Answer, IntuitionBeat, Session } from "../types/intuition";

const baseSession = demoSession as Session;

export type SourceMode = "demo" | "live";

export function useSession() {
  const [source, setSource] = useState<SourceMode>("demo");
  const [session, setSession] = useState<Session>(() =>
    structuredClone(baseSession),
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [liveAvailable, setLiveAvailable] = useState(false);
  const [rejudging, setRejudging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const followLiveRef = useRef(true);

  const beat: IntuitionBeat | undefined = session.beats[selectedIndex];

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d: { live?: boolean }) => setLiveAvailable(Boolean(d.live)))
      .catch(() => setLiveAvailable(false));
  }, []);

  // Live SSE — auto-switch to live when Claude posts beats
  useEffect(() => {
    const es = new EventSource("/api/events");

    const onSession = (ev: MessageEvent) => {
      try {
        const next = JSON.parse(String(ev.data)) as Session;
        if (next.beats.length === 0) return;
        setSource("live");
        setSession(next);
        if (followLiveRef.current) {
          setSelectedIndex(next.beats.length - 1);
        }
        setPlaying(false);
      } catch {
        /* ignore */
      }
    };

    es.addEventListener("session", onSession);
    return () => {
      es.removeEventListener("session", onSession);
      es.close();
    };
  }, []);

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
      const data = (await res.json()) as { session: Session };
      setSource("live");
      setSession(data.session);
      setSelectedIndex(0);
      followLiveRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    }
  }, [stopReplay]);

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
        e.target instanceof HTMLTextAreaElement
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
  };
}
