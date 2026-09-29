import { cn } from "@/lib/utils";

/**
 * A bold status stamp laid over a listing's photo — the same status the admin
 * sets on the listing: "FOR SALE" (or "TO RENT"), "UNDER OFFER", "SOLD" (or
 * "RENTED"). An available listing uses the agency's own wording for sale / rent
 * from Settings when given, so it reads the same as the site's headings and
 * tabs. Drafts aren't public, so they get none.
 */
export function stampLabel(
  status: string,
  kind: string,
  kindLabels?: { sale: string; rent: string },
): string | null {
  if (status === "for_sale") {
    return kind === "rent" ? (kindLabels?.rent ?? "To Rent") : (kindLabels?.sale ?? "For Sale");
  }
  if (status === "sold") return "Sold";
  if (status === "rented") return "Rented";
  if (status === "under_offer") return "Under offer";
  return null;
}

export function StatusStamp({
  status,
  kind,
  kindLabels,
  size = "sm",
  className,
}: {
  status: string;
  kind: string;
  /** The agency's wording for sale / rent (Settings → Listing type wording). */
  kindLabels?: { sale: string; rent: string };
  /** "sm" for listing cards, "lg" for the photo on the listing page. */
  size?: "sm" | "lg";
  className?: string;
}) {
  const label = stampLabel(status, kind, kindLabels);
  if (!label) return null;
  return (
    <span
      className={cn(
        "pointer-events-none inline-flex items-center rounded-full border border-white/40 bg-brand-900/80 font-semibold uppercase text-white shadow-lg backdrop-blur-sm",
        size === "lg"
          ? "px-5 py-2 text-base tracking-[0.14em] sm:px-6 sm:py-2.5 sm:text-lg"
          : "px-3.5 py-1.5 text-xs tracking-[0.14em]",
        className,
      )}
    >
      {label}
    </span>
  );
}
