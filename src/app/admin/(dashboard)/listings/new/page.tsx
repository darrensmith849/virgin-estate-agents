import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { listAllAgents } from "@/lib/data/agents";
import { getAgencySettings } from "@/lib/data/settings";
import { resolveVocabulary } from "@/lib/vocabulary";
import { NewListingFlow } from "@/components/admin/new-listing-flow";
import { PageHeader } from "@/components/admin/page-header";

export const metadata = { title: "New listing" };

export default async function NewListingPage() {
  const [agents, settings] = await Promise.all([
    listAllAgents(),
    getAgencySettings(),
  ]);
  const vocabulary = resolveVocabulary(settings);

  return (
    <>
      <Link
        href="/admin/listings"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={15} /> Back to listings
      </Link>
      <PageHeader
        title="New listing"
        description="Fill in the details and add photos — all on this page."
      />
      <NewListingFlow agents={agents} vocabulary={vocabulary} />
    </>
  );
}
