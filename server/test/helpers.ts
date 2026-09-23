import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createApp } from "../src/app.js";
import type { Config } from "../src/config.js";

export const testConfig = (overrides: Partial<Config> = {}): Config => ({
  port: 0,
  version: "9.9.9-test",
  publicDir: "/nonexistent-frank-public",
  ...overrides,
});

export interface Running {
  baseUrl: string;
  close: () => Promise<void>;
}

/** Boots Frank on an ephemeral port. */
export async function startFrank(config: Config = testConfig()): Promise<Running> {
  const server: Server = await new Promise((resolve) => {
    const s = createApp(config).listen(0, "127.0.0.1", () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.closeAllConnections();
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

/** A real MCP client over Streamable HTTP, the way Claude Code connects. */
export async function connect(baseUrl: string): Promise<Client> {
  const client = new Client({ name: "frank-test", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL("/mcp", baseUrl)));
  return client;
}
