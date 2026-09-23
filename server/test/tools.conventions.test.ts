import { describe, expect, it } from "vitest";
import { z } from "zod";
import { tools } from "../src/tools/index.js";

// ADR-002, checked mechanically for every registered tool. A new tool is
// covered the moment it is added to src/tools/index.ts.
const ctx = { version: "9.9.9-test", startedAt: new Date(Date.now() - 5000) };

// Representative valid input per tool, so we can run the handler and check its
// real output against the declared schema. A new tool must add an entry.
const sampleInput: Record<string, unknown> = {
  get_status: {},
};

describe.each(tools.map((t) => [t.name, t] as const))("tool %s", (name, tool) => {
  it("is named verb_noun from the closed verb set", () => {
    expect(name).toMatch(/^(get|list|search|summarize)_[a-z0-9]+(_[a-z0-9]+)*$/);
  });

  it("has a description written for a model", () => {
    expect(tool.description.trim().length).toBeGreaterThan(20);
  });

  it("describes every input field", () => {
    for (const [field, schema] of Object.entries(tool.input.shape)) {
      expect((schema as z.ZodType).description, `input field ${field}`).toBeTruthy();
    }
  });

  it("rejects unknown input fields", () => {
    expect(tool.input.safeParse({ definitelyNotAField: 1 }).success).toBe(false);
  });

  it("declares a summary string in its output", () => {
    expect(tool.output.shape.summary).toBeInstanceOf(z.ZodString);
  });

  it("returns output that matches its own schema", async () => {
    expect(sampleInput, `add a sample input for ${name}`).toHaveProperty([name]);
    const result = await tool.handler(sampleInput[name] as never, ctx);
    expect(tool.output.safeParse(result).success).toBe(true);
  });
});
