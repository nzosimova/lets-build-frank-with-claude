import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect, startFrank, testConfig, type Running } from "./helpers.js";

describe("with a built console", () => {
  let dir: string;
  let frank: Running;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "frank-public-"));
    writeFileSync(join(dir, "index.html"), "<!doctype html><title>Frank console</title>");
    writeFileSync(join(dir, "app.js"), "console.log('frank')");
    frank = await startFrank(testConfig({ publicDir: dir }));
  });

  afterAll(async () => {
    await frank.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("serves index.html at /", async () => {
    const res = await fetch(`${frank.baseUrl}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Frank console");
  });

  it("serves static assets", async () => {
    const res = await fetch(`${frank.baseUrl}/app.js`);
    expect(res.status).toBe(200);
  });

  it("leaves unknown paths as 404 — there is no catch-all", async () => {
    const res = await fetch(`${frank.baseUrl}/no-such-page`);
    expect(res.status).toBe(404);
  });

  it("still answers POST /mcp", async () => {
    const client = await connect(frank.baseUrl);
    expect((await client.listTools()).tools.length).toBeGreaterThan(0);
    await client.close();
  });
});

describe("without a console", () => {
  let dir: string;
  let frank: Running;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "frank-empty-"));
    frank = await startFrank(testConfig({ publicDir: dir }));
  });

  afterAll(async () => {
    await frank.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("says at / that the console is not built yet", async () => {
    const res = await fetch(`${frank.baseUrl}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toMatch(/console isn't built yet .*MCP is at \/mcp/);
  });

  it("still answers POST /mcp", async () => {
    const client = await connect(frank.baseUrl);
    const result = await client.callTool({ name: "get_status", arguments: {} });
    expect(result.isError).toBeFalsy();
    await client.close();
  });
});
