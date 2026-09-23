import { describe, expect, it, vi } from "vitest";
import { createFrankClient } from "../src/frank/client";

// A minimal Frank over browser-style fetch: answers initialize, the
// initialized notification, and tools/list with JSON (not SSE).
function fakeFrank() {
  const urls: string[] = [];
  const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    urls.push(url);
    if ((init?.method ?? "GET") !== "POST") return new Response(null, { status: 405 });
    const msg = JSON.parse(String(init?.body));
    if (msg.id === undefined) return new Response(null, { status: 202 });
    const result =
      msg.method === "initialize"
        ? {
            protocolVersion: msg.params.protocolVersion,
            capabilities: { tools: {} },
            serverInfo: { name: "frank", version: "9.9.9" },
          }
        : {
            tools: [
              {
                name: "get_status",
                description: "status",
                inputSchema: { type: "object", properties: {}, additionalProperties: false },
              },
            ],
          };
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  return { fetchImpl, urls };
}

describe("createFrankClient", () => {
  it("talks to /mcp relative to the page and lists tools", async () => {
    const { fetchImpl, urls } = fakeFrank();
    const client = createFrankClient({ fetch: fetchImpl as typeof fetch });
    const tools = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(["get_status"]);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url).toBe(new URL("/mcp", window.location.origin).href);
  });

  it("does not memoise a failed connection", async () => {
    const { fetchImpl } = fakeFrank();
    const flaky = vi.fn().mockRejectedValueOnce(new TypeError("fetch failed")).mockImplementation(fetchImpl);
    const client = createFrankClient({ fetch: flaky as typeof fetch });
    await expect(client.listTools()).rejects.toThrow();
    await expect(client.listTools()).resolves.toHaveLength(1);
  });
});
