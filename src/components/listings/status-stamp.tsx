import { cn } from "@/lib/utils";

/**
 * A bold "SOLD" / "UNDER OFFER" / "LET" stamp laid over a listing's photo, so a
 * property that's gone is obvious at a glance. Nothing is shown for a listing
 * that is still available.
 */
export function stampLabel(status: string, kind: string): string | null {
  if (status === "sold") return kind === "rent" ? "Let" : "Sold";
  if (status === "under_offer") return "Under offer";
  return null;
}

export function StatusStamp({
  status,
  kind,
  size = "sm",
  className,
}: {
  status: string;
  kind: string;
  /** "sm" for listing cards, "lg" for the photo on the listing page. */
  size?: "sm" | "lg";
  className?: string;
}) {
  const label = stampLabel(status, kind);
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
