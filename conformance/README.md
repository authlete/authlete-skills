# Conformance

How to prove a generated server is actually correct — not just that it builds.

Each skill ships its own `conformance/spec.md`: a plain-language checklist of what that capability must
do, with the RFC/OpenID section next to each item and copy-paste commands. This folder holds the
**shared tools** those checklists use.

## The idea

A conformance check is two parts:

1. **The protocol checks** — "does `/oauth/par` return 201 with a `request_uri`?" These are the same for
   every server, in any language. They live in each skill's `conformance/spec.md`.
2. **The login driver** — the one piece that differs per server. To test anything that needs a token,
   something has to *log a user in*, and how you do that depends on how the server does login.

Keeping those two separate is the whole trick: the checks stay universal, and you swap the login driver
to match the server.

## Login drivers (`login-drivers/`)

| Driver | Use it when the server has… | How it logs in |
|---|---|---|
| `form-login.mjs` | the **base** built-in login (from `authlete-oauth-server`) | plain HTTP — fills the pinned `username`/`password`/`ticket`/`decision` form. No browser. |
| `browser-login.mjs` | an **externalized** login UI (the `external-auth` add-on) | a headless browser (Playwright) that drives the real login + consent pages. |
| `dpop-proof.mjs` | you're testing **DPoP** | mints a signed DPoP proof for a request, so you can exercise proof-bound endpoints. |

Each prints the resulting token (or proof) to stdout, so a check script can capture it.

```bash
# Base server: get a token by driving the built-in login as the seed user
node login-drivers/form-login.mjs --base "$BASE" --client "$CID:$SEC" --user demo:demo-password
```

## Coverage

| Capability | Checklist | Verified against live Authlete |
|---|---|---|
| base (core + built-in login) | yes | yes — full `authorize → token → userinfo` |
| PAR | yes | yes |
| DCR | yes | yes |
| DPoP | yes | yes (token-binding and nonce checks need a DPoP login) |
| UserInfo | yes | yes |
| Introspection | yes | yes |
| Revocation | yes | endpoint yes (the access-cutoff check needs a refresh token) |

A one-command runner that executes every checklist against a base URL is planned.
