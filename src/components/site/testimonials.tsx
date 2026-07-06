import { Container } from "@/components/ui/container";

/*
 * Testimonials — client social proof. Placeholder quotes; replace with the
 * client's real reviews (and add/remove cards) when supplied.
 */
const TESTIMONIALS: { quote: string; name: string; location: string }[] = [
  {
    quote:
      "Virgin Estate made selling our Borrowdale home effortless — honest advice, beautiful photography, and a serious buyer within weeks.",
    name: "The Moyo family",
    location: "Borrowdale",
  },
  {
    quote:
      "Calm, professional and genuinely knowledgeable about Highlands. We felt looked after from the first viewing to the final signature.",
    name: "Sarah & James",
    location: "Highlands",
  },
  {
    quote:
      "They understood exactly what we were after and never wasted our time. We found the right home in Mount Pleasant faster than we imagined.",
    name: "T. Ncube",
    location: "Mount Pleasant",
  },
];

export function Testimonials() {
  return (
    <section className="reveal py-16 sm:py-24">
      <Container>
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-sand">
            What our clients say
          </p>
          <h2 className="mt-4 text-3xl sm:text-4xl">
            Trusted across Harare&rsquo;s finest suburbs.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="ve-card flex flex-col rounded-2xl p-7">
              <blockquote className="font-serif text-lg leading-relaxed text-ink">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-5 text-sm">
                <span className="font-medium text-ink">{t.name}</span>
                <span className="text-muted"> · {t.location}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}
