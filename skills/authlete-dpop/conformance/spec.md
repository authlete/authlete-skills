# DPoP conformance checks (RFC 9449)

The stable definition. Run results go in a report, not here. The OpenID conformance suite labels these
requirements `DPOP-*`.

**You'll need:** your server's base URL, a registered client, and a way to mint a DPoP proof (use
[`../../../conformance/login-drivers/dpop-proof.mjs`](../../../conformance/login-drivers/dpop-proof.mjs)).

| # | Must do | How to check | Spec |
|---|---|---|---|
| DPOP-01 | Advertise support | discovery includes `dpop_signing_alg_values_supported` | DPOP-5.1 |
| DPOP-02 | Accept a valid proof | a PAR (or token) request with a correct proof → accepted | DPOP-4.3 |
| DPOP-03 | Reject a bad proof | a proof with the wrong URL (`htu`) → **rejected** `invalid_dpop_proof` (this proves your server forwards the proof) | DPOP-4.3 |
| DPOP-04 | Handle the nonce | if the service requires a nonce, your server returns `use_dpop_nonce` + a `DPoP-Nonce` header, and the retry succeeds | DPOP-7.1 |
| DPOP-05 | Bind the token | a token from a DPoP flow has `token_type: DPoP` and is bound to the proof's key (`jkt`) | DPOP-10 |
| DPOP-06 | Protect the resource | userinfo accepts a DPoP-bound token with a matching proof and rejects a mismatched key | DPOP-7 |

**Pass =** all six behave as described. DPOP-04/05/06 need a DPoP-bound access token, which means a
completed authorization-code login (see the base skill's conformance + the shared login driver).

### The one check that matters most (DPOP-03)

```bash
node ../../../conformance/login-drivers/dpop-proof.mjs --htu https://evil.example/par --endpoint "$BASE/oauth/par" ...
# → 400 invalid_dpop_proof   (if you get 201, your server is ignoring the proof — a real bug)
```
