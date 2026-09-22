import { useCallback, useEffect, useRef, useState } from "react";
import demoSession from "../fixtures/session-demo.json";
import { api, getToken } from "../lib/api";
import type { Answer, IntuitionBeat, Session } from "../types/intuition";

const baseSession = demoSession as Session;

export type SourceMode = "demo" | "live";

export type DaySummary = {
  date: string;
  title: string;
  beatCount: number;
};

export function useSession(opts?: { readOnlySession?: Session; readOnlyDate?: string }) {
  const readOnly = Boolean(opts?.readOnlySession);
  const [source, setSource] = useState<SourceMode>(() => {
    if (opts?.readOnlySession) return "live";
    if (typeof window !== "undefined" && getToken()) return "live";
    return "demo";
  });
  const [session, setSession] = useState<Session>(() =>
    opts?.readOnlySession
      ? structuredClone(opts.readOnlySession)
      : typeof window !== "undefined" && getToken()
        ? { id: "live-pending", title: "Waiting for beats", beats: [] }
        : structuredClone(baseSession),
  );
  const [sessionDate, setSessionDate] = useState<string | null>(
    opts?.readOnlyDate ?? null,
  );
  const [days, setDays] = useState<DaySummary[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(() =>
    opts?.readOnlySession?.beats.length
      ? opts.readOnlySession.beats.length - 1
      : 0,
  );
  const [playing, setPlaying] = useState(false);
  const [liveAvailable, setLiveAvailable] = useState(false);
  const [rejudging, setRejudging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const followLiveRef = useRef(true);

  const beat: IntuitionBeat | undefined = session.beats[selectedIndex];

  const refreshDays = useCallback(async () => {
    if (readOnly || !getToken()) return;
    try {
      const data = await api<{ current?: string; sessions?: DaySummary[] }>(
        "/api/sessions",
      );
      setDays(data.sessions ?? []);
      if (data.current) setSessionDate((d) => d ?? data.current!);
    } catch {
      /* ignore */
    }
  }, [readOnly]);

  const pullSession = useCallback(
    async (date?: string) => {
      if (readOnly || !getToken()) return;
      const q = date ? `?date=${encodeURIComponent(date)}` : "";
      const data = await api<{ session: Session; date: string }>(
        `/api/session${q}`,
      );
      setSessionDate(data.date);
      if (data.session.beats.length > 0) {
        setSource("live");
        setSession(data.session);
        if (followLiveRef.current) {
          setSelectedIndex(data.session.beats.length - 1);
        }
      } else if (source === "live") {
        setSession(data.session);
      }
      await refreshDays();
    },
    [readOnly, refreshDays, source],
  );

  useEffect(() => {
    api<{ live?: boolean }>("/api/health", {}, { auth: false })
      .then((d) => setLiveAvailable(Boolean(d.live)))
      .catch(() => setLiveAvailable(false));
  }, []);

  useEffect(() => {
    if (readOnly) return;
    void pullSession().catch(() => undefined);
  }, [pullSession, readOnly]);

  // Poll for new beats (cloud has no SSE yet)
  useEffect(() => {
    if (readOnly || !getToken() || source === "demo") return;
    const id = window.setInterval(() => {
      void pullSession(sessionDate ?? undefined).catch(() => undefined);
    }, 2500);
    return () => window.clearInterval(id);
  }, [pullSession, readOnly, sessionDate, source]);

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
    if (readOnly) return;
    stopReplay();
    try {
      const data = await api<{ session: Session; date?: string }>(
        "/api/session/reset",
        { method: "POST" },
      );
      setSource("live");
      setSession(data.session);
      if (data.date) setSessionDate(data.date);
      setSelectedIndex(0);
      followLiveRef.current = true;
      await refreshDays();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    }
  }, [readOnly, refreshDays, stopReplay]);

  const loadDay = useCallback(
    async (date: string) => {
      if (readOnly) return;
      stopReplay();
      try {
        followLiveRef.current = true;
        await pullSession(date);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load day failed");
      }
    },
    [pullSession, readOnly, stopReplay],
  );

  const createShare = useCallback(async () => {
    if (readOnly || !getToken()) return;
    try {
      const data = await api<{ url: string }>("/api/share", {
        method: "POST",
        body: JSON.stringify({ date: sessionDate }),
      });
      setShareUrl(data.url);
      try {
        await navigator.clipboard.writeText(data.url);
      } catch {
        /* ignore */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Share failed");
    }
  }, [readOnly, sessionDate]);

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
    if (!beat || !liveAvailable || rejudging || readOnly) return;
    setRejudging(true);
    setError(null);
    stopReplay();
    try {
      const data = await api<{
        answers?: Record<string, Answer>;
        error?: string;
      }>("/api/systemone", {
        method: "POST",
        body: JSON.stringify({
          model: "jev-latest",
          state: beat.state,
          questions: { [beat.questionKey]: beat.question },
        }),
      });
      const nextAnswer = data.answers?.[beat.questionKey];
      if (!nextAnswer) throw new Error("No answer returned");
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
  }, [
    beat,
    liveAvailable,
    readOnly,
    rejudging,
    selectedIndex,
    stopReplay,
  ]);

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
    shareUrl,
    readOnly,
    select,
    startReplay,
    stopReplay,
    rejudge,
    useDemo,
    clearLive,
    loadDay,
    createShare,
  };
}
