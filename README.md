# Ralf — AI Search Visibility (Shopify app)

A Shopify-native front door to Ralf's AEO engine. It installs in one click,
pulls the store's content automatically, and shows merchants how visible they
are in AI answers (ChatGPT, Perplexity, Claude, Gemini) — all inside the
Shopify admin, built with Polaris and App Bridge.

This app is a **front door only**. All analysis runs on the existing Ralf
backend (already deployed). The app authenticates the merchant, provisions them
on Ralf at install, and renders five screens that read from the Ralf API.

---

## What's in here

```
shopify.app.toml            App config: scopes, embedded, webhooks (incl. the
                            mandatory GDPR compliance topics, pointed at Ralf).
app/shopify.server.ts       Shopify auth + session storage + afterAuth hook that
                            provisions the merchant on Ralf.
app/lib/ralf.server.ts      Client for the Ralf shopify-app-api backend.
app/routes/app._index.tsx   Screen 1 — Dashboard (score, engines, top actions).
app/routes/app.audit.tsx    Screen 2 — AI Visibility Audit.
app/routes/app.quickwins.tsx Screen 3 — Quick Wins (one-click fixes).
app/routes/app.llmstxt.tsx  Screen 4 — LLMs.txt Manager.
app/routes/app.settings.tsx Screen 5 — Settings (rescan, plan, link to Ralf).
app/routes/webhooks.app.uninstalled.tsx  Clears the session on uninstall.
prisma/schema.prisma        Session + RalfMerchant (stores the per-merchant key).
```

The Ralf backend it talks to (already live):
- `shopify-app-api` — connect / scan / score / audit / quickwins / apply-fix / llmstxt
- `shopify-gdpr-webhooks` — the three mandatory compliance webhooks (HMAC-verified)

---

## Setup (the parts that need your Partner account)

You need: a free [Shopify Partner account](https://partners.shopify.com), Node 18+,
and the Shopify CLI (`npm install -g @shopify/cli@latest`).

1. **Create the app** in the Partner Dashboard, and a development store to test on.
2. **Fill credentials.** Copy `.env.example` to `.env` and add your app's
   `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` (from the app's API credentials page).
3. **Set the two Ralf secrets on Supabase** (project: SEO Agent), under Edge
   Functions → Secrets:
   - `RALF_SHOPIFY_APP_SECRET` — any strong random string. Put the **same** value
     in this app's `.env` as `RALF_APP_SECRET`.
   - `SHOPIFY_API_SECRET` — your Shopify app's API secret key (used by the Ralf
     GDPR webhook handler to verify Shopify's signature).
4. **Install dependencies & DB:** `npm install` then `npm run setup`.
5. **Run it:** `npm run dev` — the CLI links the app, opens a tunnel, and lets you
   install it on your dev store. The app loads embedded in the Shopify admin.
6. **Deploy config** (scopes + webhooks): `npm run deploy`.

### Pricing (Shopify App Pricing)
Billing uses Shopify's hosted plan page — no billing code to maintain. Define the
plans (Free / Starter / Growth / Pro) in the Partner Dashboard under the app's
pricing section. The Settings screen's "View plans" button sends merchants there.

---

## How a merchant flows through it

1. **Install** → Shopify OAuth → `afterAuth` calls Ralf `connect`, which provisions
   an account + site + subscription and kicks off the first scan. The returned
   per-merchant API key is stored locally (RalfMerchant).
2. **Dashboard** shows the AI visibility score, which engines cite the store, and
   the top 3 priority actions (with a "first scan running" state until results land).
3. **Audit / Quick Wins / LLMs.txt** read live data from Ralf; Quick Wins can
   generate the LLMs.txt artifact in one click.
4. **Uninstall / GDPR** → Shopify's compliance webhooks hit the Ralf handler, which
   verifies the signature and deletes the store's data on `shop/redact`.

---

## Notes
- Built on the official `@shopify/shopify-app-remix` template conventions, so the
  Shopify CLI (`shopify app dev` / `deploy`) works as documented.
- Dev uses SQLite for sessions. For production, switch `prisma/schema.prisma`
  provider to `postgresql` and point `DATABASE_URL` at hosted Postgres.
- Scopes are read-only (`read_products,read_content,read_themes`). Applying fixes
  is returned as content/guidance for now; a write flow can be added later behind
  an explicit opt-in.
