import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Phone, Mail, MessageCircle, ArrowRight } from "lucide-react";

import { Container } from "@/components/ui/container";
import { whatsappLink } from "@/lib/utils";

/** "Tendai Marufu" -> "TM" for an elegant photo placeholder. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Render per-request so team edits appear immediately on deploy, instead of
// being frozen in Cloudflare's edge cache for a year (static default).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our agents",
  description: "Meet the Virgin Estate Agents team in Harare.",
};

type TeamMember = {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  photoUrl: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  specialties?: string[];
  meta?: string;
};

// The displayed team — hardcoded here (this page does NOT read the database or
// admin panel, so agent edits live in this file). Emails and phones are exposed
// only as clickable icons, never as text. Agents without a headshot fall back to
// an elegant initials card.
// Order matters for the layout: the first three fill the top row and the
// Director (last) sits centred on the row below. Photos for Kevin, Spencer and
// Grant are temporary free stock placeholders — swap in the client's real
// headshots at the same paths when they arrive.
const TEAM: TeamMember[] = [
  {
    id: "team-kevin",
    name: "Kevin Michael Higgins",
    title: "Property Consultant",
    bio: "Kevin guides buyers and sellers across Harare's residential market with patience, sharp local insight and a genuine eye for the right fit — keeping every step considered, transparent and unhurried.",
    photoUrl: "/images/agents/kevin.jpg",
    whatsapp: "+263 712 602 565",
    phone: "+263 712 602 565",
    email: "kevinh@ccsales.co.zw",
  },
  {
    id: "team-spencer",
    name: "Spencer Harron Murray",
    title: "Property Consultant",
    bio: "Spencer pairs a straightforward, client-first approach with strong local knowledge, helping buyers and investors move with confidence and secure the right property at the right price.",
    photoUrl: "/images/agents/spencer.jpg",
    whatsapp: "+263 772 448 822",
    phone: "+263 772 448 822",
    email: "spencer@virtrust.com",
  },
  {
    id: "team-boyd",
    name: "Boyd Michael Littleford",
    title: "Manager",
    bio: "Boyd manages our sales team with a sharp eye for Harare's prime northern suburbs and a calm, considered approach to every deal — making sure every client feels well looked after from first viewing to close.",
    photoUrl: "/images/agents/boyd-littleford-2.jpg",
    whatsapp: "+263 775 472 523",
    phone: "+263 775 472 523",
    email: "boyd@virtrust.com",
  },
  {
    id: "team-grant",
    name: "Grant Michael Littleford",
    title: "Director",
    bio: "Grant leads Virgin Estate Agents, pairing deep local market knowledge with a hands-on, principled approach to every sale and acquisition — and a genuine commitment to doing right by every client.",
    photoUrl: "/images/agents/grant.jpg",
    whatsapp: "+263 712 607 060",
    phone: "+263 712 607 060",
    email: "grant@virtrust.com",
  },
];

export default function AgentsPage() {
  const team = TEAM;

  return (
    <Container className="py-14 sm:py-20">
      <div className="agents-intro">
        <p className="agents-intro-kicker">Our agents</p>
        <div className="agents-intro-grid">
          <h1>Local knowledge. Careful guidance. Better property decisions.</h1>
          <div className="agents-intro-copy">
            <p>
              Virgin Estate connects buyers, sellers and investors with
              carefully selected residential and commercial property across
              Harare — supported by honest advice, clear communication and a
              calm, professional process.
            </p>
            <div className="agents-trust-points">
              <span>Harare-based expertise</span>
              <span>Residential &amp; commercial</span>
              <span>Private viewings</span>
              <span>Straightforward advice</span>
            </div>
          </div>
        </div>
      </div>

      {team.length === 0 ? (
        <p className="mt-12 text-muted">Our team will be listed here soon.</p>
      ) : (
        <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-6">
          {team.map((a, i) => {
            const wa = whatsappLink(a.whatsapp);
            // 3 across on large screens (each card spans 2 of 6 columns); the
            // Director (4th card) is centred on its own row, in line with the trio.
            const centred = team.length === 4 && i === 3 ? " lg:col-start-3" : "";
            return (
              <div key={a.id} className={`lg:col-span-2${centred}`}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-paper-2">
                  {a.photoUrl ? (
                    <Image
                      src={a.photoUrl}
                      alt={a.name}
                      fill
                      sizes="(max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="agent-photo-placeholder">
                      <span>{initials(a.name)}</span>
                    </div>
                  )}
                </div>
                <h2 className="mt-4 font-serif text-xl text-ink">{a.name}</h2>
                {a.title && <p className="text-sm text-sand">{a.title}</p>}
                {a.bio && <p className="mt-2 text-sm leading-relaxed text-muted">{a.bio}</p>}
                {a.specialties && a.specialties.length > 0 && (
                  <p className="mt-3 text-sm text-muted">
                    <span className="text-ink-soft">Specialises in</span>{" "}
                    {a.specialties.join(" · ")}
                  </p>
                )}
                {a.meta && (
                  <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-sand">
                    {a.meta}
                  </p>
                )}
                {(wa || a.phone || a.email || a.specialties) && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`WhatsApp ${a.name}`}
                        className="rounded-full border border-line p-2 text-ink-soft hover:bg-paper-2"
                      >
                        <MessageCircle size={16} />
                      </a>
                    )}
                    {a.phone && (
                      <a
                        href={`tel:${a.phone.replace(/\s/g, "")}`}
                        aria-label={`Call ${a.name}`}
                        className="rounded-full border border-line p-2 text-ink-soft hover:bg-paper-2"
                      >
                        <Phone size={16} />
                      </a>
                    )}
                    {a.email && (
                      <a
                        href={`mailto:${a.email}`}
                        aria-label={`Email ${a.name}`}
                        className="rounded-full border border-line p-2 text-ink-soft hover:bg-paper-2"
                      >
                        <Mail size={16} />
                      </a>
                    )}
                    {!wa && !a.phone && !a.email && a.specialties && (
                      <Link
                        href="/contact"
                        className="group inline-flex items-center gap-1.5 text-sm text-brand hover:text-brand-700"
                      >
                        <span className="link-underline">Get in touch</span>
                        <ArrowRight
                          size={14}
                          className="transition-transform duration-300 ease-out group-hover:translate-x-1"
                        />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Container>
  );
}
