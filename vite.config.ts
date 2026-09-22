import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import {
  createLiveStore,
  intuitionApiPlugin,
} from "./src/server/liveSession.ts";

const store = createLiveStore();

export default defineConfig({
  plugins: [react(), intuitionApiPlugin(store)],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
});
