import type { Metadata } from "next";
import { MapPin, Mail, MessageCircle, Clock, ArrowRight } from "lucide-react";

import { Container } from "@/components/ui/container";
import { EnquiryForm } from "@/components/listings/enquiry-form";
import { PropertyMap } from "@/components/listings/property-map";
import { SITE } from "@/lib/constants";
import { OFFICE_COORDS } from "@/lib/suburb-coords";
import { addressDirectionsUrls } from "@/lib/maps";
import { whatsappLink } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${SITE.name} in Harare, Zimbabwe.`,
};

// force-dynamic so contact-detail edits in config deploy live (avoids the
// 1-year static cache); the page no longer depends on the database.
export const dynamic = "force-dynamic";

/** WhatsApp glyph — same mark as the floating WhatsApp button, for the
 *  inline "message me" buttons beside each contact. */
function WhatsappGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.2 4.74 1.2h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 0 1-1.26-4.39c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.25 8.24zm4.52-6.17c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.39.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z" />
    </svg>
  );
}

export default function ContactPage() {
  // Canonical contact details come from config so a stale settings row can't
  // override them (the DB still held old placeholder values).
  const email = SITE.email;
  const address = SITE.address;
  const whatsappNumber = SITE.whatsapp;
  const wa = whatsappLink(whatsappNumber);

  // Secondary contact — Kevin Higgins (Property Consultant), shown under Boyd.
  const kevinName = "Kevin Higgins";
  const kevinEmail = "kevinh@ccsales.co.zw";
  const kevinPhone = "+263 712 602 565";
  const kevinWa = whatsappLink(kevinPhone);

  return (
    <Container className="py-14 sm:py-20">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-sand">
            Contact
          </p>
          <h1 className="mt-4 text-4xl sm:text-5xl">Let&rsquo;s talk.</h1>
          <p className="mt-4 max-w-md text-muted">
            Whether you&rsquo;re buying, selling or renting, we&rsquo;d love to
            help. Reach out and a member of our team will get back to you.
          </p>

          <ul className="mt-10 space-y-5">
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 shrink-0 text-sand" size={18} />
              <a
                href={addressDirectionsUrls(address).google}
                target="_blank"
                rel="noreferrer"
                className="group"
              >
                <span className="block text-ink-soft transition-colors group-hover:text-ink">
                  {address}
                </span>
                <span className="mt-0.5 block text-xs font-medium text-sand transition-colors group-hover:text-brand">
                  Get directions
                </span>
              </a>
            </li>
            <li className="flex items-start gap-3">
              <Mail className="mt-0.5 shrink-0 text-sand" size={18} />
              {/* Each email opens a pre-addressed draft with the other agent
                  CC'd, so a reply reaches both. The arrow is the click cue. */}
              <div className="flex flex-col gap-2.5">
                <a
                  href={`mailto:${email}?cc=${kevinEmail}`}
                  aria-label={`Email ${email} (copies in ${kevinName})`}
                  className="group inline-flex items-center gap-2.5 text-ink-soft hover:text-ink"
                >
                  <span>{email}</span>
                  <span
                    aria-hidden="true"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-sand/40 bg-sand/10 text-sand transition-colors group-hover:border-brand group-hover:bg-brand group-hover:text-white"
                  >
                    <ArrowRight size={14} />
                  </span>
                </a>
                <a
                  href={`mailto:${kevinEmail}?cc=${email}`}
                  aria-label={`Email ${kevinEmail} (copies in ${SITE.contactName})`}
                  className="group inline-flex items-center gap-2.5 text-ink-soft hover:text-ink"
                >
                  <span>{kevinEmail}</span>
                  <span
                    aria-hidden="true"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-sand/40 bg-sand/10 text-sand transition-colors group-hover:border-brand group-hover:bg-brand group-hover:text-white"
                  >
                    <ArrowRight size={14} />
                  </span>
                </a>
              </div>
            </li>
            {wa && (
              <li className="flex items-start gap-3">
                <MessageCircle className="mt-0.5 shrink-0 text-sand" size={18} />
                {/* Each contact is a WhatsApp link; the green WhatsApp button is
                    the click cue, mirroring the email arrows above. */}
                <div className="flex flex-col gap-4">
                  <a
                    href={wa}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Message ${SITE.contactName} on WhatsApp`}
                    className="group inline-flex items-center gap-3 text-ink-soft hover:text-ink"
                  >
                    <span className="flex flex-col">
                      <span className="font-medium text-ink">{SITE.contactName}</span>
                      <span className="text-muted group-hover:text-ink">{whatsappNumber}</span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-transform group-hover:scale-105"
                    >
                      <WhatsappGlyph className="h-4 w-4" />
                    </span>
                  </a>
                  {kevinWa && (
                    <a
                      href={kevinWa}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Message ${kevinName} on WhatsApp`}
                      className="group inline-flex items-center gap-3 text-ink-soft hover:text-ink"
                    >
                      <span className="flex flex-col">
                        <span className="font-medium text-ink">{kevinName}</span>
                        <span className="text-muted group-hover:text-ink">{kevinPhone}</span>
                      </span>
                      <span
                        aria-hidden="true"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-transform group-hover:scale-105"
                      >
                        <WhatsappGlyph className="h-4 w-4" />
                      </span>
                    </a>
                  )}
                </div>
              </li>
            )}
            <li className="flex items-start gap-3">
              <Clock className="mt-0.5 shrink-0 text-sand" size={18} />
              <span className="text-ink-soft">{SITE.hours}</span>
            </li>
          </ul>

          <div className="mt-10">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-sand">
              What happens next
            </p>
            <ol className="mt-4 space-y-3 text-sm text-ink-soft">
              <li className="flex gap-3">
                <span className="font-serif text-sand">1</span>
                We read your message and match you to the right agent.
              </li>
              <li className="flex gap-3">
                <span className="font-serif text-sand">2</span>
                A local agent calls or emails you — usually within one business
                day.
              </li>
              <li className="flex gap-3">
                <span className="font-serif text-sand">3</span>
                We line up private viewings, or a confidential valuation.
              </li>
            </ol>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-card p-6 sm:p-8">
          <h2 className="text-xl">Send us a message</h2>
          <p className="mt-1 mb-5 text-sm text-muted">
            We typically reply within one business day.
          </p>
          <EnquiryForm />
        </div>
      </div>

      <div id="office-map" className="mt-12 scroll-mt-24">
        <PropertyMap
          latitude={OFFICE_COORDS.lat}
          longitude={OFFICE_COORDS.lng}
          label={`${SITE.shortName} — ${address}`}
          directionsAddress={address}
        />
      </div>
    </Container>
  );
}
