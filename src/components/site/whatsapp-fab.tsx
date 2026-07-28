import { SITE } from "@/lib/constants";
import { whatsappLink } from "@/lib/utils";
import { WhatsappIcon } from "@/components/site/whatsapp-icon";

/*
 * Floating WhatsApp quick-contact button — fixed bottom-right on every site
 * page. Renders nothing if no WhatsApp number is configured. Pure CSS hover +
 * entrance (reduced-motion is handled globally), so no client JS is shipped.
 */
export function WhatsappFab() {
  const href = whatsappLink(
    SITE.whatsapp,
    `Hi ${SITE.name}, I'd like to enquire about a property.`,
  );
  if (!href) return null;

  // Sits directly above the assistant button; both shrink on phones so the
  // pair covers as little of the page as possible.
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fade-up fixed bottom-[4.75rem] right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/30 transition-transform duration-300 ease-out hover:scale-105 hover:bg-brand-700 sm:bottom-24 sm:right-6 sm:h-14 sm:w-14"
    >
      <WhatsappIcon className="h-6 w-6 sm:h-7 sm:w-7" />
    </a>
  );
}
