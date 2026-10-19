# SDK method map

The contract names ops conceptually (`authorization`, `token`, `userinfo`, service JWKS, …). Here are the
real per-SDK method names. `serviceId` and the request payload are passed per call.

**Go (`authlete-go-sdk`):** client `authlete.New(WithSecurity(token), WithServerURL(AUTHLETE_BASE_URL))` —
`WithServerURL` required or it defaults to the US cluster. `Authorization.ProcessRequest` / `.Issue` / `.Fail`;
`Token.Process`; `Userinfo.Process` / `.Issue`; `Service.GetConfiguration`; service JWKS: `Service.Get` returns the
service carrying a `.Jwks` string (there is no dedicated JWKS method — return that string, or `{"keys":[]}`). The base
server needs no JWK/JWT library; add one (`lestrrat-go/jwx`, current) only in a later skill that signs or verifies JWTs locally.

**TypeScript (`@authlete/typescript-sdk`):** client `new Authlete({ bearer, serverURL })` from the root export —
`serverURL` required or it defaults to the US cluster. Each call takes `{ serviceId, <name>Request: {…} }` (the
payload is wrapped in a named field). `authorization.processRequest` / `authorization.issue` / `authorization.fail`;
`token.process`; `userinfo.process` / `userinfo.issue`; `service.getConfiguration`; service JWKS: `service.get()` returns
the service carrying a `.jwks` string (same shape as Go/Ruby). In `@authlete/typescript-sdk` v2.x there is NO `jwkSetEndpoint`
accessor — serve that string as-is, or `{"keys":[]}`. (Note: authorization uses `processRequest`; token/userinfo use `process`.)
The base server needs no JWK/JWT library; add one (`jose`) only in a later skill that signs or verifies JWTs locally.

**Ruby (`authlete_ruby_sdk`, requires Ruby >= 3.2):** client `::Authlete::Client.new(bearer: token, server_url: AUTHLETE_BASE_URL)`
— `server_url` required; do NOT append `/api` (the SDK adds it). `service_id` is the service's `api_key` value, passed per call
as the `service_id:` keyword; each call takes a wrapped request keyword (e.g. `authorization_request:`). Methods are snake_case
and the names differ from Go/TS: `client.authorization.process_request` / `.issue_response` / `.fail_request`;
`client.tokens.process_request` (sub-SDK is `tokens`, plural); `client.userinfo.process_request` / `.issue_response`;
discovery is `client.services.configuration` (NOT `get_configuration`); service JWKS is `client.jwk_set_endpoint.service_jwks_get_api`
— serve the returned set as-is. The base server needs no JWK/JWT library; add one only in a later skill that signs or verifies JWTs locally.
