#!/usr/bin/env node
// browser-login.mjs — log in against an EXTERNALIZED login UI and print a token.
//
// Use this when the server uses the `external-auth` add-on (a separate login + consent web app) instead
// of the base built-in form. It drives the real pages with a headless browser, then exchanges the code.
//
// Requires: `npm i playwright && npx playwright install chromium` (see ../package.json).
//
// Usage:
//   node browser-login.mjs --base http://localhost:3000 --client CID:SECRET \
//        --user alice@example.com:password [--redirect https://example.org/cb] [--scope openid]
//
// Prints the token response JSON to stdout; progress to stderr.

import { chromium } from "playwright";

const args = Object.fromEntries(
  process.argv.slice(2).join(" ").match(/--(\w+)\s+(\S+)/g)?.map(s => s.replace(/^--/, "").split(/\s+/)) ?? []
);
const BASE = args.base || "http://localhost:3000";
const [CID, SEC] = (args.client || "").split(":");
const [USER, PASS] = (args.user || "").split(":");
const REDIRECT = args.redirect || "https://example.org/cb";
const SCOPE = args.scope || "openid";
const log = (...a) => console.error("[browser-login]", ...a);
if (!CID || !SEC || !USER) { log("need --client CID:SECRET and --user user:pass"); process.exit(2); }

const authorizeUrl = `${BASE}/oauth/authorize?response_type=code&client_id=${CID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT)}&scope=${encodeURIComponent(SCOPE)}&state=browser-login`;

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ ignoreHTTPSErrors: true })).newPage();
let code = null;
try {
  await page.goto(authorizeUrl, { waitUntil: "domcontentloaded" });
  // Sign in.
  await page.waitForSelector('input[name="email"], input[name="username"]', { timeout: 15000 });
  await page.fill('input[name="email"], input[name="username"]', USER);
  await page.fill('input[name="password"]', PASS);
  // IMPORTANT: a single, deterministic submit. Double-submitting can auto-deny the consent screen.
  const submit = page.locator('button[type="submit"]').first();
  (await submit.count()) ? await submit.click() : await page.keyboard.press("Enter");
  // Walk login → consent → redirect, only ever clicking an explicit Approve/Allow.
  for (let i = 0; i < 8 && !code; i++) {
    try { await page.waitForLoadState("networkidle", { timeout: 8000 }); } catch {}
    if (page.url().includes(new URL(REDIRECT).host)) { code = new URL(page.url()).searchParams.get("code"); break; }
    const approve = page.getByRole("button", { name: /^(allow|authori[sz]e|approve|grant|accept|confirm|continue)$/i }).first();
    if (await approve.count().catch(() => 0)) {
      await approve.click().catch(() => {});
      await page.waitForURL(u => u.toString() !== page.url(), { timeout: 8000 }).catch(() => {});
    } else break;
  }
} finally {
  await browser.close();
}
if (!code) { log("no code captured — check the login/consent selectors for this UI"); process.exit(1); }
log("logged in as", USER, "→ got code");

const token = await fetch(`${BASE}/oauth/token`, {
  method: "POST",
  headers: {
    "content-type": "application/x-www-form-urlencoded",
    authorization: "Basic " + Buffer.from(`${CID}:${SEC}`).toString("base64"),
  },
  body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT }),
});
console.log(JSON.stringify(await token.json(), null, 2));
process.exit(token.ok ? 0 : 1);
