import { existsSync } from "node:fs";
import { join } from "node:path";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { type ErrorRequestHandler, type Response } from "express";
import type { Config } from "./config.js";
import { createMcpServer } from "./mcp.js";

function jsonRpcError(res: Response, status: number, code: number, message: string): void {
  res.status(status).json({ jsonrpc: "2.0", error: { code, message }, id: null });
}

/**
 * Frank's HTTP surface (ADR-001, ADR-006): MCP at POST /mcp, health at
 * GET /healthz, and the console — if one has been built — at /.
 * No `listen` here, so tests can boot it on an ephemeral port.
 */
export function createApp(config: Config, startedAt: Date = new Date()) {
  const app = express();
  const ctx = { version: config.version, startedAt };

  app.get("/healthz", (_req, res) => {
    res.json({
      status: "ok",
      version: config.version,
      uptimeSeconds: Math.floor((Date.now() - startedAt.getTime()) / 1000),
    });
  });

  // Stateless Streamable HTTP, as in the SDK's stateless example: a fresh
  // server and transport per request. The simplest shape that serves many
  // concurrent clients; server-initiated notifications and resumability are
  // out of scope for v1.
  app.post("/mcp", express.json({ limit: "1mb" }), async (req, res) => {
    const server = createMcpServer(ctx);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("[frank] MCP request failed:", error);
      if (!res.headersSent) jsonRpcError(res, 500, -32603, "Frank hit an internal error.");
    }
  });

  // No SSE stream and no sessions to end. The SDK client treats 405 on GET as
  // "this server sends no notifications".
  const methodNotAllowed = (_req: express.Request, res: Response) =>
    jsonRpcError(res, 405, -32000, "Method not allowed.");
  app.get("/mcp", methodNotAllowed);
  app.delete("/mcp", methodNotAllowed);

  // The console is optional (ADR-003): it is built late, and Frank must serve
  // MCP long before it exists. No catch-all route — unknown paths stay 404.
  const indexHtml = join(config.publicDir, "index.html");
  app.use(express.static(config.publicDir, { index: false }));
  app.get("/", (_req, res) => {
    if (existsSync(indexHtml)) {
      res.sendFile(indexHtml);
    } else {
      res.type("text/plain").send("Frank's console isn't built yet (ADR-003) — MCP is at /mcp\n");
    }
  });

  const onError: ErrorRequestHandler = (error, _req, res, next) => {
    if (res.headersSent) return next(error);
    const status = typeof error?.status === "number" ? error.status : 500;
    if (status >= 500) console.error("[frank] request failed:", error);
    res.status(status).json({
      error: status === 400 ? "That request body could not be read as JSON." : "Frank hit an internal error.",
    });
  };
  app.use(onError);

  return app;
}
