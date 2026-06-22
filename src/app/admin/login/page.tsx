import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/login-form";
import { getCurrentUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Already signed in → straight to the dashboard.
  if (await getCurrentUser()) redirect("/admin");

  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-2 px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-baseline justify-center gap-2">
          <span className="font-serif text-2xl text-ink">Virgin Estate</span>
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.28em] text-sand">
            Agents
          </span>
        </Link>

        <div className="rounded-2xl border border-line bg-card p-7 shadow-sm">
          <h1 className="text-xl">Admin sign in</h1>
          <p className="mt-1 mb-6 text-sm text-muted">
            Manage listings, enquiries and analytics.
          </p>
          <LoginForm next={next} />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Protected area · {new Date().getFullYear()} Virgin Estate Agents
        </p>
      </div>
    </main>
  );
}
