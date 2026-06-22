import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";

// Expose the API key so App Bridge can boot on every page (including the
// embedded auth bounce, before any /app route renders). In local dev the
// Shopify CLI injects App Bridge for you; in production we must include it.
export const loader = async () => {
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {/* App Bridge: the meta key must come before the script. Required for
            embedded apps to complete the session-token handshake. */}
        <meta name="shopify-api-key" content={apiKey} />
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
