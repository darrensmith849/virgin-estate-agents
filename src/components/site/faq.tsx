import { ChevronDown } from "lucide-react";

import { Container } from "@/components/ui/container";

const FAQS: { q: string; a: string }[] = [
  {
    q: "Are your prices in USD?",
    a: "Yes. Everything we list is priced transparently in US dollars, with no hidden mark-ups or surprises.",
  },
  {
    q: "Which areas do you cover?",
    a: "Harare's most sought-after suburbs — Borrowdale, Borrowdale Brooke, Highlands, Mount Pleasant, Avondale, Chisipite and more across the north and northeast.",
  },
  {
    q: "How do I arrange a viewing?",
    a: "Send an enquiry from any listing, or call or WhatsApp us, and we'll arrange a private viewing at a time that suits you.",
  },
  {
    q: "Do you handle rentals as well as sales?",
    a: "We do — sales, lettings and full property management, looking after both landlords and tenants.",
  },
  {
    q: "I'm thinking of selling. What's the first step?",
    a: "Request a free, confidential valuation. We'll assess your property honestly and explain exactly how we'd market it.",
  },
  {
    q: "Do you deal with commercial property?",
    a: "Yes — offices, retail, industrial space and land for owners, investors and developers.",
  },
  {
    q: "How quickly will you respond?",
    a: "We typically reply within one business day, and often much sooner.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export function Faq() {
  return (
    <section className="reveal py-20 sm:py-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Container>
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-sand">
            Good to know
          </p>
          <h2 className="mt-4 text-3xl sm:text-4xl">Questions, answered.</h2>
        </div>

        <div className="mt-10 max-w-3xl divide-y divide-line border-y border-line">
          {FAQS.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg text-ink [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown
                  size={18}
                  className="shrink-0 text-sand transition-transform duration-300 ease-out group-open:rotate-180"
                />
              </summary>
              <p className="pb-5 pr-8 text-sm leading-relaxed text-muted">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
