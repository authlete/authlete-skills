# Base server conformance checks

The stable definition of what the base `authlete-oauth-server` must do: the OAuth/OIDC core plus the
built-in login. Run results go in a report, not here.

**You'll need:** your server's base URL, a registered confidential client, and the built-in **seed user**
the skill pins: username `demo`, password `demo-password`.

## Discovery & metadata

| # | Must do | How to check |
|---|---|---|
| CORE-01 | Serve discovery | `GET /.well-known/openid-configuration` and `/oauth-authorization-server` → the live Authlete metadata, verbatim |
| CORE-02 | Serve JWKS | `GET /oauth/jwks` → the service's public keys (or `{"keys":[]}`) |
| CORE-03 | Be alive | `GET /health` → 200; `GET /` → 302 to the metadata |

## The built-in login (pinned contract)

The base login is a **fixed contract** so it can be driven without reading the generated code:

| # | Must do | How to check |
|---|---|---|
| LOGIN-01 | Show one combined page | `GET /oauth/authorize?...` → **200** HTML, a single form posting to `/oauth/authorize/decision` with fields `username`, `password`, `ticket` (hidden), `decision` (`approve`/`deny`) |
| LOGIN-02 | Authenticate the seed user | posting `username=demo&password=demo-password&decision=approve` + the ticket → **302** back to the client with a `code` |
| LOGIN-03 | Reject bad credentials / deny | wrong password, or `decision=deny` → the flow ends in an `access_denied` error redirect, not a code |

## The full round-trip

| # | Must do | How to check |
|---|---|---|
| FLOW-01 | Issue a token | exchange the `code` at `POST /oauth/token` → **200** with `access_token` (+ `id_token` for `openid`) |
| FLOW-02 | Return claims | `GET /oauth/userinfo` with that token → **200** including `sub` |
| FLOW-03 | Reject bad client auth at token | wrong client secret → **401** |

**Pass =** every check behaves as described. The whole flow is automatable with
[`../../../conformance/login-drivers/form-login.mjs`](../../../conformance/login-drivers/form-login.mjs),
which drives exactly the pinned form above.
