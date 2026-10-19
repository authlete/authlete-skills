# UserInfo conformance checks (OpenID Connect Core §5.3)

The stable definition. Run results go in a report, not here.

**You'll need:** your server's base URL and a valid access token (get one with the shared login driver).

| # | Must do | How to check | Spec |
|---|---|---|---|
| UI-01 | Advertise the endpoint | discovery includes `userinfo_endpoint` | §5.3 |
| UI-02 | Return claims | `GET /oauth/userinfo` + a valid Bearer token → **200** JSON including `sub` | §5.3.1 |
| UI-03 | Respect scope | the claims returned are limited to what the granted scopes allow | §5.3.2 |
| UI-04 | Reject bad tokens | a missing/invalid token → **401** + `WWW-Authenticate` | §5.3.1 |
| UI-05 | Accept DPoP tokens | a DPoP-bound token with a matching proof is accepted | RFC 9449 §7.2 |

**Pass =** all five behave as described. UI-05 only applies if you've added
[authlete-dpop](../../authlete-dpop/SKILL.md).

### Example

```bash
curl -i "$BASE/oauth/userinfo" -H "Authorization: Bearer $ACCESS_TOKEN"   # UI-02/03: 200 + sub
curl -i "$BASE/oauth/userinfo" -H "Authorization: Bearer not-a-token"     # UI-04: 401
```
