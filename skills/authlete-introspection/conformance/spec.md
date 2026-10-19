# Token Introspection conformance checks (RFC 7662)

The stable definition. Run results go in a report, not here.

**You'll need:** your server's base URL, caller (client) credentials, and a valid access token.

| # | Must do | How to check | Spec |
|---|---|---|---|
| IN-01 | Report an active token | authenticated caller + a valid token → **200** `{active:true}` + metadata (scope, sub, …) | §2.1 |
| IN-02 | Handle unknown tokens | an invalid/unknown token → **200** `{active:false}` (not an error) | §2.2 |
| IN-03 | Protect the endpoint | a caller with no/invalid auth → **401** | §2.1 |

**Pass =** all three behave as described.

### Example

```bash
curl -i -u "$CID:$SEC" -X POST "$BASE/oauth/introspect" -d "token=$ACCESS_TOKEN"   # IN-01: 200 active:true
curl -i -u "$CID:$SEC" -X POST "$BASE/oauth/introspect" -d "token=bogus"           # IN-02: 200 active:false
curl -i          -X POST "$BASE/oauth/introspect" -d "token=$ACCESS_TOKEN"         # IN-03: 401
```
