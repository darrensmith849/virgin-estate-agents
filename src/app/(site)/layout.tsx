import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { WhatsappFab } from "@/components/site/whatsapp-fab";
import { AiAssistant } from "@/components/site/ai-assistant";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-[var(--radius)] focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content" className="ve-content-shell flex-1">
        {children}
        <SiteFooter />
      </main>
      <WhatsappFab />
      <AiAssistant />
    </>
  );
}
