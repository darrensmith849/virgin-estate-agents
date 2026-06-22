import { getAnalytics } from "@/lib/data/analytics";
import { PageHeader } from "@/components/admin/page-header";
import { AnalyticsCharts } from "@/components/admin/analytics-charts";

export const metadata = { title: "Analytics" };

// Always render fresh analytics.
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const data = await getAnalytics(30);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Listing views, top performers and enquiry conversion over the last 30 days."
      />
      <AnalyticsCharts data={data} />
    </>
  );
}
