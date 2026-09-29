"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { EmptyState } from "@/components/admin/empty-state";
import { buttonVariants } from "@/components/ui/button";

/* A dashboard page that failed to load: say so plainly and offer a retry. */
export default function DashboardError({
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
    <EmptyState
      icon={AlertTriangle}
      title="This page didn't load"
      action={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className={buttonVariants({ variant: "primary", size: "sm" })}
          >
            Try again
          </button>
          <Link href="/admin" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Dashboard
          </Link>
        </div>
      }
    >
      Nothing has been lost — it&rsquo;s usually a brief connection problem. Try again in a moment.
      {error.digest && <span className="mt-2 block text-xs">Reference: {error.digest}</span>}
    </EmptyState>
  );
}
