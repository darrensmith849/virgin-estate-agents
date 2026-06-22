import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { listAllAgents } from "@/lib/data/agents";
import { createListing } from "@/lib/actions/listings";
import { ListingForm } from "@/components/admin/listing-form";
import { PageHeader } from "@/components/admin/page-header";

export const metadata = { title: "New listing" };

export default async function NewListingPage() {
  const agents = await listAllAgents();

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
        description="Save the details first, then add photos."
      />
      <ListingForm
        action={createListing}
        agents={agents}
        submitLabel="Create listing"
      />
    </>
  );
}
