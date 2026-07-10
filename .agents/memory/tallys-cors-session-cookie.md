---
name: Tally's CORS/session cookie config
description: Why booking/login can 401 in production for the Tally's app even with correct auth logic.
---

The Express API's CORS `origin` must exactly match the real frontend origin, or the
`secure + sameSite=none` session cookie (required in production for cross-origin
cookies) is silently dropped by the browser — every `requireAuth`-gated route then
401s even though login itself appeared to succeed.

**Why:** `app.ts` used to hardcode `process.env.CLIENT_URL ?? "http://localhost:3000"`
for CORS `origin`, independent of the smarter `CLIENT_URL -> APP_URL -> REPLIT_DEV_DOMAIN`
fallback chain already used for email links in `routes/auth.ts`. When `CLIENT_URL` was
unset in production, CORS silently locked to `localhost:3000`, breaking all cookie-based
auth (login "succeeds" client-side but the session cookie is never actually stored/sent).

**How to apply:** The fallback now lives in `artifacts/api-server/src/lib/client-url.ts`
and both `app.ts` (CORS) and `routes/auth.ts` (email links) import the same `CLIENT_URL`
constant. It also logs a startup error if running in production without `CLIENT_URL`/`APP_URL`
set. Before publishing this app, set `CLIENT_URL` (shared env var, not secret) to the real
deployed frontend origin — the fallback is a safety net, not a substitute.

## Second layer: `trust proxy` on Render (or any TLS-terminating host)

Even with CORS/CLIENT_URL correct, login can still return 200 with **no `Set-Cookie` header
at all** when the API is deployed behind a reverse proxy that terminates TLS (Render,
behind Cloudflare, etc.). `express-session`'s `cookie.secure: true` silently refuses to
issue the cookie unless Express considers the request secure — and without
`app.set("trust proxy", 1)`, `req.secure` is always `false` behind such a proxy, even
though the real connection is HTTPS.

**Symptom:** login/register return correct JSON with 200, but curl/DevTools show no
`Set-Cookie` in the response; every subsequent authenticated request 401s.

**Fix:** `app.set("trust proxy", 1)` before the session middleware, gated to production.
Diagnose by curling the live login endpoint directly (`curl -i -X POST .../login ...`)
and checking for `Set-Cookie` in the raw response — this isolates proxy/cookie issues
from frontend bugs immediately.
