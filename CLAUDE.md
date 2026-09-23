# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

The classroom repo for "Let's Build Frank": Frank is an MCP server plus a Cloudscape web console, shipped as **one container** to Azure Container Apps. `server/` and `ui/` start **empty on purpose** — they are built from the ADRs in `docs/adr/`. Read the relevant ADRs before writing code, and treat them as the spec: "implement ADR-NNN" should need no follow-up questions.

## Commands

Each of `server/` and `ui/` is a self-contained npm package (ADR-001, ADR-003) with the same scripts:

```bash
npm ci
npm run dev
npm test        # the CI and Docker test gate
npm run build
```

`server/`'s `npm test` type-checks `src` and `test` before running vitest, and `ui/`'s `npm run build` type-checks both. A single test: `npm test -- -t get_status` (by name) or `npm test -- test/serialize.test.ts` (by file).

Build and run the full image locally from the **repo root** (the build context must be the root so it can reach both `server/` and `ui/`):

```bash
docker build -t frank . && docker run -p 3000:3000 frank
```

There are no lint/test commands at the root.

## Architecture (the big picture)

- **Server** (ADR-001): TypeScript on Node 22, official `@modelcontextprotocol/sdk`, Streamable HTTP transport on Express. Routes: `POST /mcp` (MCP), `GET /healthz` (200 for probes), and the built console served statically at `/`. All config comes from environment variables. `PORT` defaults to 3000, and it must stay in sync with the Dockerfile and `deploy.yml`'s `--target-port 3000`.
- **Tools** (ADR-002; see `.claude/skills/frank-tools/SKILL.md`): one module per tool in `server/src/tools/`, registered in `server/src/tools/index.ts`, tests in `server/test/`. `verb_noun` names, verbs **only** `get`/`list`/`search`/`summarize`. Inputs use zod with unknown fields rejected. Output has a `summary` string plus typed fields. Errors return `isError: true` in plain language, never a stack trace. **Tools are read-only**: nothing that mutates Azure, GitHub, or the filesystem beyond temp space. A write capability needs a new ADR, not a tool. The first tool is `get_status`.
- **Console** (ADR-003 as amended by ADR-006): React 18 + Vite + Cloudscape components only. The Overview page shows `get_status`. The Tools page lists tools from MCP discovery and renders a form from each tool's input schema. It is served by Frank at `/` and calls `/mcp` **relatively**: no `VITE_FRANK_URL`, no CORS. It holds no secrets. The console is optional: the Dockerfile's ui stage tolerates an empty `ui/`, and Frank must still serve MCP (and say so at `/`) without it.
- **Container** (`Dockerfile`, ADR-006): multi-stage. `ui/dist` → `/app/public`, server `dist` → `/app/dist`, runs as `node`, `CMD node dist/index.js`. The server must resolve the console as `<package root>/public`. **`npm test` runs inside both build stages**, so the Docker build is the test gate on `main`.
- **Pipeline** (`.github/workflows/deploy.yml`, ADR-010): PRs run build and test for each package, but only once its `package-lock.json` is committed. Pushes to `main` skip those jobs and deploy: fetch the public classroom credential from `CREDENTIAL_URL`, `az acr build`, then `az containerapp create`/`update` into the shared `rg-frank-class`. The app is named `frank-<github-owner>`. Do not switch to `az containerapp up --source` (it crashes on some azure-cli builds).
- **Runtime Azure access** (ADR-010): the container gets `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, and `AZURE_RESOURCE_GROUP` for `DefaultAzureCredential`. The resource group scope comes from the environment at boot. **Never add a tool parameter that lets a caller redirect the scope** (ADR-007 relies on this).
- **`POST /mcp` is deliberately unauthenticated** (ADR-007 was Rejected). Don't add auth without a successor ADR.

## ADR workflow (ADR-000)

- Use `/adr <title>`. It takes the next number, uses `docs/adr/template.md`, sets Status: Proposed, updates the ADR tables in **both** `docs/adr/README.md` and `README.md`, and runs the `adr-reviewer` agent. Leave the result uncommitted; a human accepts it.
- Accepted ADRs are immutable. Only the Status line may be edited, to record supersession. Change course with a new ADR that names exactly which clauses it supersedes. Declined decisions are kept as **Rejected**, never deleted.
- Keep ADRs to about one page (ADR-001–005 run 290–375 words). SDK property names, error strings, and signatures belong in code, not in the ADR.
- Upcoming in class: ADR-009 (Frank reads his own resource group). ADR-008 (GitHub pipeline) is an optional stretch.

## Agents in `.claude/`

These are all read-only (`Read, Grep, Glob`):
- `tool-conventions`: run after adding or changing anything in `server/src/tools/`.
- `secret-scanner`: run before committing or opening a PR.
- `adr-reviewer`: run on any drafted or changed ADR.

## Guardrails specific to this repo

- The classroom credential is fetched by the pipeline and must never be written into the repo, `CLAUDE.md`, an ADR, a test fixture, or a prompt. Setting `AZURE_CREDENTIALS` on a fork is only the instructor's override.
- Pushing to `main` deploys. Work on a branch and open a PR.
