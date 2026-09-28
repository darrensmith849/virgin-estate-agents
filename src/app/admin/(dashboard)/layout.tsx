import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";

import { requireUser } from "@/lib/auth/dal";
import { logout } from "@/lib/actions/auth";
import { countNewEnquiries } from "@/lib/data/enquiries";
import { countBinnedListings } from "@/lib/data/listings";
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
  const [newEnquiries, binCount] = await Promise.all([
    countNewEnquiries(),
    countBinnedListings(),
  ]);

  return (
    <div className="min-h-screen bg-paper md:grid md:grid-cols-[264px_1fr]">
      <aside className="border-b border-line bg-card md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <Link href="/admin" className="flex items-baseline gap-2">
            <span className="font-serif text-lg text-ink">Virgin Estate</span>
            <span className="text-[0.55rem] font-medium uppercase tracking-[0.28em] text-sand">
              Admin
            </span>
          </Link>
          {/* On phones the sidebar's footer (with its Log out) is hidden. */}
          <form action={logout} className="md:hidden">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line px-2.5 py-1.5 text-sm text-ink-soft hover:bg-paper-2"
            >
              <LogOut size={15} />
              Log out
            </button>
          </form>
        </div>
        <AdminNav userName={user.name} newEnquiries={newEnquiries} binCount={binCount} />
      </aside>

      <div className="min-w-0">
        <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 md:py-12">
          {children}
        </main>
      </div>
    </div>
  );
}
