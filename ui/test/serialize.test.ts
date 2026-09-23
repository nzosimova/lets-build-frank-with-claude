import { describe, expect, it } from "vitest";
import { fieldKind, initialValues, serialize, type JsonSchema } from "../src/components/serialize";

const schema: JsonSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    ratio: { type: "number" },
    count: { type: "integer" },
    verbose: { type: "boolean" },
    level: { type: "string", enum: ["low", "high"] },
    code: { enum: [1, 2, 3] },
    filter: { type: "object" },
    note: { type: "string" },
  },
  required: ["name"],
};

describe("fieldKind", () => {
  it("puts enum ahead of type", () => {
    expect(fieldKind({ type: "string", enum: ["a"] })).toBe("enum");
  });

  it("falls back to a JSON editor for anything it does not model", () => {
    expect(fieldKind({ type: "object" })).toBe("json");
    expect(fieldKind({ type: "array" })).toBe("json");
    expect(fieldKind({ oneOf: [] })).toBe("json");
  });
});

describe("serialize", () => {
  it("sends each value as the type the tool expects", () => {
    const { args, errors } = serialize(schema, {
      name: "frank",
      ratio: "0.5",
      count: "3",
      verbose: true,
      level: "1",
      code: "2",
      filter: '{"region":"eastus"}',
      note: "",
    });
    expect(errors).toEqual({});
    expect(args).toEqual({
      name: "frank",
      ratio: 0.5,
      count: 3,
      verbose: true,
      level: "high",
      code: 3, // the enum's own value, not its label or index
      filter: { region: "eastus" },
      // note is empty and optional: omitted, not sent as ""
    });
  });

  it("reports a missing required field", () => {
    expect(serialize(schema, { name: "" }).errors).toEqual({ name: "Required" });
  });

  it("rejects non-numbers and non-integers", () => {
    const { errors } = serialize(schema, { name: "x", ratio: "abc", count: "1.5" });
    expect(errors).toEqual({ ratio: "Must be a number", count: "Must be a whole number" });
  });

  it("rejects invalid JSON", () => {
    expect(serialize(schema, { name: "x", filter: "{nope" }).errors).toEqual({ filter: "Not valid JSON" });
  });

  it("sends false for an untouched required boolean and omits an optional one", () => {
    const s: JsonSchema = { properties: { a: { type: "boolean" }, b: { type: "boolean" } }, required: ["a"] };
    expect(serialize(s, initialValues(s)).args).toEqual({ a: false });
  });

  it("starts from schema defaults", () => {
    const s: JsonSchema = {
      properties: { n: { type: "integer", default: 5 }, e: { enum: ["x", "y"], default: "y" } },
    };
    expect(serialize(s, initialValues(s)).args).toEqual({ n: 5, e: "y" });
  });
});
