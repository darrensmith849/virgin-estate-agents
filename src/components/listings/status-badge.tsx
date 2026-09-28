import { statusLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";

const MAP: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-paper-2 text-muted" },
  for_sale: { label: "For Sale", className: "bg-brand-50 text-brand" },
  under_offer: { label: "Under Offer", className: "bg-amber-50 text-amber" },
  sold: { label: "Sold", className: "bg-ink text-paper" },
};

export function StatusBadge({
  status,
  kind,
  className,
}: {
  status: string;
  /** "rent" words it as To Rent / Let. */
  kind?: string | null;
  className?: string;
}) {
  const cfg = MAP[status] ?? MAP.draft;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        cfg.className,
        className,
      )}
    >
      {statusLabel(status, kind)}
    </span>
  );
}
