import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, Plugin, ViteDevServer } from "vite";
import type { IntuitionBeat, Session } from "../types/intuition.ts";

type SseClient = ServerResponse;

type Persisted = {
  date: string;
  startedAt: number;
  session: Session;
};

export type LiveStore = {
  session: Session;
  startedAt: number;
  date: string;
  clients: Set<SseClient>;
  dataDir: string;
};

function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptySession(title = "Claude · waiting for beats"): Session {
  return {
    id: `live-${todayKey()}`,
    title,
    beats: [],
  };
}

function sessionPath(dataDir: string, date: string): string {
  return join(dataDir, `${date}.json`);
}

function loadPersisted(dataDir: string, date: string): Persisted | null {
  const path = sessionPath(dataDir, date);
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as Persisted;
    if (!raw?.session?.beats || !Array.isArray(raw.session.beats)) return null;
    return {
      date: raw.date || date,
      startedAt: raw.startedAt || Date.now(),
      session: raw.session,
    };
  } catch {
    return null;
  }
}

function savePersisted(store: LiveStore) {
  mkdirSync(store.dataDir, { recursive: true });
  const payload: Persisted = {
    date: store.date,
    startedAt: store.startedAt,
    session: store.session,
  };
  writeFileSync(
    sessionPath(store.dataDir, store.date),
    JSON.stringify(payload, null, 2) + "\n",
    "utf8",
  );
}

