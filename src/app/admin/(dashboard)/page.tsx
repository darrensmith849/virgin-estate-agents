import Link from "next/link";
import { Home, Inbox, FileEdit, Eye, ArrowRight, Plus } from "lucide-react";

import { getDashboardStats } from "@/lib/data/dashboard";
import { getCurrentUser } from "@/lib/auth/dal";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/listings/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { formatPrice, timeAgo } from "@/lib/utils";

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
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? "there"}`}
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
        <section className="rounded-xl border border-line bg-card">
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
        <section className="rounded-xl border border-line bg-card">
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
                    <p className="text-xs text-muted">{formatPrice(l.price)}</p>
                  </div>
                  <StatusBadge status={l.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
