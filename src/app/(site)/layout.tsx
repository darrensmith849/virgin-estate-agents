import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { WhatsappFab } from "@/components/site/whatsapp-fab";
import { AiAssistant } from "@/components/site/ai-assistant";
import { getContactDetails, type ContactDetails } from "@/lib/data/settings";
import { SITE } from "@/lib/constants";

/** RealEstateAgent structured data for search engines, with the agency's
 *  contact details from Settings. */
function orgSchema(contact: ContactDetails) {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: SITE.name,
    description: SITE.description,
    url: SITE.url,
    image: `${SITE.url}/og-image.jpg`,
    logo: `${SITE.url}/og-image.jpg`,
    telephone: contact.whatsapp,
    email: contact.email,
    priceRange: "$$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: contact.address,
      addressLocality: SITE.city,
      addressCountry: "ZW",
    },
    areaServed: { "@type": "Country", name: SITE.country },
    knowsAbout: ["Borrowdale", "Highlands", "Mount Pleasant", "Avondale", "Chisipite", "Glen Lorne"],
  };
}

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Settings → Agency details: the mobile menu's phone, and search engines.
  const contact = await getContactDetails();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema(contact)) }}
      />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-[var(--radius)] focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <SiteHeader phone={contact.phone} />
      <main id="main-content" className="ve-content-shell flex-1">
        {children}
        <SiteFooter />
      </main>
      <WhatsappFab />
      <AiAssistant />
    </>
  );
}
