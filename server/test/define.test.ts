import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { defineTool, runTool, type ToolDefinition } from "../src/tools/define.js";

const ctx = { version: "9.9.9-test", startedAt: new Date() };
const output = z.object({ summary: z.string(), count: z.number() });

const asTool = (t: unknown) => t as ToolDefinition;

describe("runTool", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns structured content with a summary for a good result", async () => {
    const tool = defineTool({
      name: "get_thing",
      description: "test",
      input: z.object({}).strict(),
      output,
      handler: () => ({ summary: "one thing", count: 1 }),
    });
    const result = await runTool(asTool(tool), {}, ctx);
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({ summary: "one thing", count: 1 });
  });

  it("turns a thrown error into a plain-language isError result with no stack trace", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const tool = defineTool({
      name: "get_thing",
      description: "test",
      input: z.object({}).strict(),
      output,
      handler: () => {
        throw new Error("secret internal detail at /app/dist/x.js:12");
      },
    });
    const result = await runTool(asTool(tool), {}, ctx);
    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toMatch(/get_thing could not complete/);
    expect(text).not.toMatch(/secret internal detail|\.js:\d+|at /);
  });

  it("refuses to return a result that breaks the output schema", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const tool = defineTool({
      name: "get_thing",
      description: "test",
      input: z.object({}).strict(),
      output,
      handler: () => ({ summary: "oops", count: "not a number" }) as never,
    });
    const result = await runTool(asTool(tool), {}, ctx);
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
  });
});
