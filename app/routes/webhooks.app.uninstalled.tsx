import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { RalfSessionStorage } from "../lib/session-storage.server";

// Shopify verifies the HMAC via authenticate.webhook. On uninstall we clear the
// shop's stored sessions. (The Ralf backend also receives app/uninstalled +
// shop/redact and handles data deletion on its side.)
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  try {
    const storage = new RalfSessionStorage();
    const sessions = await storage.findSessionsByShop(shop);
    if (sessions.length) await storage.deleteSessions(sessions.map((s) => s.id));
  } catch (err) {
    console.error("[uninstalled] session cleanup failed:", err);
  }
  return new Response();
};
