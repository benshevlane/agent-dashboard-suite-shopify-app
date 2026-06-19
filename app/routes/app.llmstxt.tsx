import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, Badge, Button,
  TextField, Banner, Box,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { ralf } from "../lib/ralf.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const res = await ralf(session.shop, "llmstxt");
  return { notConnected: res.notConnected ?? false, data: res.data };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const res = await ralf(session.shop, "llmstxt-update", { body: { variant: "short" } });
  return { data: res.data };
};

export default function LlmsTxt() {
  const { notConnected, data } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const current = fetcher.data?.data ?? data;
  const content = current?.content ?? "";
  const live = current?.currently_live;

  return (
    <Page>
      <TitleBar title="LLMs.txt Manager" />
      <Layout>
        <Layout.Section>
          <Banner tone="info">
            <p><b>What is LLMs.txt?</b> It’s a simple file at the root of your store (yourstore.com/llms.txt) that tells AI assistants like ChatGPT and Perplexity which of your pages matter most. Think of it as a sitemap written for AI — it helps them understand and cite your store accurately.</p>
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">Your LLMs.txt</Text>
                {notConnected ? <Badge>Pending</Badge>
                  : live ? <Badge tone="success">Live on your store</Badge>
                  : <Badge tone="attention">Not yet published</Badge>}
              </InlineStack>

              {notConnected ? (
                <Text as="p" tone="subdued">We’ll generate this once your store finishes connecting.</Text>
              ) : (
                <>
                  <TextField
                    label="File contents"
                    labelHidden
                    value={content}
                    multiline={14}
                    autoComplete="off"
                    readOnly
                  />
                  <InlineStack gap="200">
                    <fetcher.Form method="post">
                      <Button submit variant="primary" loading={fetcher.state !== "idle"}>Regenerate</Button>
                    </fetcher.Form>
                  </InlineStack>
                  <Box>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Copy this content and publish it at <b>/llms.txt</b> on your store. {current?.pages_used ? `Includes ${current.pages_used} of your key pages.` : ""}
                    </Text>
                  </Box>
                </>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
