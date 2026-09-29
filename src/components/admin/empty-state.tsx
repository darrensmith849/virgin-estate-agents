import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/*
 * The one "nothing here yet" panel used across the dashboard, so every empty
 * page reads the same way: an icon, a short line, what to do next.
 */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-card px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-paper-2 text-muted">
        <Icon size={20} />
      </span>
      <p className="mt-4 font-medium text-ink">{title}</p>
      {children && <p className="mt-1 max-w-md text-sm text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
