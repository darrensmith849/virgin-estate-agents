"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Eye, EyeOff, Loader2, Pencil, SlidersHorizontal } from "lucide-react";

import { setListingPublished } from "@/lib/actions/listings";
import { StatusBadge } from "@/components/listings/status-badge";

/**
 * Editing shortcuts shown over the public site, but only to a signed-in admin.
 *
 * The point is to shorten the loop between spotting something on the live page
 * and fixing it: no hunting for the listing in the dashboard. Rendered by the
 * server only when there is a session, so visitors never receive this markup,
 * and every action it offers is authorisation-checked server-side regardless.
 *
 * Sits bottom-left because the WhatsApp and assistant buttons own the right.
 */
export function AdminBar({
  listingId,
  status,
}: {
  listingId: string;
  status: string;
}) {
  const [pending, start] = useTransition();
  const isDraft = status === "draft";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-start pl-4 pr-20 sm:pr-4 print:hidden">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-line bg-card/95 py-2 pl-3 pr-2 shadow-[0_10px_30px_-12px_rgba(15,33,24,0.45)] backdrop-blur">
        <span className="hidden text-xs font-medium uppercase tracking-wide text-muted sm:inline">
          Admin
        </span>
        <StatusBadge status={status} />

        <Link
          href={`/admin/listings/${listingId}/edit`}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          <Pencil size={14} />
          Edit
        </Link>

        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => setListingPublished(listingId, isDraft))}
          title={isDraft ? "Publish to the website" : "Hide from the website"}
          aria-label={isDraft ? "Publish to the website" : "Hide from the website"}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-ink transition hover:bg-paper-2 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : isDraft ? (
            <Eye size={14} />
          ) : (
            <EyeOff size={14} />
          )}
          {/* Label hidden on phones: with it, the bar's right edge runs under
              the floating WhatsApp/assistant buttons at 375px. The title and
              aria-label keep it clear without the text. */}
          <span className="hidden sm:inline">
            {isDraft ? "Publish" : "Unpublish"}
          </span>
        </button>

        <Link
          href="/admin/listings"
          title="All listings"
          aria-label="All listings"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-paper-2 hover:text-ink"
        >
          <SlidersHorizontal size={15} />
        </Link>
      </div>
    </div>
  );
}
