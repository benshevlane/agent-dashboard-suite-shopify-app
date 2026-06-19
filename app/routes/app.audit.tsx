import { useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, Badge, Banner,
  IndexTable, Tabs, EmptyState, InlineGrid, Box,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { ralf } from "../lib/ralf.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const res = await ralf(session.shop, "audit");
  return { notConnected: res.notConnected ?? false, audit: res.data };
};

function sevBadge(sev: string) {
  if (sev === "critical") return <Badge tone="critical">Critical</Badge>;
  if (sev === "warning") return <Badge tone="warning">Warning</Badge>;
  return <Badge>Notice</Badge>;
}

export default function Audit() {
  const { notConnected, audit } = useLoaderData<typeof loader>();
  const [tab, setTab] = useState(0);

  if (notConnected || !audit?.has_data) {
    return (
      <Page>
        <TitleBar title="AI Visibility Audit" />
        <Card>
          <EmptyState heading="Your audit is being prepared" image="">
            <p>{audit?.status_note ?? "The first crawl of your store runs at install and completes within a few minutes."}</p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  const issues = audit.issues ?? [];
  const tabs = [
    { id: "all", content: "All" },
    { id: "critical", content: "Critical" },
    { id: "warning", content: "Warnings" },
    { id: "notice", content: "Notices" },
  ];
  const filtered = tab === 0 ? issues : issues.filter((i: any) => i.severity === tabs[tab].id);

  const sub = audit.sub_scores ?? {};
  const scoreCards = [
    ["Crawlability", sub.crawlability], ["On-page", sub.onpage],
    ["Performance", sub.performance], ["Architecture", sub.architecture], ["Content", sub.content],
  ];

  return (
    <Page>
      <TitleBar title="AI Visibility Audit" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">Site health</Text>
                <Text as="span" variant="headingLg">{audit.health_score}/100</Text>
              </InlineStack>
              {audit.ai_commentary && <Text as="p" tone="subdued">{audit.ai_commentary}</Text>}
              <InlineGrid columns={{ xs: 2, sm: 3, md: 5 }} gap="300">
                {scoreCards.map(([label, val]) => (
                  <Box key={label as string} padding="300" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="100">
                      <Text as="span" variant="bodySm" tone="subdued">{label}</Text>
                      <Text as="span" variant="headingMd">{val ?? "—"}</Text>
                    </BlockStack>
                  </Box>
                ))}
              </InlineGrid>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card padding="0">
            <Tabs tabs={tabs} selected={tab} onSelect={setTab}>
              {filtered.length === 0 ? (
                <Box padding="400"><Banner tone="success">No issues in this category.</Banner></Box>
              ) : (
                <IndexTable
                  itemCount={filtered.length}
                  selectable={false}
                  headings={[{ title: "Issue" }, { title: "Severity" }, { title: "Pages" }, { title: "Impact" }]}
                >
                  {filtered.map((i: any, idx: number) => (
                    <IndexTable.Row id={String(idx)} key={idx} position={idx}>
                      <IndexTable.Cell>
                        <BlockStack gap="050">
                          <Text as="span" fontWeight="semibold">{i.title}</Text>
                          {i.why_specific && <Text as="span" variant="bodySm" tone="subdued">{i.why_specific}</Text>}
                        </BlockStack>
                      </IndexTable.Cell>
                      <IndexTable.Cell>{sevBadge(i.severity)}</IndexTable.Cell>
                      <IndexTable.Cell>{i.pages_affected_count ?? "—"}</IndexTable.Cell>
                      <IndexTable.Cell>{i.impact_label ? `${i.impact_label}: ${i.impact_value ?? ""}` : "—"}</IndexTable.Cell>
                    </IndexTable.Row>
                  ))}
                </IndexTable>
              )}
            </Tabs>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
