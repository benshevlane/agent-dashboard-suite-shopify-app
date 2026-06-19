// =============================================================================
// Ralf backend client
// =============================================================================
// Thin server-side wrapper around the deployed Ralf `shopify-app-api`. The app
// stores nothing locally: the per-merchant API key is fetched from Ralf by shop
// (cached for the lifetime of a warm serverless instance).
// =============================================================================

import type { Session } from "@shopify/shopify-app-remix/server";

const RALF_API_BASE =
  process.env.RALF_API_BASE ??
  "https://ewkrubluzctsfnkxnmsj.supabase.co/functions/v1/shopify-app-api";
const RALF_APP_SECRET = process.env.RALF_APP_SECRET ?? "";

type AdminLike = { graphql: (q: string, opts?: any) => Promise<Response> };

// shop -> ralf api key (warm-instance cache)
const keyCache = new Map<string, string>();

async function appCall(action: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${RALF_API_BASE}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-ralf-app-secret": RALF_APP_SECRET },
    body: JSON.stringify(body),
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* ignore */ }
  return { ok: res.ok, status: res.status, data };
}

// --- Install-time provisioning ---------------------------------------------

const SHOP_CONTEXT_QUERY = `#graphql
  query ShopContext {
    shop {
      name
      email
      ianaTimezone
      primaryDomain { host }
      currencyCode
      billingAddress { countryCodeV2 }
    }
    products(first: 25) { edges { node { productType } } }
  }`;

export async function connectMerchant(session: Session, admin: AdminLike) {
  let ctx: Record<string, any> = {};
  try {
    const res = await admin.graphql(SHOP_CONTEXT_QUERY);
    const body = await res.json();
    const shop = body?.data?.shop ?? {};
    const productTypes = Array.from(
      new Set(
        (body?.data?.products?.edges ?? [])
          .map((e: any) => (e?.node?.productType ?? "").trim())
          .filter(Boolean),
      ),
    ).slice(0, 8);
    ctx = {
      shop_name: shop.name,
      shop_email: shop.email,
      storefront_domain: shop.primaryDomain?.host ?? session.shop.replace(/\.myshopify\.com$/, ""),
      country_code: shop.billingAddress?.countryCodeV2 ?? null,
      currency: shop.currencyCode ?? null,
      iana_timezone: shop.ianaTimezone ?? null,
      store_context: { product_types: productTypes },
    };
  } catch (err) {
    console.error("[connectMerchant] shop context query failed:", err);
  }

  const { ok, status, data } = await appCall("connect", {
    shop_domain: session.shop,
    storefront_domain: ctx.storefront_domain ?? session.shop,
    shop_name: ctx.shop_name ?? session.shop,
    shop_email: ctx.shop_email ?? undefined,
    country_code: ctx.country_code ?? undefined,
    currency: ctx.currency ?? undefined,
    iana_timezone: ctx.iana_timezone ?? undefined,
    access_token: session.accessToken ?? undefined,
    store_context: ctx.store_context ?? {},
  });
  if (!ok) throw new Error(`Ralf connect ${status}`);
  if (data?.api_key) keyCache.set(session.shop, data.api_key);
  return data;
}

// --- Per-screen calls --------------------------------------------------------

async function apiKeyFor(shop: string): Promise<string | null> {
  const cached = keyCache.get(shop);
  if (cached) return cached;
  const { ok, data } = await appCall("get-key", { shop });
  if (ok && data?.api_key) {
    keyCache.set(shop, data.api_key);
    return data.api_key;
  }
  return null;
}

/**
 * Call a Ralf merchant action for the given shop. `notConnected` is true when
 * the merchant has no key yet (install still completing), so screens can show a
 * friendly "setting up" state.
 */
export async function ralf(
  shop: string,
  action: string,
  opts: { body?: Record<string, any> } = {},
): Promise<{ ok: boolean; status: number; data: any; notConnected?: boolean }> {
  const key = await apiKeyFor(shop);
  if (!key) return { ok: false, status: 409, data: null, notConnected: true };
  const res = await fetch(`${RALF_API_BASE}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-ralf-api-key": key },
    body: JSON.stringify(opts.body ?? {}),
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* ignore */ }
  return { ok: res.ok, status: res.status, data };
}
