"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConfirmDelete({
  action,
  message = "Delete this item? This can't be undone.",
  label = "Delete",
  iconOnly = false,
  className,
}: {
  action: () => Promise<void>;
  message?: string;
  label?: string;
  iconOnly?: boolean;
  className?: string;
}) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm(message)) start(() => action());
      }}
      className={cn(
        "inline-flex items-center gap-2 rounded-[var(--radius)] text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50",
        iconOnly ? "p-2" : "px-3 py-2",
        className,
      )}
      title={label}
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
      {!iconOnly && <span>{pending ? "Deleting…" : label}</span>}
    </button>
  );
}
