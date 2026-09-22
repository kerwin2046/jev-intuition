import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createCloudApp } from "./app.ts";

const { app } = createCloudApp();
const dist = join(process.cwd(), "dist");

if (existsSync(dist)) {
  app.use("/*", serveStatic({ root: "./dist" }));
  app.get("*", serveStatic({ path: "./dist/index.html" }));
}

const port = Number(process.env.PORT || 8787);
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(`INTUITION Cloud http://127.0.0.1:${info.port}`);
});
