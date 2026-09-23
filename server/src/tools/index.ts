import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTool, type ToolContext, type ToolDefinition } from "./define.js";
import { getStatus } from "./get_status.js";

// Every tool Frank exposes. Add new ones here; test/tools.conventions.test.ts
// checks everything in this list against ADR-002 automatically.
export const tools: ToolDefinition[] = [getStatus as unknown as ToolDefinition];

export function registerTools(server: McpServer, ctx: ToolContext): void {
  for (const tool of tools) registerTool(server, tool, ctx);
}
