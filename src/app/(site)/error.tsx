"use client";

import Link from "next/link";
import { useEffect } from "react";

import { buttonVariants } from "@/components/ui/button";

/*
 * If a page fails to load (a dropped database connection, say), visitors get
 * this inside the normal header and footer instead of a bare error screen.
 */
export default function SiteError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-5 py-24 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-sand">Sorry</p>
      <h1 className="mt-4 text-2xl">This page didn&rsquo;t load properly</h1>
      <p className="mt-2 max-w-sm text-muted">
        Please try again in a moment. If it keeps happening, get in touch and we&rsquo;ll help.
      </p>
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className={buttonVariants({ variant: "primary", size: "md" })}
        >
          Try again
        </button>
        <Link href="/contact" className={buttonVariants({ variant: "outline", size: "md" })}>
          Contact us
        </Link>
      </div>
    </section>
  );
}
