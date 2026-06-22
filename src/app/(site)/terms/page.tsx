import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `Terms of use for ${SITE.name}.`,
};

export default function TermsPage() {
  return (
    <Container className="py-14 sm:py-20">
      <article className="mx-auto max-w-2xl">
        <h1 className="text-4xl">Terms of Use</h1>
        <p className="mt-4 text-sm text-muted">
          This is a placeholder — please have it reviewed by a legal
          professional before launch.
        </p>
        <div className="mt-8 space-y-5 leading-relaxed text-ink-soft">
          <p>
            By using the {SITE.name} website you agree to these terms. Property
            details, prices and availability are provided in good faith but may
            change without notice and should be confirmed with our team.
          </p>
          <h2 className="text-xl text-ink">Listings</h2>
          <p>
            Listing information is for general guidance only and does not
            constitute an offer or contract. Measurements and descriptions are
            approximate.
          </p>
          <h2 className="text-xl text-ink">Liability</h2>
          <p>
            We make every effort to keep information accurate and up to date but
            accept no liability for any errors or omissions.
          </p>
        </div>
      </article>
    </Container>
  );
}
