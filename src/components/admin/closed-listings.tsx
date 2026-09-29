import { listSoldListings } from "@/lib/data/listings";
import { PageHeader } from "@/components/admin/page-header";
import { SoldList, type SoldRow } from "@/components/admin/sold-list";
import { formatRef } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

/**
 * The Sold tab (sales) or the Rented tab (rentals): listings taken off the
 * market, each with its reference, the date, and the way back if the deal
 * falls through.
 */
export async function ClosedListings({ kind }: { kind: "sale" | "rent" }) {
  const found = await listSoldListings(kind);
  const word = kind === "rent" ? "Rented" : "Sold";

  // Dates are worded here, on the server, so the page reads the same wherever
  // it's opened (and in the agency's own time zone).
  const rows: SoldRow[] = found.map((l) => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    kind: l.kind,
    meta: [formatRef(l.refNumber), l.suburb, formatPrice(l.price, { kind: l.kind, period: l.rentPeriod })]
      .filter(Boolean)
      .join(" · "),
    soldOn: l.soldAt
      ? `${word} ${new Date(l.soldAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "Africa/Harare",
        })}`
      : null,
    cover: l.images[0] ? { url: l.images[0].url, alt: l.images[0].alt } : null,
  }));

  return (
    <>
      <PageHeader
        title={word}
        description={
          kind === "rent"
            ? `${rows.length} rented · still shown on the website, marked RENTED. If a let falls through, put it back on the market.`
            : `${rows.length} sold · still shown on the website, marked SOLD. If a sale falls through, put it back on the market.`
        }
      />
      <SoldList rows={rows} kind={kind} />
    </>
  );
}
