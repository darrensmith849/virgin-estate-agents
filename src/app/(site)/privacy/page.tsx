import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE.name} collects, uses and protects your personal information, in line with Zimbabwe's Cyber and Data Protection Act.`,
};

export default function PrivacyPage() {
  return (
    <Container className="py-14 sm:py-20">
      <article className="mx-auto max-w-2xl">
        <h1 className="text-4xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted">Last updated 30 June 2026</p>

        <div className="mt-8 space-y-5 leading-relaxed text-ink-soft">
          <p>
            {SITE.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;)
            is committed to protecting your privacy. This policy explains what
            personal information we collect through this website, how we use and
            safeguard it, and the rights you have. We handle personal information
            in accordance with the Cyber and Data Protection Act [Chapter 12:07]
            of Zimbabwe.
          </p>

          <h2 className="text-xl text-ink">Information we collect</h2>
          <p>
            When you contact us or submit an enquiry, we collect the information
            you choose to give us — typically your name, email address, phone
            number and the details of your message or property requirements. We
            may also collect limited technical information automatically, such as
            your IP address, browser type and the pages you visit, to help the
            site function and to understand how it is used.
          </p>

          <h2 className="text-xl text-ink">How we use your information</h2>
          <p>We use your information to:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>respond to your enquiries and arrange viewings or valuations;</li>
            <li>provide the property services you request;</li>
            <li>
              keep you informed about properties or matters relevant to your
              enquiry;
            </li>
            <li>operate, maintain and improve this website; and</li>
            <li>meet our legal and regulatory obligations.</li>
          </ul>
          <p>
            We rely on your consent, the performance of a service you have
            requested, and our legitimate business interests as the lawful bases
            for processing your information.
          </p>

          <h2 className="text-xl text-ink">Sharing your information</h2>
          <p>
            We do not sell your personal information. We may share it with members
            of our team and with trusted service providers who help us operate
            (for example, email, hosting and analytics providers), and with
            regulators or authorities where we are required to do so by law,
            including the Estate Agents Council of Zimbabwe.
          </p>

          <h2 className="text-xl text-ink">Retention &amp; security</h2>
          <p>
            We keep your information only for as long as necessary to fulfil the
            purposes above or to meet legal requirements, after which it is
            securely deleted. We apply reasonable technical and organisational
            measures to protect your information against loss, misuse and
            unauthorised access.
          </p>

          <h2 className="text-xl text-ink">Your rights</h2>
          <p>
            Under the Cyber and Data Protection Act, you have the right to access
            the personal information we hold about you, to request its correction
            or deletion, to object to or restrict its processing, and to withdraw
            any consent you have given. To exercise these rights, contact us using
            the details below. You may also lodge a complaint with the Postal and
            Telecommunications Regulatory Authority of Zimbabwe (POTRAZ), the
            designated Data Protection Authority.
          </p>

          <h2 className="text-xl text-ink">Cookies &amp; third-party services</h2>
          <p>
            This site uses essential cookies to function, and may use
            privacy-friendly analytics to understand how it is used. Some pages
            embed third-party services, such as maps, which are subject to their
            own privacy practices.
          </p>

          <h2 className="text-xl text-ink">Changes to this policy</h2>
          <p>
            We may update this policy from time to time. The latest version will
            always be available on this page.
          </p>

          <h2 className="text-xl text-ink">Contact</h2>
          <p>
            For any privacy questions, or to exercise your rights, contact us at{" "}
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
