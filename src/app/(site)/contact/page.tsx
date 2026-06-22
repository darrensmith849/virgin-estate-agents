import type { Metadata } from "next";
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react";

import { Container } from "@/components/ui/container";
import { EnquiryForm } from "@/components/listings/enquiry-form";
import { getAgencySettings } from "@/lib/data/settings";
import { SITE } from "@/lib/constants";
import { whatsappLink } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${SITE.name} in Harare, Zimbabwe.`,
};

export default async function ContactPage() {
  const s = await getAgencySettings();
  const phone = s.phone || SITE.phone;
  const email = s.email || SITE.email;
  const address = s.officeAddress || SITE.address;
  const wa = whatsappLink(s.whatsapp || SITE.whatsapp);

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
              <span className="text-ink-soft">{address}</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="shrink-0 text-sand" size={18} />
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="text-ink-soft hover:text-ink">
                {phone}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="shrink-0 text-sand" size={18} />
              <a href={`mailto:${email}`} className="text-ink-soft hover:text-ink">
                {email}
              </a>
            </li>
            {wa && (
              <li className="flex items-center gap-3">
                <MessageCircle className="shrink-0 text-sand" size={18} />
                <a href={wa} target="_blank" rel="noreferrer" className="text-ink-soft hover:text-ink">
                  Message us on WhatsApp
                </a>
              </li>
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-line bg-card p-6 sm:p-8">
          <h2 className="text-xl">Send us a message</h2>
          <p className="mt-1 mb-5 text-sm text-muted">
            We typically reply within one business day.
          </p>
          <EnquiryForm />
        </div>
      </div>
    </Container>
  );
}
