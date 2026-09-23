import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const server = createApp(config).listen(config.port, () => {
  console.log(`[frank] ${config.version} listening on :${config.port} — MCP at /mcp, health at /healthz`);
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    console.log(`[frank] ${signal} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
