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
  ExternalLink,
  LogOut,
} from "lucide-react";

import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, badge: false },
  { href: "/admin/listings", label: "Listings", icon: Home, exact: false, badge: false },
  { href: "/admin/enquiries", label: "Enquiries", icon: Inbox, exact: false, badge: true },
  { href: "/admin/agents", label: "Agents", icon: Users, exact: false, badge: false },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, exact: false, badge: false },
  { href: "/admin/settings", label: "Settings", icon: Settings, exact: false, badge: false },
] as const;

export function AdminNav({
  userName,
  newEnquiries,
}: {
  userName: string;
  newEnquiries: number;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <nav className="flex gap-1 overflow-x-auto p-3 md:flex-1 md:flex-col md:overflow-visible md:p-4">
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
            </Link>
          );
        })}
      </nav>

      <div className="hidden border-t border-line p-4 md:block">
        <Link
          href="/"
          target="_blank"
          className="mb-3 flex items-center gap-2 px-3 text-sm text-muted hover:text-ink"
        >
          <ExternalLink size={16} />
          View site
        </Link>
        <div className="flex items-center justify-between rounded-[var(--radius)] bg-paper-2 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{userName}</p>
            <p className="text-xs text-muted">Administrator</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              aria-label="Sign out"
              className="rounded-md p-1.5 text-muted hover:bg-line hover:text-ink"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
