import Link from "next/link";
import { Mail, Clock, MessageCircle } from "lucide-react";

import { Container } from "@/components/ui/container";
import { OfficeMapDialog } from "@/components/site/office-map-dialog";
import { NAV_LINKS, SITE } from "@/lib/constants";
import { OFFICE_COORDS } from "@/lib/suburb-coords";
import { slugifySuburb } from "@/lib/suburbs";
import { whatsappLink } from "@/lib/utils";

const FOOTER_AREAS = ["Borrowdale", "Highlands", "Mount Pleasant", "Avondale"];

// Brand glyphs as inline SVG paths (lucide-react no longer ships brand logos).
const SOCIAL_LINKS = [
  {
    key: "instagram",
    label: "Instagram",
    path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
  },
  {
    key: "facebook",
    label: "Facebook",
    path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();
  const wa = whatsappLink(SITE.whatsapp);
  const socials = SOCIAL_LINKS.flatMap((s) => {
    const href = SITE.social[s.key];
    return href ? [{ ...s, href }] : [];
  });

  return (
    <footer className="border-t border-black/10 bg-transparent">
      <Container className="grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex flex-col leading-none">
            <span className="font-serif text-xl text-ink">Virgin Estate Agents</span>
            <span className="mt-1 text-[0.6rem] font-medium uppercase tracking-[0.24em] text-sand">
              &amp; Property Consultants
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            {SITE.description}
          </p>
          <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-sand">
            {SITE.registration}
          </p>

          {/* Social — only the accounts that actually exist are shown. An icon
              with nowhere to go reads as a broken link, so unset keys in
              SITE.social are omitted entirely rather than rendered inert. */}
          {socials.length > 0 && (
            <div className="mt-6 flex items-center gap-2.5">
              {socials.map((s) => (
                <a
                  key={s.key}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-brand hover:bg-brand hover:text-white"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="15"
                    height="15"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          )}
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

          <h4 className="mt-8 font-serif text-base text-ink">Popular areas</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {FOOTER_AREAS.map((name) => (
              <li key={name}>
                <Link
                  href={`/guides/${slugifySuburb(name)}`}
                  className="text-muted transition-colors hover:text-ink"
                >
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-serif text-base text-ink">Get in touch</h4>
          <ul className="mt-5 space-y-4 text-sm text-muted">
            <li>
              <OfficeMapDialog
                address={SITE.address}
                latitude={OFFICE_COORDS.lat}
                longitude={OFFICE_COORDS.lng}
                label={SITE.shortName}
              />
            </li>
            <li className="flex items-start gap-3">
              <Mail size={16} className="mt-0.5 shrink-0 text-sand" />
              <a
                href={`mailto:${SITE.email}`}
                className="break-all leading-relaxed transition-colors hover:text-ink"
              >
                {SITE.email}
              </a>
            </li>
            {wa && (
              <li className="flex items-start gap-3">
                <MessageCircle size={16} className="mt-0.5 shrink-0 text-sand" />
                <a
                  href={wa}
                  target="_blank"
                  rel="noreferrer"
                  className="group leading-relaxed transition-colors hover:text-ink"
                >
                  <span className="block font-medium text-ink">
                    {SITE.contactName}
                  </span>
                  <span className="text-muted transition-colors group-hover:text-ink">
                    {SITE.whatsapp}
                  </span>
                </a>
              </li>
            )}
            <li className="flex items-start gap-3">
              <Clock size={16} className="mt-0.5 shrink-0 text-sand" />
              <span className="leading-relaxed">
                {SITE.hours.split(" · ").map((part) => (
                  <span key={part} className="block">
                    {part}
                  </span>
                ))}
              </span>
            </li>
          </ul>
        </div>
      </Container>

      {/* Extra bottom padding on phones so the floating WhatsApp/assistant
          buttons never sit on top of the last row of links. */}
      <div className="border-t border-line">
        <Container className="flex flex-col items-center justify-between gap-3 py-6 pb-24 text-xs text-muted sm:flex-row sm:pb-6">
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
