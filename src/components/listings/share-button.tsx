"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-paper-2"
    >
      {copied ? <Check size={15} className="text-brand" /> : <Share2 size={15} />}
      {copied ? "Copied" : "Share"}
    </button>
  );
}
