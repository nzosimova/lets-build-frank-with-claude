import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect, startFrank, type Running } from "./helpers.js";

let frank: Running;

beforeAll(async () => {
  frank = await startFrank();
});

afterAll(async () => {
  await frank.close();
});

describe("POST /mcp over the real MCP client", () => {
  it("initializes and lists get_status with a strict input schema", async () => {
    const client = await connect(frank.baseUrl);
    const { tools } = await client.listTools();
    const status = tools.find((t) => t.name === "get_status");
    expect(status).toBeDefined();
    expect(status?.inputSchema.additionalProperties).toBe(false);
    expect(status?.outputSchema?.properties).toHaveProperty("summary");
    await client.close();
  });

  it("calls get_status and returns a summary", async () => {
    const client = await connect(frank.baseUrl);
    const result = await client.callTool({ name: "get_status", arguments: {} });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toMatchObject({ version: "9.9.9-test" });
    expect((result.structuredContent as { summary: string }).summary).toMatch(/Frank/);
    await client.close();
  });

  it("rejects an unknown argument instead of ignoring it", async () => {
    const client = await connect(frank.baseUrl);
    const result = await client.callTool({ name: "get_status", arguments: { bogus: true } });
    expect(result.isError).toBe(true);
    await client.close();
  });

  it("serves several clients at once without shared state", async () => {
    const clients = await Promise.all([1, 2, 3].map(() => connect(frank.baseUrl)));
    const calls = clients.flatMap((c) =>
      [1, 2].map(() => c.callTool({ name: "get_status", arguments: {} })),
    );
    const results = await Promise.all(calls);
    expect(results).toHaveLength(6);
    for (const r of results) expect(r.isError).toBeFalsy();
    await Promise.all(clients.map((c) => c.close()));
  });
});

describe("the rest of /mcp and /healthz", () => {
  it.each(["GET", "DELETE"])("%s /mcp is 405 with a JSON-RPC error", async (method) => {
    const res = await fetch(`${frank.baseUrl}/mcp`, { method });
    expect(res.status).toBe(405);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    expect(await res.json()).toEqual({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    });
  });

  it("GET /healthz is 200 with version and uptime", async () => {
    const res = await fetch(`${frank.baseUrl}/healthz`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok", version: "9.9.9-test" });
  });

  it("answers malformed JSON in plain language, not a stack trace", async () => {
    const res = await fetch(`${frank.baseUrl}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toMatch(/could not be read as JSON/);
    expect(text).not.toMatch(/at .*\.js/);
  });
});
