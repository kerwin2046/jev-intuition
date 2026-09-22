import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { intuitionCloudPlugin } from "./server/cloud/vite-plugin.ts";

export default defineConfig({
  plugins: [react(), intuitionCloudPlugin()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
});
