import type { Metadata } from "next";
import { MapPin, Mail, Clock, ArrowUpRight, Building2 } from "lucide-react";

import { Container } from "@/components/ui/container";
import { WhatsappIcon } from "@/components/site/whatsapp-icon";
import { EnquiryForm } from "@/components/listings/enquiry-form";
import { PropertyMap } from "@/components/listings/property-map";
import { SITE } from "@/lib/constants";
import { OFFICE_COORDS } from "@/lib/suburb-coords";
import { addressDirectionsUrls } from "@/lib/maps";
import { formatPhone, whatsappLink } from "@/lib/utils";
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
 * The contact cards share one look: a round badge and a title, a divider,
 * then rows that each fill the card's width — icon, a small label over the
 * detail, and an arrow when the row goes somewhere — so everything lines up
 * whatever the length of a name, number or address.
 */
const ROW =
  "group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-paper-2";
const CHIP =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand/10 text-sand transition-colors group-hover:bg-brand group-hover:text-white";

function RowText({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="min-w-0">
      <span className="block text-xs text-muted">{label}</span>
      <span className="block text-sm text-ink">{children}</span>
    </span>
  );
}

function RowArrow() {
  return (
    <ArrowUpRight
      size={16}
      aria-hidden
      className="ml-auto shrink-0 text-muted transition-colors group-hover:text-brand"
    />
  );
}

function CardHeader({ badge, title, subtitle }: { badge: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 font-serif text-base text-brand"
      >
        {badge}
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{title}</p>
        <p className="text-xs text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

/* The office: where it is (opens directions) and when it's open. */
function OfficeCard({ address, hours }: { address: string; hours: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <CardHeader badge={<Building2 size={20} />} title="Our office" subtitle={SITE.name} />
      <div className="mt-4 grid gap-1 border-t border-line pt-3 lg:grid-cols-2 lg:gap-x-4">
        <a
          href={addressDirectionsUrls(address).google}
          target="_blank"
          rel="noreferrer"
          aria-label={`Get directions to ${address}`}
          className={ROW}
        >
          <span className={CHIP}>
            <MapPin size={16} />
          </span>
          <RowText label="Address · get directions">{address}</RowText>
          <RowArrow />
        </a>
        <div className="-mx-2 flex items-center gap-3 px-2 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand/10 text-sand">
            <Clock size={16} />
          </span>
          <RowText label="Opening hours">
            {hours.split(" · ").map((part) => (
              <span key={part} className="block">
                {part}
              </span>
            ))}
          </RowText>
        </div>
      </div>
    </div>
  );
}

/* One card per person: who they are, then a WhatsApp row and an email row. */
function PersonCard({ person }: { person: Person }) {
  const initials = person.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <CardHeader badge={initials} title={person.name} subtitle={person.role} />
      <div className="mt-4 grid gap-1 border-t border-line pt-3 lg:grid-cols-2 lg:gap-x-4">
        {person.whatsappHref && (
          <a
            href={person.whatsappHref}
            target="_blank"
            rel="noreferrer"
            aria-label={`Message ${person.name} on WhatsApp`}
            className={ROW}
          >
            <span className={CHIP}>
              <WhatsappIcon size={16} />
            </span>
            <RowText label="WhatsApp">{person.whatsapp}</RowText>
            <RowArrow />
          </a>
        )}
        <a href={person.mailto} aria-label={`Email ${person.name}`} className={ROW}>
          <span className={CHIP}>
            <Mail size={16} />
          </span>
          <RowText label="Email">
            <span className="block truncate">{person.email}</span>
          </RowText>
          <RowArrow />
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
      whatsapp: formatPhone(whatsappNumber),
      whatsappHref: wa,
      email,
      mailto: `mailto:${email}?cc=${kevinEmail}`,
    },
    {
      name: kevinName,
      role: "Property Consultant",
      whatsapp: formatPhone(kevinPhone),
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

          <div className="mt-4">
            <OfficeCard address={address} hours={SITE.hours} />
          </div>

          <div className="mt-10">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-sand">
              What happens next
            </p>
            <ol className="mt-4 space-y-3 text-sm text-ink-soft">
              {[
                "We read your message and match you to the right agent.",
                "A local agent calls or emails you — usually within one business day.",
                "We line up private viewings, or a confidential valuation.",
              ].map((step, i) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sand/10 font-serif text-xs text-sand">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
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

      <div id="office-map" className="mt-14 scroll-mt-24">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-sand">Find us</p>
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
