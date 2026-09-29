"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Home,
  Inbox,
  Users,
  BarChart3,
  Settings,
  Trash2,
  BadgeCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, badge: false },
  { href: "/admin/listings", label: "Listings", icon: Home, exact: false, badge: false },
  { href: "/admin/sold", label: "Sold", icon: BadgeCheck, exact: false, badge: false },
  { href: "/admin/enquiries", label: "Enquiries", icon: Inbox, exact: false, badge: true },
  { href: "/admin/agents", label: "Agents", icon: Users, exact: false, badge: false },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, exact: false, badge: false },
  { href: "/admin/settings", label: "Settings", icon: Settings, exact: false, badge: false },
  { href: "/admin/recycle-bin", label: "Recycle bin", icon: Trash2, exact: false, badge: false },
] as const;

export function AdminNav({
  newEnquiries,
  binCount = 0,
  soldCount = 0,
}: {
  newEnquiries: number;
  /** Listings marked Sold — shown as a quiet count on the Sold tab. */
  soldCount?: number;
  /** Listings currently in the recycle bin — shown as a quiet count. */
  binCount?: number;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className="flex gap-1 overflow-x-auto p-3 md:flex-1 md:flex-col md:overflow-x-visible md:overflow-y-auto md:p-4">
        {LINKS.map(({ href, label, icon: Icon, exact, badge }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-brand text-white"
                  : "text-ink-soft hover:bg-paper-2",
              )}
            >
              <Icon size={18} className={active ? "text-white" : "text-muted"} />
              <span>{label}</span>
              {badge && newEnquiries > 0 && (
                <span
                  className={cn(
                    "ml-auto rounded-full px-2 py-0.5 text-xs",
                    active ? "bg-white/20 text-white" : "bg-brand text-white",
                  )}
                >
                  {newEnquiries}
                </span>
              )}
              {(href === "/admin/recycle-bin" || href === "/admin/sold") &&
                (href === "/admin/sold" ? soldCount : binCount) > 0 && (
                  <span
                    className={cn(
                      "ml-auto rounded-full px-2 py-0.5 text-xs",
                      active ? "bg-white/20 text-white" : "bg-paper-2 text-muted",
                    )}
                  >
                    {href === "/admin/sold" ? soldCount : binCount}
                  </span>
                )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
