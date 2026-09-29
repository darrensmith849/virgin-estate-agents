import { listSoldListings } from "@/lib/data/listings";
import { PageHeader } from "@/components/admin/page-header";
import { SoldList, type SoldRow } from "@/components/admin/sold-list";
import { formatRef } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Sold" };

export default async function SoldPage() {
  const sold = await listSoldListings();

  // Dates are worded here, on the server, so the page reads the same wherever
  // it's opened (and in the agency's own time zone).
  const rows: SoldRow[] = sold.map((l) => ({
    id: l.id,
    slug: l.slug,
    title: l.title,
    kind: l.kind,
    meta: [formatRef(l.refNumber), l.suburb, formatPrice(l.price, { kind: l.kind, period: l.rentPeriod })]
      .filter(Boolean)
      .join(" · "),
    soldOn: l.soldAt
      ? `${l.kind === "rent" ? "Let" : "Sold"} ${new Date(l.soldAt).toLocaleDateString("en-GB", {
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
        title="Sold"
        description={`${rows.length} sold · still shown on the website, marked SOLD. If a sale falls through, put it back on the market.`}
      />
      <SoldList rows={rows} />
    </>
  );
}
