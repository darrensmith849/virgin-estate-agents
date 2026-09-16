"use client";

import { useCallback, useState } from "react";

import type { Agent } from "@/db/schema";
import {
  createDraftListing,
  createListing,
  updateListing,
} from "@/lib/actions/listings";
import { ListingForm } from "@/components/admin/listing-form";
import { ImageUploader } from "@/components/admin/image-uploader";
import type { Vocabulary } from "@/lib/vocabulary";

/**
 * The whole "new listing" experience on a single page: the media uploader is
 * visible from the start, and the details form sits below it. Adding media (or
 * hitting Create) creates the listing behind the scenes; everything after that
 * saves to the same record — no navigation to a separate edit page.
 */
export function NewListingFlow({
  agents,
  vocabulary,
}: {
  agents: Pick<Agent, "id" | "name">[];
  vocabulary: Vocabulary;
}) {
  const [listingId, setListingId] = useState<string | null>(null);

  // Called by the uploader the first time media is added, before the details
  // form has been submitted — creates a draft and reuses it thereafter.
  const ensureListingId = useCallback(async () => {
    if (listingId) return listingId;
    const res = await createDraftListing();
    if (!res.id) throw new Error(res.error ?? "Could not create the listing.");
    setListingId(res.id);
    return res.id;
  }, [listingId]);

  return (
    <div className="space-y-6">
      <ImageUploader
        listingId={listingId}
        ensureListingId={ensureListingId}
        initialImages={[]}
        initialVideos={[]}
      />

      <ListingForm
        action={listingId ? updateListing.bind(null, listingId) : createListing}
        agents={agents}
        vocabulary={vocabulary}
        submitLabel={listingId ? "Save changes" : "Create listing"}
      />
    </div>
  );
}
