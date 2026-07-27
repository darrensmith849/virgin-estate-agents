"use client";

import { useState } from "react";

import type { Agent } from "@/db/schema";
import { createListing, updateListing } from "@/lib/actions/listings";
import { ListingForm } from "@/components/admin/listing-form";
import { ImageUploader } from "@/components/admin/image-uploader";

/**
 * The whole "new listing" experience on a single page: fill in the details,
 * hit Create, and the photo uploader appears inline (no navigation to a second
 * page). Once created, the same form switches to saving edits to that listing.
 */
export function NewListingFlow({ agents }: { agents: Pick<Agent, "id" | "name">[] }) {
  const [createdId, setCreatedId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {createdId && (
        <>
          <p className="rounded-[var(--radius)] bg-brand-50 px-4 py-2.5 text-sm text-brand">
            Listing saved. Add photos below — the starred image is the cover.
            Keep editing the details and hit “Save changes” whenever you like.
          </p>
          <ImageUploader listingId={createdId} initialImages={[]} />
        </>
      )}

      <ListingForm
        action={createdId ? updateListing.bind(null, createdId) : createListing}
        agents={agents}
        onCreated={setCreatedId}
        submitLabel={createdId ? "Save changes" : "Create listing"}
      />
    </div>
  );
}
