import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, Badge, Button,
  EmptyState, Banner, Box,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { ralf } from "../lib/ralf.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const res = await ralf(session.shop, "quickwins");
  return { notConnected: res.notConnected ?? false, wins: res.data?.quick_wins ?? [] };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const fixId = String(form.get("fix_id") ?? "");
  const res = await ralf(session.shop, "apply-fix", { body: { fix_id: fixId } });
  return { result: res.data };
};

function impactBadge(impact: string) {
  if (impact === "high") return <Badge tone="success">High impact</Badge>;
  if (impact === "medium") return <Badge tone="attention">Medium impact</Badge>;
  return <Badge>Low impact</Badge>;
}

export default function QuickWins() {
  const { notConnected, wins } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const result = fetcher.data?.result;

  if (notConnected) {
    return (
      <Page>
        <TitleBar title="Quick Wins" />
        <Card><EmptyState heading="Setting up" image=""><p>Your recommendations appear after the first scan.</p></EmptyState></Card>
      </Page>
    );
  }

  return (
    <Page>
      <TitleBar title="Quick Wins" />
      <Layout>
        <Layout.Section>
          <Text as="p" tone="subdued">The highest-impact changes to get your store cited more often by AI assistants. Apply automated fixes in one click; others include step-by-step guidance.</Text>
        </Layout.Section>

        {result?.type === "content" && (
          <Layout.Section>
            <Banner title={`Generated ${result.filename ?? "file"}`} tone="success">
              <p>{result.note}</p>
              <Box paddingBlockStart="200">
                <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, background: "#f6f6f7", padding: 12, borderRadius: 8, maxHeight: 240, overflow: "auto" }}>{result.content}</pre>
              </Box>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          {wins.length === 0 ? (
            <Card><Banner tone="success">No outstanding quick wins — nice work.</Banner></Card>
          ) : (
            <BlockStack gap="300">
              {wins.map((w: any) => (
                <Card key={w.id}>
                  <BlockStack gap="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h3" variant="headingMd">{w.title}</Text>
                      {impactBadge(w.impact)}
                    </InlineStack>
                    <Text as="p" tone="subdued">{w.why}</Text>
                    <InlineStack gap="200" blockAlign="center">
                      {w.automated ? (
                        <fetcher.Form method="post">
                          <input type="hidden" name="fix_id" value={w.id} />
                          <Button submit variant="primary" loading={fetcher.state !== "idle"}>Generate fix</Button>
                        </fetcher.Form>
                      ) : (
                        <Badge>Guided fix</Badge>
                      )}
                      {w.meta?.pages_affected != null && (
                        <Text as="span" variant="bodySm" tone="subdued">{w.meta.pages_affected} page(s) affected</Text>
                      )}
                    </InlineStack>
                  </BlockStack>
                </Card>
              ))}
            </BlockStack>
          )}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
