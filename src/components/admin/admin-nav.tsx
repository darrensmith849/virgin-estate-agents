"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  LayoutDashboard,
  Home,
  Inbox,
  Users,
  BarChart3,
  Settings,
  Trash2,
  BadgeCheck,
  KeyRound,
  ChevronDown,
} from "lucide-react";

import { cn } from "@/lib/utils";

/* Sold and Rented sit under Listings (`sub`): where listings go once a sale
   or a let is done. In the sidebar they fold away under Listings. */
const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, badge: false },
  { href: "/admin/listings", label: "Listings", icon: Home, exact: false, badge: false },
  { href: "/admin/sold", label: "Sold", icon: BadgeCheck, exact: false, badge: false, sub: true },
  { href: "/admin/rented", label: "Rented", icon: KeyRound, exact: false, badge: false, sub: true },
  { href: "/admin/enquiries", label: "Enquiries", icon: Inbox, exact: false, badge: true },
  { href: "/admin/agents", label: "Agents", icon: Users, exact: false, badge: false },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, exact: false, badge: false },
  { href: "/admin/settings", label: "Settings", icon: Settings, exact: false, badge: false },
  { href: "/admin/recycle-bin", label: "Recycle bin", icon: Trash2, exact: false, badge: false },
] as const;

/* Whether Sold / Rented are left open, remembered in this browser (and in
   memory where storage isn't available, e.g. private browsing). */
const OPEN_KEY = "ve-admin-listings-open";
let openInMemory = false;
const openListeners = new Set<() => void>();
function subscribeOpen(onChange: () => void) {
  openListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    openListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}
function readOpen(): boolean {
  try {
    const saved = localStorage.getItem(OPEN_KEY);
    return saved === null ? openInMemory : saved === "1";
  } catch {
    return openInMemory;
  }
}
function writeOpen(value: boolean) {
  openInMemory = value;
  try {
    localStorage.setItem(OPEN_KEY, value ? "1" : "0");
  } catch {
    // Not remembered across visits, which is fine.
  }
  openListeners.forEach((listener) => listener());
}

export function AdminNav({
  newEnquiries,
  binCount = 0,
  soldCount = 0,
  rentedCount = 0,
}: {
  newEnquiries: number;
  /** Listings marked Sold / Rented — quiet counts on those tabs. */
  soldCount?: number;
  rentedCount?: number;
  /** Listings currently in the recycle bin — shown as a quiet count. */
  binCount?: number;
}) {
  const pathname = usePathname();

  /*
   * Sold / Rented fold under Listings in the sidebar. They're always shown
   * while you're on one of them; otherwise the sidebar remembers whether they
   * were left open. (Phones show the menu as one scrolling row, so there they
   * are always visible.)
   */
  const onSubPage = pathname.startsWith("/admin/sold") || pathname.startsWith("/admin/rented");
  const expanded = useSyncExternalStore(subscribeOpen, readOpen, () => false);
  const open = expanded || onSubPage;
  const toggle = () => writeOpen(!open);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className="flex gap-1 overflow-x-auto p-3 md:flex-1 md:flex-col md:overflow-x-visible md:overflow-y-auto md:p-4">
        {LINKS.map((link) => {
          const { href, label, icon: Icon, exact, badge } = link;
          const sub = "sub" in link && link.sub;
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          const count =
            href === "/admin/sold"
              ? soldCount
              : href === "/admin/rented"
                ? rentedCount
                : href === "/admin/recycle-bin"
                  ? binCount
                  : 0;
          const isListings = href === "/admin/listings";
          const link_ = (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm transition-colors",
                // Sold and Rented are indented under Listings in the sidebar,
                // and fold away with it.
                sub && "md:ml-5 md:py-2",
                sub && !open && "md:hidden",
                isListings && "md:flex-1 md:pr-10",
                active
                  ? "bg-brand text-white"
                  : "text-ink-soft hover:bg-paper-2",
              )}
            >
              <Icon size={sub ? 16 : 18} className={active ? "text-white" : "text-muted"} />
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
              {count > 0 && (
                <span
                  className={cn(
                    "ml-auto rounded-full px-2 py-0.5 text-xs",
                    active ? "bg-white/20 text-white" : "bg-paper-2 text-muted",
                  )}
                >
                  {count}
                </span>
              )}
            </Link>
          );
          if (!isListings) return link_;
          return (
            <div key={href} className="relative flex shrink-0 items-center">
              {link_}
              <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                aria-label={open ? "Hide Sold and Rented" : "Show Sold and Rented"}
                className={cn(
                  "absolute right-1.5 hidden h-7 w-7 items-center justify-center rounded-md transition-colors md:inline-flex",
                  active ? "text-white/80 hover:bg-white/15 hover:text-white" : "text-muted hover:bg-line hover:text-ink",
                )}
              >
                <ChevronDown
                  size={16}
                  className={cn("transition-transform duration-200", open && "rotate-180")}
                />
              </button>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
