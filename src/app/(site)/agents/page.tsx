import type { Metadata } from "next";
import Image from "next/image";
import { Phone, Mail, MessageCircle } from "lucide-react";

import { Container } from "@/components/ui/container";
import { listActiveAgents } from "@/lib/data/agents";
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

export default async function AgentsPage() {
  const team = await listActiveAgents();

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
                {(wa || a.phone || a.email) && (
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
