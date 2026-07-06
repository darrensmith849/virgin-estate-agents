import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `The terms governing your use of the ${SITE.name} website, under the laws of Zimbabwe.`,
};

export default function TermsPage() {
  return (
    <Container className="py-14 sm:py-20">
      <article className="mx-auto max-w-2xl">
        <h1 className="text-4xl">Terms of Use</h1>
        <p className="mt-3 text-sm text-muted">Last updated 30 June 2026</p>

        <div className="mt-8 space-y-5 leading-relaxed text-ink-soft">
          <p>
            These terms govern your use of the {SITE.name} website. By accessing
            or using this site, you agree to them. If you do not agree, please do
            not use the site. We conduct our estate agency business in accordance
            with the Estate Agents Act [Chapter 27:17] of Zimbabwe.
          </p>

          <h2 className="text-xl text-ink">Property listings &amp; information</h2>
          <p>
            Property details, prices, measurements, images and availability are
            provided in good faith and for general guidance only. They do not
            constitute an offer, representation or contract, may change without
            notice, and should be independently verified with our team before you
            rely on them. Prices are quoted in United States dollars (USD) unless
            stated otherwise.
          </p>

          <h2 className="text-xl text-ink">No agency relationship</h2>
          <p>
            Browsing this website does not create an estate agency, mandate or
            contractual relationship between you and us. Any such relationship
            arises only through a separate, express agreement.
          </p>

          <h2 className="text-xl text-ink">Viewings, valuations &amp; advice</h2>
          <p>
            Viewings and valuations are arranged by appointment. Information on
            this site is not financial, legal, tax or investment advice; you
            should obtain independent professional advice before making any
            property decision.
          </p>

          <h2 className="text-xl text-ink">Intellectual property</h2>
          <p>
            All content on this site — including text, branding, photographs and
            design — is owned by or licensed to us and may not be copied,
            reproduced or used without our written permission.
          </p>

          <h2 className="text-xl text-ink">Acceptable use</h2>
          <p>
            You agree to use this site lawfully, and not to misuse it, interfere
            with its operation, or submit false, unlawful or misleading
            information through our forms.
          </p>

          <h2 className="text-xl text-ink">Limitation of liability</h2>
          <p>
            This website is provided on an &ldquo;as is&rdquo; basis. While we
            take care to keep information accurate and current, we accept no
            liability for any errors or omissions, or for any loss arising from
            reliance on the site, to the fullest extent permitted by law.
          </p>

          <h2 className="text-xl text-ink">Regulation &amp; governing law</h2>
          <p>
            Our estate agency practice is regulated under the Estate Agents Act
            [Chapter 27:17] and the Estate Agents Council of Zimbabwe. These terms
            are governed by the laws of Zimbabwe, and the courts of Zimbabwe have
            jurisdiction over any dispute arising from them.
          </p>

          <h2 className="text-xl text-ink">Changes to these terms</h2>
          <p>
            We may update these terms from time to time. The current version will
            always be available on this page.
          </p>

          <h2 className="text-xl text-ink">Contact</h2>
          <p>
            Questions about these terms? Contact us at{" "}
            <a
              href={`mailto:${SITE.email}`}
              className="text-brand hover:underline"
            >
              {SITE.email}
            </a>
            .
          </p>
        </div>
      </article>
    </Container>
  );
}
