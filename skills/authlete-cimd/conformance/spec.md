# CIMD conformance checks

The stable list of what a server with CIMD must do. It is the definition — run results go in a report,
never in this file.

**You'll need:** your server's base URL; the Authlete service ID and Service Access Token (for the
two checks that read Authlete directly); the base server's seed user (`demo` / `demo-password`); and the
public test client `https://makeclient.dev/oauth/client-metadata.json` on the service's allowlist. Its
document lists the redirect URI `http://localhost:5173/callback`, the grant types `authorization_code`,
`refresh_token` and `device_code`, and `token_endpoint_auth_method: none`. Nothing needs to listen on
the redirect URI.

Specs: CIMD is `draft-ietf-oauth-client-id-metadata-document`; the other checks cite the RFC they test.

## Advertise

| # | Must do | How to check | Spec |
|---|---|---|---|
| CIMD-01 | Advertise CIMD | discovery has `client_id_metadata_document_supported: true` | CIMD, RFC 8414 |
| CIMD-02 | Advertise the auth methods CIMD clients use, and PKCE | discovery's `token_endpoint_auth_methods_supported` includes `none` (and `private_key_jwt` if allowed clients sign), and `code_challenge_methods_supported` includes `S256` | RFC 8414, RFC 7636 |

## Accept a URL client

| # | Must do | How to check | Spec |
|---|---|---|---|
| CIMD-03 | Accept an unregistered URL client | `GET /oauth/authorize` with the test client's URL as `client_id`, its redirect URI and an S256 challenge → **200** login page, not an error | CIMD |
| CIMD-04 | Register it from the document | after CIMD-03, the service has a client with `clientSource: METADATA_DOCUMENT` named "makeclient test client" | CIMD |
| CIMD-05 | Issue a token with no secret | log in as the seed user and approve → **302** to the redirect URI with a `code`; `POST /oauth/token` with `client_id` (the URL), `code`, `redirect_uri` and `code_verifier`, no secret → **200** with `access_token` | CIMD, RFC 6749 §4.1 |
| CIMD-06 | Name the client on its tokens | Authlete introspection of that token → `action: OK`, `metadataDocumentLocation` = the test client's URL | CIMD |

## Reject

| # | Must do | How to check | Spec |
|---|---|---|---|
| CIMD-07 | Reject an unlisted redirect URI | CIMD-03 with `redirect_uri=https://example.com/cb` → **400**, not a redirect; Authlete's message is `[A011317]` | RFC 6749 §3.1.2 |
| CIMD-08 | Reject a URL not on the allowlist | CIMD-03 with a client URL not in `cimdAllowlist` → **400**, not a login page | CIMD |
| CIMD-09 | Require PKCE | CIMD-03 without `code_challenge` → error, not a login page | RFC 7636, RFC 9700 §2.1.1 |
| CIMD-10 | Bind the code to the verifier | CIMD-05's token request with a wrong `code_verifier` → **400** (`[A050315]`) | RFC 7636 §4.6 |
| CIMD-11 | Use codes once | repeating CIMD-05's token request → **400** (`[A050305]`) | RFC 6749 §4.1.2 |

## MCP servers (only if Step 3 applies)

| # | Must do | How to check | Spec |
|---|---|---|---|
| MCP-01 | Publish protected resource metadata | `GET /.well-known/oauth-protected-resource` (and `/<path>` for a path endpoint) → JSON whose `authorization_servers` holds the service's `issuer` | RFC 9728 |
| MCP-02 | Reject a missing token, and point at the metadata | a request to the MCP endpoint with no token → **401**. Recommended: a `WWW-Authenticate: Bearer resource_metadata="…"` header. The MCP spec requires this header or MCP-01's well-known URI; MCP-01 is required here, so the header is advisory | RFC 9728 §5.1, MCP |
| MCP-03 | Accept a valid token | the CIMD-05 token (with scope `mcp:tools`) → the request succeeds | MCP |
| MCP-04 | Reject a token for another server | a token whose resource is another URL → **401** or **403** (`[A286303]`) | RFC 8707, RFC 9700 §2.3 |
| MCP-05 | Reject a made-up token | `Authorization: Bearer nonsense` → **401** (`[A057302]`) | RFC 6750 |

**Pass =** every check behaves as described; the `WWW-Authenticate` header in MCP-02 is advisory. CIMD-07 to CIMD-11 are enforced by Authlete; your
server's job is to surface the rejection faithfully. The Authlete result codes in brackets are for
diagnosis: servers return `responseContent`, not the code.

### Example: CIMD-03 to CIMD-06 against the base server, with curl

```bash
CLIENT_ID=$(jq -rn '"https://makeclient.dev/oauth/client-metadata.json"|@uri')
REDIRECT=$(jq -rn '"http://localhost:5173/callback"|@uri')
VERIFIER=$(openssl rand -base64 48 | tr '+/' '-_' | tr -d '=')
CHALLENGE=$(printf %s "$VERIFIER" | openssl dgst -sha256 -binary | openssl base64 -A | tr '+/' '-_' | tr -d '=')

# CIMD-03: the login page, with its ticket
TICKET=$(curl -s "$BASE/oauth/authorize?response_type=code&client_id=$CLIENT_ID&redirect_uri=$REDIRECT&code_challenge=$CHALLENGE&code_challenge_method=S256&state=s" \
  | sed -nE 's/.*name="ticket"[^>]*value="([^"]+)".*/\1/p' | head -1)

# CIMD-05: approve as the seed user, take the code from the redirect, exchange it with no secret
CODE=$(curl -s -o /dev/null -w '%{redirect_url}' -X POST "$BASE/oauth/authorize/decision" \
  -d "username=demo&password=demo-password&decision=approve&ticket=$TICKET" \
  | sed -E 's/.*[?&]code=([^&]+).*/\1/')
ACCESS_TOKEN=$(curl -s -X POST "$BASE/oauth/token" \
  -d "grant_type=authorization_code&code=$CODE&redirect_uri=$REDIRECT&client_id=$CLIENT_ID&code_verifier=$VERIFIER" \
  | jq -r .access_token)

# CIMD-04 and CIMD-06: ask Authlete directly
curl -s "$AUTHLETE_BASE_URL/api/$AUTHLETE_SERVICE_ID/auth/introspection" \
  -H "Authorization: Bearer $AUTHLETE_SERVICE_ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d "$(jq -n --arg t "$ACCESS_TOKEN" '{token: $t}')" | jq '{action, metadataDocumentLocation}'
```

The shared [`form-login.mjs`](../../../conformance/login-drivers/form-login.mjs) driver cannot run
these yet: it assumes a confidential client with a secret and no PKCE. A public-client mode
(`--client <URL>` with no secret, plus a generated PKCE pair) would let it drive CIMD-05.
