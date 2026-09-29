import type { Metadata } from "next";
import { MapPin, Mail, Clock, ArrowUpRight } from "lucide-react";

import { Container } from "@/components/ui/container";
import { WhatsappIcon } from "@/components/site/whatsapp-icon";
import { EnquiryForm } from "@/components/listings/enquiry-form";
import { PropertyMap } from "@/components/listings/property-map";
import { SITE } from "@/lib/constants";
import { OFFICE_COORDS } from "@/lib/suburb-coords";
import { addressDirectionsUrls } from "@/lib/maps";
import { whatsappLink } from "@/lib/utils";
import { getContactDetails } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${SITE.name} — based in Harare, working across Zimbabwe.`,
};

// force-dynamic so contact-detail edits in config deploy live (avoids the
// 1-year static cache); the page no longer depends on the database.
export const dynamic = "force-dynamic";

type Person = {
  name: string;
  role: string;
  whatsapp: string;
  whatsappHref: string | null;
  email: string;
  /** mailto: with the other agent copied in, so a reply reaches both. */
  mailto: string;
};

/*
 * One card per person: who they are, then a WhatsApp row and an email row.
 * Every row is the full width of the card, so the icons, the numbers and the
 * arrows all line up — whatever the length of the address or number.
 */
function PersonCard({ person }: { person: Person }) {
  const initials = person.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const row =
    "group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-paper-2";
  const chip =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand/10 text-sand transition-colors group-hover:bg-brand group-hover:text-white";
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 font-serif text-base text-brand"
        >
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{person.name}</p>
          <p className="text-xs text-muted">{person.role}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-1 border-t border-line pt-3 lg:grid-cols-2 lg:gap-x-4">
        {person.whatsappHref && (
          <a
            href={person.whatsappHref}
            target="_blank"
            rel="noreferrer"
            aria-label={`Message ${person.name} on WhatsApp`}
            className={row}
          >
            <span className={chip}>
              <WhatsappIcon size={16} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs text-muted">WhatsApp</span>
              <span className="block truncate text-sm text-ink">{person.whatsapp}</span>
            </span>
            <ArrowUpRight
              size={16}
              aria-hidden
              className="ml-auto shrink-0 text-muted transition-colors group-hover:text-brand"
            />
          </a>
        )}
        <a href={person.mailto} aria-label={`Email ${person.name}`} className={row}>
          <span className={chip}>
            <Mail size={16} />
          </span>
          <span className="min-w-0">
            <span className="block text-xs text-muted">Email</span>
            <span className="block truncate text-sm text-ink">{person.email}</span>
          </span>
          <ArrowUpRight
            size={16}
            aria-hidden
            className="ml-auto shrink-0 text-muted transition-colors group-hover:text-brand"
          />
        </a>
      </div>
    </div>
  );
}

export default async function ContactPage() {
  // From Settings → Agency details (brought in line with the site's details
  // when this was connected, so editing them there now takes effect).
  const contact = await getContactDetails();
  const email = contact.email;
  const address = contact.address;
  const whatsappNumber = contact.whatsapp;
  const wa = whatsappLink(whatsappNumber);

  // Secondary contact — Kevin Higgins (Property Consultant), shown beside Boyd.
  const kevinName = "Kevin Higgins";
  const kevinEmail = "kevinh@ccsales.co.zw";
  const kevinPhone = "+263 712 602 565";
  const kevinWa = whatsappLink(kevinPhone);

  const people: Person[] = [
    {
      name: SITE.contactName,
      role: "Manager",
      whatsapp: whatsappNumber,
      whatsappHref: wa,
      email,
      mailto: `mailto:${email}?cc=${kevinEmail}`,
    },
    {
      name: kevinName,
      role: "Property Consultant",
      whatsapp: kevinPhone,
      whatsappHref: kevinWa,
      email: kevinEmail,
      mailto: `mailto:${kevinEmail}?cc=${email}`,
    },
  ];

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

          {/* Who to speak to — each with WhatsApp and email. */}
          {/* Side by side on tablets; stacked beside the form on desktop, where
              each card is wide enough for its two actions side by side. */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {people.map((person) => (
              <PersonCard key={person.email} person={person} />
            ))}
          </div>

          <ul className="mt-8 space-y-5">
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
