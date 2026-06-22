import { Mail, Phone } from "lucide-react";

import { listEnquiries } from "@/lib/data/enquiries";
import { PageHeader } from "@/components/admin/page-header";
import { EnquiryActions } from "@/components/admin/enquiry-actions";
import { whatsappLink, timeAgo } from "@/lib/utils";

export const metadata = { title: "Enquiries" };

export default async function EnquiriesPage() {
  const enquiries = await listEnquiries();
  const newCount = enquiries.filter((e) => e.status === "new").length;

  return (
    <>
      <PageHeader
        title="Enquiries"
        description={`${enquiries.length} total · ${newCount} new`}
      />

      {enquiries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-card p-12 text-center text-muted">
          No enquiries yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {enquiries.map((e) => {
            const wa = whatsappLink(e.phone, `Hi ${e.name}, thanks for your enquiry`);
            return (
              <li
                key={e.id}
                className={
                  "rounded-xl border bg-card p-5 " +
                  (e.status === "new" ? "border-brand-300" : "border-line")
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="font-medium text-ink">{e.name}</span>
                    <span className="ml-2 text-xs text-muted">{timeAgo(e.createdAt)}</span>
                  </div>
                  <EnquiryActions id={e.id} status={e.status} />
                </div>

                <p className="mt-3 text-sm text-ink-soft">{e.message}</p>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted">
                  {e.listing && (
                    <span className="rounded-md bg-paper-2 px-2 py-1 text-xs">
                      {e.listing.title}
                    </span>
                  )}
                  <a href={`mailto:${e.email}`} className="flex items-center gap-1.5 hover:text-ink">
                    <Mail size={14} /> {e.email}
                  </a>
                  {e.phone && (
                    <a
                      href={wa ?? `tel:${e.phone}`}
                      target={wa ? "_blank" : undefined}
                      rel="noreferrer"
                      className="flex items-center gap-1.5 hover:text-ink"
                    >
                      <Phone size={14} /> {e.phone}
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
