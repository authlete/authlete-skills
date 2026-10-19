# PAR conformance checks (RFC 9126)

This is the stable list of what a correct PAR endpoint must do. It's the *definition* — run results go
elsewhere (a report), never in this file.

**You'll need:** your server's base URL, and a registered confidential client (`client_id` +
`client_secret`). The `request_uri` round-trip checks also need the browser authorize step.

Each requirement cites its RFC 9126 section (the OpenID conformance suite uses the same `PAR-*` labels).

| # | Must do | How to check | Spec |
|---|---|---|---|
| PAR-01 | Advertise the endpoint | discovery includes `pushed_authorization_request_endpoint` | PAR-5 |
| PAR-02 | Accept a valid push | `POST /oauth/par` with client auth + a valid authz request → **201** with `request_uri` and `expires_in > 0` | PAR-2.2 |
| PAR-03 | Return a proper `request_uri` | it's the absolute `urn:ietf:params:oauth:request_uri:…` form | PAR-2.2 |
| PAR-04 | Reject bad client auth | wrong/missing credentials → **401** + `WWW-Authenticate` + `error: invalid_client` | PAR-2.3 |
| PAR-05 | Reject `request_uri` in the body | a PAR request that itself contains `request_uri` → **400** `invalid_request` | PAR-2.1 |
| PAR-06 | Use JSON | success response is `Content-Type: application/json` | PAR-2.2 |
| PAR-07 | Accept the round-trip | `/oauth/authorize?client_id=…&request_uri=…` is accepted (reaches login, not an error) | PAR-4 |
| PAR-08 | One-time use | reusing a `request_uri` is rejected | PAR-2.4 |
| PAR-09 | Honor expiry | a `request_uri` used after `expires_in` is rejected | PAR-2.2 |
| PAR-10 | Bind to the client | client B presenting client A's `request_uri` is rejected | PAR-2.3 |

**Pass =** every FAILURE-level check (all but none here are advisory) behaves as described. PAR-08/09/10
are enforced by Authlete; your server's job is just to surface the rejection faithfully.

### Example: the first six, with curl

```bash
# PAR-01
curl -s "$BASE/.well-known/oauth-authorization-server" | grep pushed_authorization_request_endpoint
# PAR-02/03/06
curl -i -u "$CID:$SEC" -X POST "$BASE/oauth/par" \
  -d "response_type=code&client_id=$CID&redirect_uri=$REDIRECT&scope=openid&state=s"
# PAR-04
curl -i -u "$CID:wrong" -X POST "$BASE/oauth/par" -d "response_type=code&client_id=$CID&redirect_uri=$REDIRECT&scope=openid"
# PAR-05
curl -i -u "$CID:$SEC" -X POST "$BASE/oauth/par" -d "client_id=$CID&request_uri=urn:bogus"
```
