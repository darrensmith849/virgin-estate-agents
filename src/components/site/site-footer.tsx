import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";

import { Container } from "@/components/ui/container";
import { NAV_LINKS, SITE } from "@/lib/constants";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-line bg-paper-2">
      <Container className="grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-xl text-ink">Virgin Estate</span>
            <span className="text-[0.6rem] font-medium uppercase tracking-[0.28em] text-sand">
              Agents
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            {SITE.description}
          </p>
        </div>

        <div>
          <h4 className="font-serif text-base text-ink">Explore</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-muted transition-colors hover:text-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-serif text-base text-ink">Get in touch</h4>
          <ul className="mt-4 space-y-3 text-sm text-muted">
            <li className="flex items-start gap-2.5">
              <MapPin size={16} className="mt-0.5 shrink-0 text-sand" />
              <span>{SITE.address}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone size={16} className="shrink-0 text-sand" />
              <a
                href={`tel:${SITE.phone.replace(/\s/g, "")}`}
                className="transition-colors hover:text-ink"
              >
                {SITE.phone}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail size={16} className="shrink-0 text-sand" />
              <a
                href={`mailto:${SITE.email}`}
                className="transition-colors hover:text-ink"
              >
                {SITE.email}
              </a>
            </li>
          </ul>
        </div>
      </Container>

      <div className="border-t border-line">
        <Container className="flex flex-col items-center justify-between gap-3 py-6 text-xs text-muted sm:flex-row">
          <p>
            © {year} {SITE.name}. All rights reserved.
          </p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
          </div>
        </Container>
      </div>
    </footer>
  );
}
