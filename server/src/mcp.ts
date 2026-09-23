import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools/index.js";
import type { ToolContext } from "./tools/define.js";

export function createMcpServer(ctx: ToolContext): McpServer {
  const server = new McpServer({ name: "frank", version: ctx.version });
  registerTools(server, ctx);
  return server;
}
