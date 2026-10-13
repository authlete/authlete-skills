# authlete-skills

Agent Skills that turn a coding assistant (Claude Code, Cursor, Codex, …) into a generator for **Authlete-based OAuth 2.0 / OpenID Connect servers** — in any language that has an official Authlete 3.0 SDK.

The skill encodes Authlete's protocol contract and the per-language SDK map, and your coding agent writes an idiomatic server from it on demand.

> **Status: Preview.** The main skill (`authlete-oauth-server`) generates a reference server that **builds and runs and serves live Authlete discovery**. Full protocol conformance (the complete `authorize → token → userinfo` round-trip) is the next milestone. Don't rely on this for production yet.

## Skills

| Skill | What it does |
|---|---|
| **`authlete-oauth-server`** | Generates a base server: the OAuth/OIDC endpoints + built-in basic login and consent, with an in-config identity source. |

Add-on skills (externalized login/consent, PAR, CIBA, device flow, introspection, registration, grant management, federation) are planned — each adds one endpoint or swaps one step, never a rewrite.

## Supported languages

The hard rule: **use the official Authlete 3.0 SDK, or generation stops.** No raw-HTTP fallbacks.

| Language | Official SDK | In the SDK map | Verified |
|---|---|---|---|
| **Go** | `authlete-go-sdk` | ✅ | ✅ builds + runs + live discovery |
| **TypeScript** | `@authlete/typescript-sdk` | ✅ | ✅ builds (regen evals) |
| **Ruby** | `authlete_ruby_sdk` (Ruby ≥ 3.2) | ✅ | ✅ builds + runs + live discovery |
| **C#** | coming | — | on SDK release |

## Install

Into Claude Code (drops the skill where the agent auto-loads it):

```bash
cp -R skills/authlete-oauth-server ~/.claude/skills/
```

Or via the skills registry (any supported coding agent):

```bash
npx skills add authlete/authlete-skills
```

## Use it — paste this into your coding agent

The skill does the work; this prompt just drives it. Paste it into a session where the skill is installed:

```
Generate an OAuth 2.0 / OpenID Connect authorization server on Authlete using the
authlete-oauth-server skill. Before generating, ask me these one at a time and wait
for each answer:

1. Language? (must have an official Authlete 3.0 SDK: Go, Ruby, or TypeScript. If I
   name anything else, tell me it isn't supported yet and stop.)
2. Authlete cluster base URL? (e.g. https://us.authlete.com)
3. Is a service configured — do you have AUTHLETE_SERVICE_ID and AUTHLETE_API_TOKEN
   available as environment variables? (Don't paste the token into chat; read it from
   the environment.)

Then follow the skill: add the official SDK, get an empty build green, generate the
base server (OAuth/OIDC endpoints + built-in login + consent + in-config identity
source), and build it green. Finally, run it and verify GET /health returns 200 and
GET /.well-known/oauth-authorization-server returns my service's live discovery
document. Tell me the port and the run command.
```

Required environment at run time: `AUTHLETE_BASE_URL`, `AUTHLETE_SERVICE_ID`, `AUTHLETE_API_TOKEN`, `AS_BASE_URL`, `PORT` (default 8080).

## What the server looks like

Thin by design — Authlete owns all protocol processing; the server forwards raw requests and acts on Authlete's response. Flat, idiomatic wiring (read config → one Authlete client → register routes → listen): no framework, no DI container, no registry. Each endpoint is its own file; login and consent are each a swappable module so add-on skills can replace one without touching the rest.

Endpoints: `/oauth/authorize`, `/oauth/authorize/decision`, `/oauth/token`, `/oauth/userinfo`, `/oauth/jwks`, `/.well-known/openid-configuration`, `/.well-known/oauth-authorization-server`, `/health`.

## Roadmap

1. Conformance harness — prove the full flow against a live Authlete, per language.
2. Ruby eval to parity with Go; C# on SDK release.
3. Add-on skills (external login/consent, advanced endpoints).

## License

Apache-2.0. See [LICENSE](LICENSE).
