import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Shopify verifies the HMAC for us via authenticate.webhook. On uninstall we
// clear local sessions. (The Ralf backend also receives app/uninstalled +
// shop/redact and handles data deletion on its side.)
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  if (session) {
    await prisma.session.deleteMany({ where: { shop } });
  }
  return new Response();
};
