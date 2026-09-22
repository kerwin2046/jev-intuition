import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, Plugin, ViteDevServer } from "vite";
import type { IntuitionBeat, Session } from "../types/intuition.ts";

type SseClient = ServerResponse;

export type LiveStore = {
  session: Session;
  startedAt: number;
  clients: Set<SseClient>;
};

export function createLiveStore(): LiveStore {
  return {
    session: {
      id: "live-claude",
      title: "Claude · waiting for beats",
      beats: [],
    },
    startedAt: Date.now(),
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

export function intuitionApiPlugin(store: LiveStore): Plugin {
  return {
    name: "intuition-api",
    configureServer(server: ViteDevServer) {
      const handler: Connect.NextHandleFunction = async (req, res, next) => {
        if (!req.url) return next();

        const url = req.url.split("?")[0] ?? req.url;

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
          });
          return;
        }

        if (url === "/api/session" && req.method === "GET") {
          sendJson(res, 200, { session: store.session });
          return;
        }

        if (url === "/api/session/reset" && req.method === "POST") {
          store.session = {
            id: "live-claude",
            title: "Claude · waiting for beats",
            beats: [],
          };
          store.startedAt = Date.now();
          broadcast(store, "session", store.session);
          sendJson(res, 200, { session: store.session });
          return;
        }

        if (url === "/api/beats" && req.method === "POST") {
          try {
            const raw = JSON.parse(await readBody(req)) as Partial<IntuitionBeat> & {
              title?: string;
            };
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
            broadcast(store, "beat", beat);
            broadcast(store, "session", store.session);
            sendJson(res, 200, { beat, session: store.session });
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
