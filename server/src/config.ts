import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// All settings come from environment variables (ADR-001). No config files.
const envSchema = z.object({
  PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(3000),
});

export interface Config {
  port: number;
  version: string;
  /** Where the built console lives: `<package root>/public` (see Dockerfile). */
  publicDir: string;
}

// This file is src/config.ts under tsx and dist/config.js once built, so the
// package root is one level up either way.
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readVersion(): string {
  const pkg = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8")) as {
    version?: string;
  };
  return pkg.version ?? "0.0.0";
}

/** Fails at boot, in plain language, rather than on the first request. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Frank's configuration is invalid — ${problems}`);
  }
  return {
    port: parsed.data.PORT,
    version: readVersion(),
    publicDir: resolve(packageRoot, "public"),
  };
}
