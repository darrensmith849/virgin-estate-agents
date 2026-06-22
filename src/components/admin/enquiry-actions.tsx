"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";

import { updateEnquiryStatus, deleteEnquiry } from "@/lib/actions/enquiries";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "closed", label: "Closed" },
] as const;

export function EnquiryActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex rounded-[var(--radius)] bg-paper-2 p-0.5">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={pending}
            onClick={() =>
              o.value !== status &&
              start(() => updateEnquiryStatus(id, o.value))
            }
            className={cn(
              "rounded-[calc(var(--radius)-2px)] px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60",
              status === o.value
                ? "bg-brand text-white"
                : "text-muted hover:text-ink",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm("Delete this enquiry?"))
            start(() => deleteEnquiry(id));
        }}
        aria-label="Delete enquiry"
        className="rounded-md p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
      >
        {pending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
      </button>
    </div>
  );
}
