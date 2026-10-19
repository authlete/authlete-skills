# Endpoint contract (language-neutral)

## Handler shape — every endpoint
Thin. Extract the raw request (query/form params + any auth header) → forward to the Authlete method →
write the response directly from the `action` and `responseContent`. Keep it terse; a few lines per
handler is fine. No protocol decisions in the server. Each endpoint is its own file, so endpoints can be
added without touching existing ones.

## Base endpoints
| Method / Path | Authlete call | Dispatch |
|---|---|---|
| `GET/POST /oauth/authorize` | `authorization` | `INTERACTION`/`NO_INTERACTION` → run the login + consent steps (below); `LOCATION`→302; `BAD_REQUEST`→400; `INTERNAL_SERVER_ERROR`→500. |
| `POST /oauth/authorize/decision` | `authorization/issue` (approved) or `authorization/fail` (denied → reason `DENIED`; failed login → `NOT_AUTHENTICATED`) | Combined login+consent form submits here; on success issue with the `subject` + granted scopes, else fail. |
| `POST /oauth/token` | `token` | `OK`→200; `INVALID_CLIENT`→401 (Basic challenge); `BAD_REQUEST`→400. |
| `GET/POST /oauth/userinfo` | `userinfo` then `userinfo/issue` | Return JSON or JWT per action; claims come from the identity source (below). |
| `GET /oauth/jwks` | service JWKS (see sdk-notes) | Return the service's JWK Set from the SDK as-is, or `{"keys":[]}`. No local key handling. |
| `GET /.well-known/openid-configuration` and `/.well-known/oauth-authorization-server` | `service getConfiguration` | Serve exactly what Authlete returns — don't add or reshape fields. (Some SDKs parse it to an object; re-serialize it unchanged.) |
| `GET /health` | — | liveness |
| `GET /` | — | redirect to `/.well-known/oauth-authorization-server` (the AS metadata) |

## The two replaceable steps (the only real seam)
The authorize flow calls two steps for the decisions Authlete delegates to you. Keep each in its **own
module** with a stable input/output; the base implements them inline, and a later skill replaces one
**without touching the endpoints**.

- **login step** — in: the auth-request context. out: an authenticated `subject` (+ `authTime`, optional `acr`/`amr`).
  Base: render a simple login form, verify against the identity source. `external-auth` replaces this module with redirect-to-external-UI + callback.
- **consent step** — in: requested scopes/claims (+ any already-granted). out: the granted scopes (or denial).
  Base: render a simple consent form. `external-consent` replaces this module with redirect-to-external-UI + callback.

**Identity source** — one small module: a credential check + claim lookup. Base: an in-config user list. **Seed it with one
documented dev user so the built-in login is reproducible and automatable** — a conformance harness must be able to drive
login without reading the generated code. Pin, don't invent:

- Seed user: username `demo`, password `demo-password`, subject `demo-user`, claims `{ name: "Demo User",
  email: "demo@example.com", email_verified: true }`. (Add more only if asked.)
- Login/consent form contract (fixed, not an example): `GET /oauth/authorize` renders one combined login+consent page
  (200 on INTERACTION) that `POST`s to `/oauth/authorize/decision` with fields `username`, `password`, the Authlete
  `ticket` (hidden), and `decision` = `approve` | `deny`. Do not rename these fields.

Both the login step and `userinfo` read from it. (This is the single narrow interface the beacon proves
is the real axis of change — implement it as a few functions, not a framework.)

## Increment shape
- **This skill (base):** all of the above, steps inline — one complete simple server.
- **`external-auth`:** replaces the login-step module only.
- **`external-consent`:** replaces the consent-step module only.
- **more endpoints** (par, introspection, revocation, dynamic registration, grant management, federation): each adds one endpoint file following the handler shape; nothing existing changes.

## Invariants
- Authlete owns the protocol; the server forwards raw params and acts on the response. Never re-implement protocol.
- No per-transaction state in the server — carry cross-step state on the Authlete ticket, not a local session. Base: one combined login+consent form (stateless). `external-auth` carries the subject across its redirect on the ticket.

## Wiring
Enable CORS on the browser-facing endpoints (`/oauth/*`, `/.well-known/*`).
