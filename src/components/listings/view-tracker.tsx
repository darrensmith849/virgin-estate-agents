"use client";

import { useEffect, useRef } from "react";
import { recordListingView } from "@/lib/actions/analytics";

/** Fires a single view event per listing per browser session. */
export function ViewTracker({
  listingId,
  path,
}: {
  listingId: string;
  path: string;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const key = `viewed:${listingId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage unavailable — still record once per mount
    }

    recordListingView({
      listingId,
      path,
      referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
    });
  }, [listingId, path]);

  return null;
}
