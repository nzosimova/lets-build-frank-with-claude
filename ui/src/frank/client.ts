// Browser-safe SDK imports only — never the package root or a Node/stdio path.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { JsonSchema } from "../components/serialize";

export interface StatusInfo {
  summary: string;
  version: string;
  uptimeSeconds: number;
  greeting: string;
}

export interface ToolInfo {
  name: string;
  description?: string;
  inputSchema: JsonSchema;
}

export interface ToolOutcome {
  isError: boolean;
  /** The tool's `summary`, or its error message. */
  summary: string;
  structured?: Record<string, unknown>;
}

/** What the pages need from Frank. Tests inject a fake. */
export interface FrankClient {
  getStatus(): Promise<StatusInfo>;
  listTools(): Promise<ToolInfo[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<ToolOutcome>;
}

export interface FrankClientOptions {
  /** Relative to the page, because Frank serves the console (ADR-006). */
  endpoint?: string;
  fetch?: typeof fetch;
}

export function createFrankClient(options: FrankClientOptions = {}): FrankClient {
  const { endpoint = "/mcp", fetch: fetchImpl } = options;
  let connection: Promise<Client> | undefined;

  const connect = (): Promise<Client> => {
    if (!connection) {
      const url = new URL(endpoint, window.location.origin);
      const client = new Client({ name: "frank-console", version: "0.1.0" });
      const transport = new StreamableHTTPClientTransport(url, fetchImpl ? { fetch: fetchImpl } : {});
      connection = client.connect(transport).then(() => client);
      // A failed connect must not be memoised, or the console can never recover.
      connection.catch(() => {
        connection = undefined;
      });
    }
    return connection;
  };

  const callTool = async (name: string, args: Record<string, unknown>): Promise<ToolOutcome> => {
    const client = await connect();
    const result = await client.callTool({ name, arguments: args });
    const structured = result.structuredContent as Record<string, unknown> | undefined;
    const text = Array.isArray(result.content)
      ? result.content
          .filter((c): c is { type: "text"; text: string } => c.type === "text")
          .map((c) => c.text)
          .join("\n")
      : "";
    return {
      isError: Boolean(result.isError),
      summary: typeof structured?.summary === "string" ? structured.summary : text,
      structured,
    };
  };

  return {
    async getStatus() {
      const outcome = await callTool("get_status", {});
      if (outcome.isError || !outcome.structured) throw new Error(outcome.summary);
      return outcome.structured as unknown as StatusInfo;
    },
    async listTools() {
      const client = await connect();
      const { tools } = await client.listTools();
      return tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as JsonSchema,
      }));
    },
    callTool,
  };
}
