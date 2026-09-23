import { z } from "zod";
import { defineTool } from "./define.js";

// Frank's first tool (ADR-002): proves the pipeline, the client wiring and the
// console before any Azure integration exists.
export const getStatus = defineTool({
  name: "get_status",
  description:
    "Returns Frank's version, how long he has been running, and a greeting. Use it to check that Frank is reachable and which build is deployed; it knows nothing about Azure.",
  input: z.object({}).strict(),
  output: z.object({
    summary: z.string().describe("One-line, human-readable status"),
    version: z.string().describe("Frank's deployed version"),
    uptimeSeconds: z.number().int().nonnegative().describe("Seconds since Frank started"),
    greeting: z.string().describe("A greeting from Frank"),
  }),
  handler: (_args, ctx) => {
    const uptimeSeconds = Math.floor((Date.now() - ctx.startedAt.getTime()) / 1000);
    return {
      summary: `Frank ${ctx.version} is up and has been running for ${uptimeSeconds}s.`,
      version: ctx.version,
      uptimeSeconds,
      greeting: "Hi, I'm Frank. Ask me about my world.",
    };
  },
});
