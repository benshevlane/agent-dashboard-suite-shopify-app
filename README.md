# ⚠️ DEPRECATED — do not use

This repository was the original standalone Shopify app (Remix scaffold). It is **no longer used**.

The Ralf Shopify App now runs the **real Ralf application** embedded inside the Shopify admin —
there is no separate Shopify codebase. All Shopify functionality lives in the main app repo:

➡️ **benshevlane/agent-dashboard-suite**

- Embedded entry: `src/pages/ShopifyEntry.tsx` (route `/shopify`)
- Billing UI: `src/components/billing/ShopifyPlans.tsx`
- Backend (Supabase edge functions): `shopify-app-api`, `shopify-app-sso`, `shopify-billing`,
  `shopify-billing-webhook`, `shopify-gdpr-webhooks`

Keep all Shopify work in the main repo. This repo is kept only for history.
