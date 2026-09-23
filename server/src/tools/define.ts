import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// ADR-002's tool shape, in one place so every tool gets it the same way:
// strict zod input, a `summary` string plus typed fields out, and plain-language
// errors with `isError: true` — never a stack trace.

type OutputShape = z.ZodRawShape & { summary: z.ZodString };

export interface ToolContext {
  version: string;
  startedAt: Date;
}

export interface ToolDefinition<
  I extends z.ZodObject = z.ZodObject,
  O extends z.ZodObject<OutputShape> = z.ZodObject<OutputShape>,
> {
  name: string;
  description: string;
  /** Must be `.strict()`, and every field needs a `.describe()`. */
  input: I;
  output: O;
  handler: (args: z.infer<I>, ctx: ToolContext) => z.infer<O> | Promise<z.infer<O>>;
}

export function defineTool<I extends z.ZodObject, O extends z.ZodObject<OutputShape>>(
  tool: ToolDefinition<I, O>,
): ToolDefinition<I, O> {
  return tool;
}

export function fail(message: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}

/**
 * Runs the handler and validates what it returns against the tool's output
 * schema before anything reaches the client. A throw or a bad result becomes a
 * plain-language error; the detail goes to the server log only.
 */
export async function runTool(
  tool: ToolDefinition,
  args: unknown,
  ctx: ToolContext,
): Promise<CallToolResult> {
  let result: unknown;
  try {
    result = await tool.handler(args as z.infer<typeof tool.input>, ctx);
  } catch (error) {
    console.error(`[frank] ${tool.name} failed:`, error);
    return fail(`${tool.name} could not complete. Try again, or ask for Frank's status.`);
  }
  const checked = tool.output.safeParse(result);
  if (!checked.success) {
    console.error(`[frank] ${tool.name} returned output that breaks its schema:`, checked.error);
    return fail(`${tool.name} produced an unexpected result, so it was not returned.`);
  }
  return {
    content: [{ type: "text", text: JSON.stringify(checked.data, null, 2) }],
    structuredContent: checked.data,
  };
}

export function registerTool(server: McpServer, tool: ToolDefinition, ctx: ToolContext): void {
  server.registerTool(
    tool.name,
    {
      description: tool.description,
      inputSchema: tool.input,
      outputSchema: tool.output,
    },
    (args: unknown) => runTool(tool, args, ctx),
  );
}
