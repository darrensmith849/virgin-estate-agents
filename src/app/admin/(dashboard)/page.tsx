import Link from "next/link";
import { Home, Inbox, FileEdit, Eye, ArrowRight, Plus, ChevronRight } from "lucide-react";

import { getDashboardStats } from "@/lib/data/dashboard";
import { getCurrentUser } from "@/lib/auth/dal";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/listings/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { formatPrice, timeAgo } from "@/lib/utils";
import { formatRef } from "@/lib/constants";

export default async function DashboardPage() {
  const [stats, user] = await Promise.all([
    getDashboardStats(),
    getCurrentUser(),
  ]);

  const cards = [
    { label: "Active listings", value: stats.activeListings, icon: Home, href: "/admin/listings" },
    { label: "New enquiries", value: stats.newEnquiries, icon: Inbox, href: "/admin/enquiries" },
    { label: "Drafts", value: stats.draftListings, icon: FileEdit, href: "/admin/listings" },
    { label: "Views this week", value: stats.viewsThisWeek, icon: Eye, href: "/admin/analytics" },
  ];

  return (
    <>
      <PageHeader
        title={greeting(user?.name)}
        description="Here's what's happening across your listings."
      >
        <Link
          href="/admin/listings/new"
          className={buttonVariants({ variant: "primary", size: "sm" })}
        >
          <Plus size={16} />
          New listing
        </Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl border border-line bg-card p-5 transition-colors hover:border-brand-300"
          >
            <Icon size={20} className="text-brand" />
            <p className="mt-4 text-3xl font-medium text-ink">{value}</p>
            <p className="mt-1 text-sm text-muted">{label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Recent enquiries */}
        <section className="min-w-0 rounded-xl border border-line bg-card">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-base font-medium text-ink">Recent enquiries</h2>
            <Link
              href="/admin/enquiries"
              className="flex items-center gap-1 text-sm text-brand hover:underline"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {stats.recentEnquiries.length === 0 && (
              <li className="px-5 py-6 text-sm text-muted">No enquiries yet.</li>
            )}
            {stats.recentEnquiries.map((e) => (
              <li key={e.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-ink">{e.name}</p>
                  <span className="shrink-0 text-xs text-muted">
                    {timeAgo(e.createdAt)}
                  </span>
                </div>
                <p className="truncate text-xs text-muted">
                  {e.listing?.title ?? "General enquiry"}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Recent listings */}
        <section className="min-w-0 rounded-xl border border-line bg-card">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-base font-medium text-ink">Recent listings</h2>
            <Link
              href="/admin/listings"
              className="flex items-center gap-1 text-sm text-brand hover:underline"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {stats.recentListings.length === 0 && (
              <li className="px-5 py-6 text-sm text-muted">No listings yet.</li>
            )}
            {stats.recentListings.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/admin/listings/${l.id}/edit`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-paper-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{l.title}</p>
                    <p className="text-xs text-muted">
                      {[formatRef(l.refNumber), formatPrice(l.price, { kind: l.kind, period: l.rentPeriod })]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <StatusBadge status={l.status} kind={l.kind} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Recently sold — the Sold tab has them all, with their actions. */}
      <section id="sold" className="mt-6 min-w-0 scroll-mt-20 rounded-xl border border-line bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-base font-medium text-ink">
            Recently sold <span className="font-normal text-muted">({stats.soldCount})</span>
          </h2>
          <Link
            href="/admin/sold"
            className="flex items-center gap-1 text-sm text-brand hover:underline"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <ul className="divide-y divide-line">
          {stats.sold.length === 0 && (
            <li className="px-5 py-6 text-sm text-muted">
              Nothing sold yet. When a listing is marked Sold it moves to the Sold tab, with its
              reference number.
            </li>
          )}
          {stats.sold.map((l) => (
            <li key={l.id}>
              <Link
                href={`/admin/listings/${l.id}/edit`}
                className="group flex items-center gap-4 px-5 py-3.5 hover:bg-paper-2"
              >
                <span className="w-16 shrink-0 text-sm font-medium tabular-nums text-brand">
                  {formatRef(l.refNumber) ?? "—"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{l.title}</p>
                  <p className="truncate text-xs text-muted">
                    {[
                      l.suburb,
                      formatPrice(l.price, { kind: l.kind, period: l.rentPeriod }),
                      l.soldAt ? `${l.kind === "rent" ? "let" : "sold"} ${timeAgo(l.soldAt)}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <StatusBadge status="sold" kind={l.kind} />
                <ChevronRight size={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/** "Welcome back, Boyd" — but not "Welcome back, Site" for a generic account. */
function greeting(name: string | null | undefined): string {
  const first = name?.trim().split(/\s+/)[0];
  return first && !/^(site|admin|administrator|the)$/i.test(first)
    ? `Welcome back, ${first}`
    : "Welcome back";
}
