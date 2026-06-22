import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy policy for ${SITE.name}.`,
};

export default function PrivacyPage() {
  return (
    <Container className="py-14 sm:py-20">
      <article className="mx-auto max-w-2xl">
        <h1 className="text-4xl">Privacy Policy</h1>
        <p className="mt-4 text-sm text-muted">
          This is a placeholder policy — please have it reviewed by a legal
          professional before launch.
        </p>
        <div className="mt-8 space-y-5 leading-relaxed text-ink-soft">
          <p>
            {SITE.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) respects your
            privacy. This policy explains what information we collect when you
            use our website and how we use it.
          </p>
          <h2 className="text-xl text-ink">Information we collect</h2>
          <p>
            When you submit an enquiry, we collect the name, email address,
            phone number and message you provide, so that we can respond to you.
          </p>
          <h2 className="text-xl text-ink">How we use it</h2>
          <p>
            We use your details solely to respond to your enquiry and to provide
            the services you request. We do not sell your personal information.
          </p>
          <h2 className="text-xl text-ink">Contact</h2>
          <p>
            For any privacy questions, contact us at{" "}
            <a href={`mailto:${SITE.email}`} className="text-brand hover:underline">
              {SITE.email}
            </a>
            .
          </p>
        </div>
      </article>
    </Container>
  );
}
