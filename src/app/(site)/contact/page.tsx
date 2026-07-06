import type { Metadata } from "next";
import { MapPin, Mail, MessageCircle, Clock } from "lucide-react";

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
              <div className="flex flex-col gap-1">
                <a href={`mailto:${email}`} className="text-ink-soft hover:text-ink">
                  {email}
                </a>
                <a href={`mailto:${kevinEmail}`} className="text-ink-soft hover:text-ink">
                  {kevinEmail}
                </a>
              </div>
            </li>
            {wa && (
              <li className="flex items-start gap-3">
                <MessageCircle className="mt-0.5 shrink-0 text-sand" size={18} />
                <div className="flex flex-col gap-3">
                  <a href={wa} target="_blank" rel="noreferrer" className="group text-ink-soft hover:text-ink">
                    <span className="block font-medium text-ink">{SITE.contactName}</span>
                    <span className="text-muted group-hover:text-ink">
                      {whatsappNumber}
                    </span>
                  </a>
                  {kevinWa && (
                    <a href={kevinWa} target="_blank" rel="noreferrer" className="group text-ink-soft hover:text-ink">
                      <span className="block font-medium text-ink">{kevinName}</span>
                      <span className="text-muted group-hover:text-ink">
                        {kevinPhone}
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
