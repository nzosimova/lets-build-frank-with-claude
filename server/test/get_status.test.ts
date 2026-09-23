import { describe, expect, it } from "vitest";
import { getStatus } from "../src/tools/get_status.js";

describe("get_status", () => {
  it("reports version, uptime and a greeting", async () => {
    const ctx = { version: "1.2.3", startedAt: new Date(Date.now() - 42_000) };
    const result = await getStatus.handler({}, ctx);
    expect(result.version).toBe("1.2.3");
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(42);
    expect(result.greeting).toBeTruthy();
    expect(result.summary).toContain("1.2.3");
  });
});
