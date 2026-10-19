# authlete-skills

Agent Skills that turn a coding assistant (Claude Code, Cursor, Codex, …) into a generator for **Authlete-based OAuth 2.0 / OpenID Connect servers** — in any language that has an official Authlete 3.0 SDK.

The skill encodes Authlete's protocol contract and the per-language SDK map, and your coding agent writes an idiomatic server from it on demand.

> **Status: Preview.** These skills generate a working OAuth 2.0 / OpenID Connect server on Authlete —
> the core `authorize → token → userinfo` flow plus optional capabilities — each with its own conformance
> checklist. Not recommended for production yet.

## Skills

Start with the base skill, then add only the capabilities you need. Each add-on adds one endpoint (or
layers onto existing ones) — never a rewrite. Every skill ships a `conformance/` checklist.

| Skill | What it adds |
|---|---|
| **`authlete-oauth-server`** | The base server: OAuth/OIDC endpoints + built-in basic login and consent, with an in-config identity source. |
| **`authlete-par`** | Pushed Authorization Requests (RFC 9126). |
| **`authlete-dcr`** | Dynamic Client Registration + management (RFC 7591 / 7592). |
| **`authlete-dpop`** | DPoP sender-constrained tokens (RFC 9449). Layers onto token/PAR/userinfo. |
| **`authlete-userinfo`** | The OIDC UserInfo endpoint (Core §5.3). |
| **`authlete-introspection`** | Token introspection (RFC 7662). |
| **`authlete-revocation`** | Token revocation (RFC 7009). |

Still planned: externalized login/consent, CIBA, device flow, grant management, federation.

## Conformance

Generating a server is only half the promise — the other half is **proving it's correct**. Every skill
ships a plain-language `conformance/spec.md` (what the capability must do, with the RFC section and
copy-paste commands next to each item), and [`conformance/`](conformance/) holds the shared tools —
notably the swappable **login drivers** that let the same protocol checks run against any server. See
[conformance/README.md](conformance/README.md).

## Supported languages

The hard rule: **use the official Authlete 3.0 SDK, or generation stops.** No raw-HTTP fallbacks.

| Language | Official SDK | In the SDK map | Verified |
|---|---|---|---|
| **Go** | `authlete-go-sdk` | ✅ | ✅ builds + runs + live discovery |
| **TypeScript** | `@authlete/typescript-sdk` | ✅ | ✅ builds + runs + live discovery |
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

1. A one-command conformance runner (`check <base-url>`) that executes every skill's checklist and prints pass/fail.
2. Re-prove the token-dependent checks on a freshly generated server (using the base login driver).
3. More add-on skills: externalized login/consent, CIBA, device flow, grant management, federation.
4. Ruby/Go to parity across all add-ons; C# on SDK release.

## License

Apache-2.0. See [LICENSE](LICENSE).
