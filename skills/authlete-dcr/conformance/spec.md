# Dynamic Client Registration conformance checks (RFC 7591 / 7592)

The stable definition of a correct registration endpoint. Run results go in a report, not here.

**You'll need:** your server's base URL. Everything else (a client to manage) is created by the first
check, so there are no prerequisites.

| # | Must do | How to check | Spec |
|---|---|---|---|
| DCR-01 | Advertise the endpoint | discovery includes `registration_endpoint` | RFC 7591 §3.1 |
| DCR-02 | Register a client | valid metadata → **201** with `client_id`, `registration_access_token`, `registration_client_uri` (and `client_secret` if confidential) | RFC 7591 §3.2.1 |
| DCR-03 | Reject bad metadata | e.g. a malformed `redirect_uris` → **400** `invalid_client_metadata` / `invalid_redirect_uri` | RFC 7591 §3.2.2 |
| DCR-04 | Read a registration | `GET /api/register/:id` + the registration access token → **200** | RFC 7592 §2.1 |
| DCR-05 | Update a registration | `PUT` + token + new metadata → **200** | RFC 7592 §2.2 |
| DCR-06 | Delete a registration | `DELETE` + token → **204**, no body | RFC 7592 §2.3 |
| DCR-07 | Protect management | a wrong/missing registration access token → **401** | RFC 7592 §3 |

**Pass =** all seven behave as described.

### Example

```bash
# DCR-02 — register, capture the id and management token
REG=$(curl -s -X POST "$BASE/api/register" -H 'Content-Type: application/json' \
  -d '{"redirect_uris":["https://example.org/cb"],"token_endpoint_auth_method":"client_secret_basic"}')
ID=$(echo "$REG" | python3 -c 'import json,sys;print(json.load(sys.stdin)["client_id"])')
RAT=$(echo "$REG" | python3 -c 'import json,sys;print(json.load(sys.stdin)["registration_access_token"])')
# DCR-04 / DCR-07
curl -i "$BASE/api/register/$ID" -H "Authorization: Bearer $RAT"      # 200
curl -i "$BASE/api/register/$ID" -H "Authorization: Bearer wrong"     # 401
# DCR-06
curl -i -X DELETE "$BASE/api/register/$ID" -H "Authorization: Bearer $RAT"  # 204
```
