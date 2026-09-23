import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// The console is served by Frank at / and calls /mcp relatively (ADR-006), so
// there is no VITE_FRANK_URL and no CORS. In dev, Vite proxies /mcp to a local
// Frank on :3000 so the same relative URL works.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/mcp": "http://localhost:3000",
      "/healthz": "http://localhost:3000",
    },
  },
  build: {
    outDir: "dist",
    // Cloudscape is one large bundle and this console is two pages; splitting
    // it buys nothing here, so raise the warning rather than chase it.
    chunkSizeWarningLimit: 1600,
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["test/**/*.test.{ts,tsx}"],
    setupFiles: ["test/setup.ts"],
    css: false,
  },
});