function listSessions(dataDir: string): Array<{
  date: string;
  title: string;
  beatCount: number;
}> {
  if (!existsSync(dataDir)) return [];
  return readdirSync(dataDir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => {
      const date = f.replace(/\.json$/, "");
      const p = loadPersisted(dataDir, date);
      return {
        date,
        title: p?.session.title ?? date,
        beatCount: p?.session.beats.length ?? 0,
      };
    })
    .filter((s) => s.beatCount > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

function ensureToday(store: LiveStore) {
  const today = todayKey();
  if (store.date === today) return;
  savePersisted(store);
  const loaded = loadPersisted(store.dataDir, today);
  if (loaded) {
    store.date = loaded.date;
    store.startedAt = loaded.startedAt;
    store.session = loaded.session;
  } else {
    store.date = today;
    store.startedAt = Date.now();
    store.session = emptySession();
  }
}

export function createLiveStore(
  dataDir = join(process.cwd(), "data", "sessions"),
): LiveStore {
  mkdirSync(dataDir, { recursive: true });
  const date = todayKey();
  const loaded = loadPersisted(dataDir, date);
  return {
    dataDir,
    date,
    startedAt: loaded?.startedAt ?? Date.now(),
    session: loaded?.session ?? emptySession(),
    clients: new Set(),
  };
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function broadcast(store: LiveStore, event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of store.clients) {
    client.write(payload);
  }
}

function normalizeBeat(
  raw: Partial<IntuitionBeat>,
  store: LiveStore,
): IntuitionBeat | null {
  if (!raw.kind || !raw.question || !raw.answer || !raw.questionKey) {
    return null;
  }
  const turn = raw.turn ?? store.session.beats.length + 1;
  return {
    id: raw.id ?? `live-${Date.now()}-${turn}`,
    t: raw.t ?? Date.now() - store.startedAt,
    turn,
    kind: raw.kind,
    label: raw.label ?? `${raw.kind} · turn ${turn}`,
    intent: raw.intent ?? "",
    statePreview: raw.statePreview ?? (raw.state ?? "").slice(0, 120),
    state: raw.state ?? "",
    questionKey: raw.questionKey,
    question: raw.question,
    answer: raw.answer,
    latencyMs: raw.latencyMs ?? 0,
    acted: raw.acted ?? "",
  };
}

function switchToDate(store: LiveStore, date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  if (store.date === date) return true;
  savePersisted(store);
  const loaded = loadPersisted(store.dataDir, date);
  if (!loaded) {
    if (date === todayKey()) {
      store.date = date;
      store.startedAt = Date.now();
      store.session = emptySession();
      return true;
    }
    return false;
  }
  store.date = loaded.date;
  store.startedAt = loaded.startedAt;
  store.session = loaded.session;
  return true;
}

export function intuitionApiPlugin(store: LiveStore): Plugin {
  return {
    name: "intuition-api",
    configureServer(server: ViteDevServer) {
      const handler: Connect.NextHandleFunction = async (req, res, next) => {
        if (!req.url) return next();

        const full = req.url;
        const url = full.split("?")[0] ?? full;
        const params = new URL(full, "http://localhost").searchParams;

        if (req.method === "OPTIONS" && url.startsWith("/api/")) {
          res.statusCode = 204;
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type");
          res.end();
          return;
        }

        if (url === "/api/health" && req.method === "GET") {
          sendJson(res, 200, {
            live: Boolean(process.env.TYPESAFE_API_KEY),
            beats: store.session.beats.length,
            title: store.session.title,
            date: store.date,
          });
          return;
        }

        if (url === "/api/sessions" && req.method === "GET") {
          sendJson(res, 200, {
            current: store.date,
            sessions: listSessions(store.dataDir),
          });
          return;
        }

        if (url === "/api/session" && req.method === "GET") {
          const date = params.get("date");
          if (date) {
            if (!switchToDate(store, date)) {
              sendJson(res, 404, { error: `No session for ${date}` });
              return;
            }
            broadcast(store, "session", store.session);
          }
          sendJson(res, 200, {
            session: store.session,
            date: store.date,
          });
          return;
        }

        if (url === "/api/session/reset" && req.method === "POST") {
          ensureToday(store);
          store.session = emptySession();
          store.startedAt = Date.now();
          store.date = todayKey();
          savePersisted(store);
          broadcast(store, "session", store.session);
          sendJson(res, 200, { session: store.session, date: store.date });
          return;
        }

        if (url === "/api/beats" && req.method === "POST") {
          try {
            ensureToday(store);
            const raw = JSON.parse(
              await readBody(req),
            ) as Partial<IntuitionBeat> & { title?: string };
            if (raw.title) {
              store.session = {
                ...store.session,
                title: raw.title,
              };
            }
            const beat = normalizeBeat(raw, store);
            if (!beat) {
              sendJson(res, 400, {
                error: "beat requires kind, questionKey, question, answer",
              });
              return;
            }
            store.session = {
              ...store.session,
              beats: [...store.session.beats, beat],
            };
            if (store.session.title === "Claude · waiting for beats") {
              store.session = {
                ...store.session,
                title: "Claude · live session",
              };
            }
            savePersisted(store);
            broadcast(store, "beat", beat);
            broadcast(store, "session", store.session);
            sendJson(res, 200, {
              beat,
              session: store.session,
              date: store.date,
            });
          } catch (err) {
            sendJson(res, 400, {
              error: err instanceof Error ? err.message : "Invalid JSON",
            });
          }
          return;
        }

        if (url === "/api/events" && req.method === "GET") {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": "*",
          });
          res.write(
            `event: session\ndata: ${JSON.stringify(store.session)}\n\n`,
          );
          store.clients.add(res);
          req.on("close", () => {
            store.clients.delete(res);
          });
          return;
        }

        if (url === "/api/systemone" && req.method === "POST") {
          const key = process.env.TYPESAFE_API_KEY;
          if (!key) {
            sendJson(res, 503, { error: "TYPESAFE_API_KEY is not set" });
            return;
          }
          try {
            const raw = await readBody(req);
            const upstream = await fetch(
              "https://api.typesafe.ai/v1/systemone",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${key}`,
                  "Content-Type": "application/json",
                },
                body: raw,
              },
            );
            const text = await upstream.text();
            res.statusCode = upstream.status;
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.end(text);
          } catch (err) {
            sendJson(res, 502, {
              error: err instanceof Error ? err.message : "Upstream failed",
            });
          }
          return;
        }

        next();
      };

      server.middlewares.use(handler);
    },
  };
}
