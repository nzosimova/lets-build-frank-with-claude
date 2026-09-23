# Frank's console

React 18 + Vite + Cloudscape ([ADR-003](../docs/adr/ADR-003-cloudscape-ui.md)).
Frank serves the built console at `/`, and it calls `/mcp` relatively
([ADR-006](../docs/adr/ADR-006-classroom-credentials.md)) — no `VITE_FRANK_URL`,
no CORS, no secrets.

## Run it

```bash
# terminal 1 — a local Frank on :3000
cd ../server && npm run dev

# terminal 2 — Vite, proxying /mcp and /healthz to that Frank
npm ci
npm run dev
```

```bash
npm test                               # vitest (jsdom)
npm test -- test/serialize.test.ts     # one file
npm run build                          # type-checks src + test, outputs dist/
```

The console is optional. The Dockerfile builds it only if `ui/package.json`
exists, and Frank serves MCP without it.

## Source map

| Path | What |
|---|---|
| `src/main.tsx` | mounts `App` with the real MCP client |
| `src/App.tsx` | Cloudscape `AppLayout` + side navigation; takes a `FrankClient` so tests can inject a fake |
| `src/frank/client.ts` | `createFrankClient()` — the SDK's Streamable HTTP client, browser-safe imports only |
| `src/pages/Overview.tsx` | `get_status` and connection health |
| `src/pages/Tools.tsx` | tools from MCP discovery; select one to get a form and run it |
| `src/components/SchemaForm.tsx` | a form rendered from a tool's JSON Schema |
| `src/components/serialize.ts` | form values → the exact `arguments` a tool expects |

A new tool on the server shows up here with no UI work. Strings, numbers,
integers, booleans and enums get their own control; anything else gets one
validated JSON field.
