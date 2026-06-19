import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, Badge, Box,
  Banner, ProgressBar, List, Button, Divider,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { ralf } from "../lib/ralf.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [score, wins] = await Promise.all([
    ralf(session.shop, "score"),
    ralf(session.shop, "quickwins"),
  ]);
  return {
    notConnected: score.notConnected ?? false,
    score: score.data,
    quickWins: (wins.data?.quick_wins ?? []).slice(0, 3),
  };
};

const ENGINE_LABELS = ["ChatGPT", "Perplexity", "Claude", "Gemini"];

export default function Dashboard() {
  const { notConnected, score, quickWins } = useLoaderData<typeof loader>();

  if (notConnected) {
    return (
      <Page>
        <TitleBar title="Ralf — AI Search Visibility" />
        <Banner title="Setting up your store" tone="info">
          <p>We’re connecting your store to Ralf and running your first AI visibility scan. This takes a few minutes — refresh shortly.</p>
        </Banner>
      </Page>
    );
  }

  const hasData = score?.has_data;
  const overall = score?.overall_score ?? 0;
  const engines = score?.engines ?? [];

  return (
    <Page>
      <TitleBar title="Ralf — AI Search Visibility" />
      <Layout>
        {!hasData && (
          <Layout.Section>
            <Banner title="Your first scan is still running" tone="info">
              <p>{score?.status_note ?? "Scores appear once the first scan completes."}</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">AI visibility score</Text>
                {score?.as_of && <Text as="span" tone="subdued" variant="bodySm">as of {score.as_of}</Text>}
              </InlineStack>
              <InlineStack gap="400" blockAlign="center">
                <Text as="p" variant="heading3xl">{hasData ? overall : "—"}</Text>
                <Box width="60%"><ProgressBar progress={hasData ? overall : 0} tone="primary" size="large" /></Box>
              </InlineStack>
              <Text as="p" tone="subdued">
                How often your store is cited when shoppers ask AI assistants for recommendations. Higher is better — 100 is the maximum.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">Which AI engines cite you</Text>
              <Divider />
              {ENGINE_LABELS.map((label) => {
                const match = engines.find((e: any) =>
                  (e.display_name ?? "").toLowerCase().includes(label.toLowerCase()) ||
                  (label === "ChatGPT" && e.engine_id === "openai_chat") ||
                  (label === "Gemini" && e.engine_id === "google_aio"),
                );
                const cited = match && (match.cited_count ?? 0) > 0;
                return (
                  <InlineStack key={label} align="space-between" blockAlign="center">
                    <Text as="span">{label}</Text>
                    {!hasData ? <Badge>Pending</Badge>
                      : cited ? <Badge tone="success">Citing you</Badge>
                      : <Badge tone="attention">Not yet</Badge>}
                  </InlineStack>
                );
              })}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">Top priority actions</Text>
              {quickWins.length === 0 ? (
                <Text as="p" tone="subdued">No actions yet — check back after your first scan, or open Quick Wins.</Text>
              ) : (
                <List type="number">
                  {quickWins.map((w: any) => (
                    <List.Item key={w.id}>
                      <Text as="span" fontWeight="semibold">{w.title}</Text> — {w.why}
                    </List.Item>
                  ))}
                </List>
              )}
              <InlineStack>
                <Button url="/app/quickwins" variant="primary">View all quick wins</Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Banner title="Want automated fixes, weekly rescans and priority support?" tone="info">
            <p>Upgrade your plan from the Settings tab to unlock Ralf’s full optimisation engine.</p>
          </Banner>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
