import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, Button, Banner, Divider,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { ralf } from "../lib/ralf.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return { shop: session.shop };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const res = await ralf(session.shop, "scan");
  return { queued: res.data?.queued ?? false };
};

export default function Settings() {
  const { shop } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const queued = fetcher.data?.queued;

  return (
    <Page>
      <TitleBar title="Settings" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">Connected store</Text>
              <InlineStack align="space-between"><Text as="span" tone="subdued">Store</Text><Text as="span">{shop}</Text></InlineStack>
              <Divider />
              <Text as="h3" variant="headingSm">Rescan</Text>
              <Text as="p" tone="subdued">Run a fresh AI visibility scan and site crawl now. Results update over the next few minutes.</Text>
              <InlineStack>
                <fetcher.Form method="post">
                  <Button submit loading={fetcher.state !== "idle"}>Rescan store</Button>
                </fetcher.Form>
              </InlineStack>
              {queued && <Banner tone="success">Rescan queued.</Banner>}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">Plan & billing</Text>
              <Text as="p" tone="subdued">
                You’re on the Free plan. Upgrade to unlock automated fixes, more frequent rescans, and priority support. Plans are managed by Shopify — upgrading uses your existing Shopify billing.
              </Text>
              <InlineStack>
                {/* Shopify App Pricing hosts the plan page; this link is set in the Partner Dashboard. */}
                <Button variant="primary" url="shopify://admin/charges" target="_blank">View plans</Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">Advanced features</Text>
              <Text as="p" tone="subdued">Content generation, outreach, and deeper controls live in the full Ralf platform.</Text>
              <InlineStack>
                <Button url="https://app.ralfhq.com" target="_blank">Open Ralf platform</Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
