import type { Metadata } from "next";
import Link from "next/link";

import { requireUser } from "@/lib/auth/dal";
import { countNewEnquiries } from "@/lib/data/enquiries";
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
  const newEnquiries = await countNewEnquiries();

  return (
    <div className="min-h-screen bg-paper md:grid md:grid-cols-[264px_1fr]">
      <aside className="border-b border-line bg-card md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-5 py-5">
          <Link href="/admin" className="flex items-baseline gap-2">
            <span className="font-serif text-lg text-ink">Virgin Estate</span>
            <span className="text-[0.55rem] font-medium uppercase tracking-[0.28em] text-sand">
              Admin
            </span>
          </Link>
        </div>
        <AdminNav userName={user.name} newEnquiries={newEnquiries} />
      </aside>

      <div className="min-w-0">
        <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 md:py-12">
          {children}
        </main>
      </div>
    </div>
  );
}
