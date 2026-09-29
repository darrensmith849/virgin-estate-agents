import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";

import { requireUser } from "@/lib/auth/dal";
import { logout } from "@/lib/actions/auth";
import { countNewEnquiries } from "@/lib/data/enquiries";
import { countBinnedListings, countSoldListings } from "@/lib/data/listings";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Virgin Estate Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [newEnquiries, binCount, soldCount] = await Promise.all([
    countNewEnquiries(),
    countBinnedListings(),
    countSoldListings(),
  ]);

  const initials =
    user.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "A";

  return (
    <div className="min-h-screen bg-paper md:grid md:grid-cols-[264px_1fr]">
      <aside className="border-b border-line bg-card md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <Link href="/admin" className="flex items-baseline gap-2">
            <span className="font-serif text-lg text-ink">Virgin Estate</span>
            <span className="text-[0.55rem] font-medium uppercase tracking-[0.28em] text-sand">
              Admin
            </span>
          </Link>
          {/* Phones: the top bar below isn't shown, so the essentials sit here. */}
          <div className="flex items-center gap-1 md:hidden">
            <Link
              href="/"
              target="_blank"
              aria-label="View site"
              className="rounded-full p-2 text-muted hover:bg-paper-2 hover:text-ink"
            >
              <ExternalLink size={17} />
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink"
              >
                <LogOut size={14} />
                Log out
              </button>
            </form>
          </div>
        </div>
        <AdminNav newEnquiries={newEnquiries} binCount={binCount} soldCount={soldCount} />
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 hidden border-b border-line bg-paper/90 backdrop-blur md:block">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-end gap-1 px-8">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:bg-paper-2 hover:text-ink"
            >
              <ExternalLink size={15} />
              View site
            </Link>
            <span className="mx-2 h-5 w-px bg-line" aria-hidden />
            <span className="flex items-center gap-2.5 pr-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand"
                aria-hidden
              >
                {initials}
              </span>
              <span className="text-sm text-ink">{user.name}</span>
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-1.5 text-sm text-ink-soft transition-colors hover:border-ink/20 hover:text-ink"
              >
                <LogOut size={14} />
                Log out
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
