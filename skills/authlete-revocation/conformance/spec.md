# Token Revocation conformance checks (RFC 7009)

The stable definition. Run results go in a report, not here.

**You'll need:** your server's base URL, client credentials, and a token to revoke.

| # | Must do | How to check | Spec |
|---|---|---|---|
| RV-01 | Revoke a token | authenticated client + a `token` → **200** (empty body) | §2.1 |
| RV-02 | Forgive unknown tokens | an unknown token → **200** (don't reveal validity) | §2.1 |
| RV-03 | Protect the endpoint | missing/invalid client auth → **401** | §2.1 |
| RV-04 | Actually cut off access | after revoking a **refresh token**, it can no longer mint access tokens | §2.1 |

**Pass =** all four behave as described.

> **About RV-04 and JWT access tokens.** Use a *refresh* token here, not a JWT access token. A JWT access
> token stays valid until it expires no matter what, so revoking it returns 200 but introspection/userinfo
> still accept it — that's expected, not a failure. Request `offline_access` to get a refresh token to test
> the real cut-off.

### Example

```bash
curl -i -u "$CID:$SEC" -X POST "$BASE/oauth/revoke" -d "token=$TOKEN"   # RV-01: 200
curl -i          -X POST "$BASE/oauth/revoke" -d "token=$TOKEN"         # RV-03: 401
```
