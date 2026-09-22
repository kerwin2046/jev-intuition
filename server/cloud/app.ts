import { Hono } from "hono";
import { cors } from "hono/cors";
import { CloudStore, todayKey } from "./store.ts";

type Vars = { Variables: { workspaceId: string } };

function bearer(c: { req: { header: (n: string) => string | undefined } }) {
  const h = c.req.header("authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1]?.trim() || null;
}

const PUBLIC = new Set([
  "/api/health",
  "/api/workspaces",
]);

export function createCloudApp(store = new CloudStore()) {
  const app = new Hono<Vars>();

  app.use(
    "/api/*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    }),
  );

  app.get("/api/health", (c) =>
    c.json({
      ok: true,
      product: "intuition-cloud",
      live: Boolean(process.env.TYPESAFE_API_KEY),
    }),
  );

  app.post("/api/workspaces", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { name?: string };
    const { id, token, meta } = store.createWorkspace(body.name);
    const origin = new URL(c.req.url).origin;
    return c.json({
      id,
      token,
      name: meta.name,
      dashboardUrl: `${origin}/app`,
      ingestUrl: `${origin}/api/beats`,
      hint: "Save this token — it is shown only once. Set INTUITION_TOKEN and INTUITION_URL.",
    });
  });

  app.get("/api/share/:id", (c) => {
    const found = store.getShare(c.req.param("id"));
    if (!found) return c.json({ error: "Not found" }, 404);
    return c.json({
      id: found.share.id,
      date: found.share.date,
      session: found.day.session,
      readOnly: true,
    });
  });

  app.use("/api/*", async (c, next) => {
    const path = new URL(c.req.url).pathname;
    if (PUBLIC.has(path) || path.startsWith("/api/share/")) {
      return next();
    }
    const meta = store.resolveToken(bearer(c));
    if (!meta) return c.json({ error: "Unauthorized" }, 401);
    c.set("workspaceId", meta.id);
    await next();
  });

  app.get("/api/me", (c) => {
    const meta = store.resolveToken(bearer(c))!;
    return c.json({ id: meta.id, name: meta.name, createdAt: meta.createdAt });
  });

  app.get("/api/sessions", (c) => {
    const id = c.get("workspaceId");
    return c.json({ current: todayKey(), sessions: store.listDays(id) });
  });

  app.get("/api/session", (c) => {
    const id = c.get("workspaceId");
    const date = c.req.query("date") || todayKey();
    const day = store.loadDay(id, date);
    return c.json({ session: day.session, date: day.date });
  });

  app.post("/api/session/reset", (c) => {
    const id = c.get("workspaceId");
    const day = store.resetToday(id);
    return c.json({ session: day.session, date: day.date });
  });

  app.post("/api/beats", async (c) => {
    const id = c.get("workspaceId");
    const raw = await c.req.json();
    const result = store.appendBeat(id, raw);
    if (!result) {
      return c.json(
        { error: "beat requires kind, questionKey, question, answer" },
        400,
      );
    }
    return c.json({
      beat: result.beat,
      session: result.day.session,
      date: result.day.date,
    });
  });

  app.post("/api/share", async (c) => {
    const id = c.get("workspaceId");
    const body = (await c.req.json().catch(() => ({}))) as { date?: string };
    const date = body.date || todayKey();
    const share = store.createShare(id, date);
    const origin = new URL(c.req.url).origin;
    return c.json({
      id: share.id,
      url: `${origin}/s/${share.id}`,
      date: share.date,
    });
  });

  app.post("/api/systemone", async (c) => {
    const key = process.env.TYPESAFE_API_KEY;
    if (!key) return c.json({ error: "TYPESAFE_API_KEY is not set" }, 503);
    try {
      const body = await c.req.text();
      const upstream = await fetch("https://api.typesafe.ai/v1/systemone", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body,
      });
      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : "Upstream failed" },
        502,
      );
    }
  });

  return { app, store };
}
