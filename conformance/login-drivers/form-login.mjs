#!/usr/bin/env node
// form-login.mjs — log in against the BASE server's built-in login and print a token.
//
// The base `authlete-oauth-server` renders one combined login+consent form (pinned contract:
// username / password / ticket / decision). This driver fills it over plain HTTP — no browser — and
// exchanges the resulting code for a token. Use it to test anything that needs an access token.
//
// Usage:
//   node form-login.mjs --base http://localhost:3000 --client CID:SECRET \
//        --user demo:demo-password [--redirect https://example.org/cb] [--scope openid]
//
// Prints the token response JSON to stdout; progress to stderr.

const args = Object.fromEntries(
  process.argv.slice(2).join(" ").match(/--(\w+)\s+(\S+)/g)?.map(s => s.replace(/^--/, "").split(/\s+/)) ?? []
);
const BASE = args.base || "http://localhost:3000";
const [CID, SEC] = (args.client || "").split(":");
const [USER, PASS] = (args.user || "demo:demo-password").split(":");
const REDIRECT = args.redirect || "https://example.org/cb";
const SCOPE = args.scope || "openid";
const log = (...a) => console.error("[form-login]", ...a);
if (!CID || !SEC) { log("need --client CID:SECRET"); process.exit(2); }

// 1. Ask for authorization — the server replies with the built-in login+consent HTML (+ a ticket).
const authorizeUrl = `${BASE}/oauth/authorize?response_type=code&client_id=${CID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT)}&scope=${encodeURIComponent(SCOPE)}&state=form-login`;
const html = await (await fetch(authorizeUrl)).text();
const ticket = html.match(/name="ticket"[^>]*value="([^"]+)"/)?.[1];
if (!ticket) { log("no ticket in the login page — is this the base built-in login?"); process.exit(1); }

// 2. Submit the form as the seed user, approving. The server redirects back with a code.
const form = new URLSearchParams({ username: USER, password: PASS, ticket, decision: "approve" });
const decision = await fetch(`${BASE}/oauth/authorize/decision`, {
  method: "POST", redirect: "manual",
  headers: { "content-type": "application/x-www-form-urlencoded" }, body: form,
});
const location = decision.headers.get("location") || "";
const code = new URLSearchParams(location.split("?")[1] || "").get("code");
if (!code) { log("no code — login failed. redirect was:", location.slice(0, 120)); process.exit(1); }
log("logged in as", USER, "→ got code");

// 3. Exchange the code for tokens (confidential client, HTTP Basic).
const token = await fetch(`${BASE}/oauth/token`, {
  method: "POST",
  headers: {
    "content-type": "application/x-www-form-urlencoded",
    authorization: "Basic " + Buffer.from(`${CID}:${SEC}`).toString("base64"),
  },
  body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT }),
});
const json = await token.json();
log("token endpoint:", token.status);
console.log(JSON.stringify(json, null, 2));
process.exit(token.ok ? 0 : 1);
