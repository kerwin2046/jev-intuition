import type { Plugin, ViteDevServer } from "vite";
import { createCloudApp } from "./app.ts";

/** Mount Hono cloud API inside Vite dev server. */
export function intuitionCloudPlugin(): Plugin {
  const { app } = createCloudApp();

  return {
    name: "intuition-cloud",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api")) return next();
        try {
          const host = req.headers.host || "127.0.0.1:5173";
          const url = new URL(req.url, `http://${host}`);
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) {
            if (v === undefined) continue;
            if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
            else headers.set(k, v);
          }
          const method = req.method || "GET";
          let body: ArrayBuffer | undefined;
          if (method !== "GET" && method !== "HEAD") {
            const chunks: Buffer[] = [];
            await new Promise<void>((resolve, reject) => {
              req.on("data", (c: Buffer) => chunks.push(c));
              req.on("end", () => resolve());
              req.on("error", reject);
            });
            const buf = Buffer.concat(chunks);
            if (buf.byteLength > 0) {
              body = buf.buffer.slice(
                buf.byteOffset,
                buf.byteOffset + buf.byteLength,
              ) as ArrayBuffer;
            }
          }
          const request = new Request(url, {
            method,
            headers,
            body,
            // Node Request needs duplex when body is set
            ...(body ? ({ duplex: "half" } as RequestInit) : {}),
          });
          const response = await app.fetch(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => {
            if (key.toLowerCase() === "transfer-encoding") return;
            res.setHeader(key, value);
          });
          const buf = Buffer.from(await response.arrayBuffer());
          res.end(buf);
        } catch (err) {
          next(err as Error);
        }
      });
    },
  };
}
