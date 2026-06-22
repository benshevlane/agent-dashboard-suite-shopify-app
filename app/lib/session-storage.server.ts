// =============================================================================
// RalfSessionStorage
// =============================================================================
// A @shopify/shopify-app session storage backed by the Ralf backend over HTTP,
// so the Remix app keeps NO database of its own and runs cleanly on Vercel's
// serverless platform. All calls are authenticated with the shared app secret.
// =============================================================================

import { Session } from "@shopify/shopify-app-remix/server";
import type { SessionStorage } from "@shopify/shopify-app-session-storage";

const RALF_API_BASE =
  process.env.RALF_API_BASE ??
  "https://ewkrubluzctsfnkxnmsj.supabase.co/functions/v1/shopify-app-api";
const RALF_APP_SECRET = process.env.RALF_APP_SECRET ?? "";

async function call(action: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${RALF_API_BASE}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-ralf-app-secret": RALF_APP_SECRET },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Ralf ${action} ${res.status}: ${await res.text()}`);
  return res.json();
}

function fromObject(o: any): Session {
  return new Session({ ...o, expires: o?.expires ? new Date(o.expires) : undefined });
}

export class RalfSessionStorage implements SessionStorage {
  async storeSession(session: Session): Promise<boolean> {
    await call("session-store", { session: session.toObject() });
    return true;
  }
  async loadSession(id: string): Promise<Session | undefined> {
    const r = await call("session-load", { id });
    return r?.session ? fromObject(r.session) : undefined;
  }
  async deleteSession(id: string): Promise<boolean> {
    await call("session-delete", { id });
    return true;
  }
  async deleteSessions(ids: string[]): Promise<boolean> {
    await call("session-delete-batch", { ids });
    return true;
  }
  async findSessionsByShop(shop: string): Promise<Session[]> {
    const r = await call("session-find", { shop });
    return (r?.sessions ?? []).map(fromObject);
  }
}
