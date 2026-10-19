#!/usr/bin/env node
// dpop-proof.mjs — mint a DPoP proof (RFC 9449) and send a request with it.
//
// Used by the DPoP conformance checks. The most important check is the negative one: a proof with the
// WRONG url must be rejected, which proves the server really forwards the proof to Authlete.
//
// Requires: `npm i jose` (see ../package.json).
//
// Usage:
//   node dpop-proof.mjs --endpoint http://localhost:3000/oauth/par --htu https://localhost/oauth/par \
//        --htm POST --client CID:SECRET --body "response_type=code&client_id=CID&redirect_uri=...&scope=openid"
//
// --htu is what Authlete expects (its configured endpoint URL, from discovery), which may differ from the
// socket you connect to (--endpoint). Point --htu at a wrong URL to run the negative check.

import { generateKeyPair, exportJWK, SignJWT, calculateJwkThumbprint } from "jose";

const args = Object.fromEntries(
  process.argv.slice(2).join(" ").match(/--(\w+)\s+("[^"]*"|\S+)/g)?.map(s => {
    const [k, ...v] = s.replace(/^--/, "").split(/\s+/);
    return [k, v.join(" ").replace(/^"|"$/g, "")];
  }) ?? []
);
const ENDPOINT = args.endpoint;
const HTU = args.htu || ENDPOINT;
const HTM = args.htm || "POST";
const [CID, SEC] = (args.client || "").split(":");
const log = (...a) => console.error("[dpop-proof]", ...a);
if (!ENDPOINT) { log("need --endpoint"); process.exit(2); }

// Mint the proof: a short JWT signed by a fresh key, with that key's public half in the header.
const { publicKey, privateKey } = await generateKeyPair("ES256", { extractable: true });
const jwk = await exportJWK(publicKey);
const proof = await new SignJWT({
  htu: HTU,
  htm: HTM,
  jti: Math.random().toString(36).slice(2),
  iat: Math.floor(Date.now() / 1000),
})
  .setProtectedHeader({ typ: "dpop+jwt", alg: "ES256", jwk })
  .sign(privateKey);
log("jkt (key thumbprint):", await calculateJwkThumbprint(jwk));

// Send the request with the proof.
const headers = { DPoP: proof };
if (CID && SEC) headers.authorization = "Basic " + Buffer.from(`${CID}:${SEC}`).toString("base64");
if (args.body) headers["content-type"] = "application/x-www-form-urlencoded";

const res = await fetch(ENDPOINT, { method: HTM, headers, body: args.body });
log("status:", res.status, "| DPoP-Nonce:", res.headers.get("dpop-nonce") || "(none)");
console.log(await res.text());
process.exit(0);
