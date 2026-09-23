# Frank — MCP server

TypeScript on Node 22, the official MCP SDK, Streamable HTTP on Express
([ADR-001](../docs/adr/ADR-001-mcp-server-stack.md)). Tools follow
[ADR-002](../docs/adr/ADR-002-mcp-tool-conventions.md).

| Route | What |
|---|---|
| `POST /mcp` | MCP, stateless Streamable HTTP |
| `GET /healthz` | `200 { status, version, uptimeSeconds }` |
| `GET /` | the console, if `public/` has one; otherwise a one-line note |

## Run it

```bash
npm ci
npm run dev                  # tsx watch, on :3000
npm test                     # type-checks src + test, then vitest
npm test -- -t get_status    # a single test by name
npm run build && npm start   # what the container runs
```

Connect Claude Code to a local Frank:

```bash
claude mcp add --transport http frank-local http://localhost:3000/mcp
```

## Environment

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | Must match the Dockerfile and `deploy.yml`'s `--target-port` |

An invalid value stops Frank at boot with a plain-language message.

## Adding a tool

1. Create `src/tools/<verb_noun>.ts` with `defineTool` — a `.strict()` zod input
   whose every field has `.describe()`, and an output with a `summary` string.
2. Add it to the list in `src/tools/index.ts`.
3. Add a sample input for it in `test/tools.conventions.test.ts`; the
   conventions suite then checks it against ADR-002.

Verbs are `get`, `list`, `search`, `summarize` only, and tools never change
anything outside Frank. Anything else needs a new ADR.
