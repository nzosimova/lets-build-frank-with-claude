import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("defaults PORT to 3000, matching the Dockerfile and deploy.yml", () => {
    expect(loadConfig({}).port).toBe(3000);
  });

  it("reads PORT from the environment", () => {
    expect(loadConfig({ PORT: "8080" }).port).toBe(8080);
  });

  it("rejects a bad PORT at boot with a readable message", () => {
    expect(() => loadConfig({ PORT: "not-a-port" })).toThrow(/configuration is invalid — PORT/);
    expect(() => loadConfig({ PORT: "70000" })).toThrow(/PORT/);
  });

  it("reads the version from package.json and resolves the console under public/", () => {
    const config = loadConfig({});
    expect(config.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(config.publicDir.replace(/\\/g, "/")).toMatch(/\/public$/);
  });
});
