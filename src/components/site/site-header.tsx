"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { NAV_LINKS, SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Only the home page has a full-bleed dark hero behind a transparent header.
  // There we use light text; elsewhere (and once scrolled) the header sits on
  // its solid paper background with dark text.
  const overHero = pathname === "/" && !scrolled && !open;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors duration-300",
        overHero
          ? "border-b border-transparent bg-transparent"
          : "border-b border-line bg-paper/85 backdrop-blur-md",
      )}
    >
      <Container className="flex h-18 items-center justify-between py-4">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative h-11 w-[34px] shrink-0">
            <Image
              src="/images/virgin-tree-white.png"
              alt=""
              fill
              priority
              sizes="34px"
              className={cn(
                "object-contain transition-opacity duration-300",
                overHero ? "opacity-100" : "opacity-0",
              )}
            />
            <Image
              src="/images/virgin-tree-green.png"
              alt="Virgin Estate Agents"
              fill
              priority
              sizes="34px"
              className={cn(
                "object-contain transition-opacity duration-300",
                overHero ? "opacity-0" : "opacity-100",
              )}
            />
          </span>
          <span className="flex flex-col leading-none">
            <span
              className={cn(
                "font-serif text-base leading-tight tracking-tight transition-colors sm:text-lg",
                overHero ? "text-white" : "text-ink",
              )}
            >
              Virgin Estate Agents
            </span>
            <span
              className={cn(
                "mt-1 text-[0.5rem] font-medium uppercase tracking-[0.2em] transition-colors sm:text-[0.55rem] sm:tracking-[0.24em]",
                overHero ? "text-white/70" : "text-sand",
              )}
            >
              &amp; Property Consultants
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative text-sm transition-colors",
                  overHero
                    ? "text-white/85 hover:text-white"
                    : active
                      ? "text-ink"
                      : "text-muted hover:text-ink",
                )}
              >
                {link.label}
                <span
                  className={cn(
                    "absolute -bottom-1.5 left-0 h-px bg-current transition-all duration-300 ease-out",
                    active ? "w-full opacity-100" : "w-0 opacity-70 group-hover:w-full",
                  )}
                />
              </Link>
            );
          })}
          <Link
            href="/contact"
            className={buttonVariants({
              variant: "primary",
              size: "sm",
              className: overHero ? "bg-white text-brand hover:bg-white/90" : "",
            })}
          >
            Enquire
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius)] transition-colors md:hidden",
            overHero ? "text-white hover:bg-white/10" : "text-ink hover:bg-paper-2",
          )}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </Container>

      {/* Mobile panel */}
      {open && (
        <div className="border-t border-line bg-paper md:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-[var(--radius)] px-2 py-3 text-base text-ink-soft hover:bg-paper-2"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/contact"
              className={cn(
                buttonVariants({ variant: "primary", size: "md" }),
                "mt-2",
              )}
            >
              Enquire
            </Link>
            <a
              href={`tel:${SITE.phone.replace(/\s/g, "")}`}
              className="px-2 py-3 text-sm text-muted"
            >
              {SITE.phone}
            </a>
          </Container>
        </div>
      )}
    </header>
  );
}
