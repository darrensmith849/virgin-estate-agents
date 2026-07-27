"use client";

import { useTransition } from "react";
import { Loader2, Globe, EyeOff } from "lucide-react";

import { setListingPublished } from "@/lib/actions/listings";
import { StatusBadge } from "@/components/listings/status-badge";

/**
 * Status badge plus a one-click publish toggle in the admin listings table.
 * Draft → "Publish" (goes live as For Sale); a live listing → "Unpublish".
 */
export function ListingStatusControl({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const [pending, start] = useTransition();
  const isDraft = status === "draft";

  return (
    <div className="flex items-center gap-2">
      <StatusBadge status={status} />
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => setListingPublished(id, isDraft))}
        title={isDraft ? "Publish to the website" : "Hide from the website"}
        className="inline-flex items-center gap-1 rounded-[var(--radius)] px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-paper-2 hover:text-ink disabled:opacity-60"
      >
        {pending ? (
          <Loader2 size={13} className="animate-spin" />
        ) : isDraft ? (
          <Globe size={13} />
        ) : (
          <EyeOff size={13} />
        )}
        {isDraft ? "Publish" : "Unpublish"}
      </button>
    </div>
  );
}
