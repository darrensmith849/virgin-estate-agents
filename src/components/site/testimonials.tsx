import { Container } from "@/components/ui/container";

export type TestimonialItem = { quote: string; name: string; area?: string };

/*
 * "What our clients say": real client quotes, managed in Settings →
 * Testimonials. With none saved, the section isn't shown at all.
 */
export function Testimonials({ items }: { items: TestimonialItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="reveal py-16 sm:py-24">
      <Container>
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-sand">
            What our clients say
          </p>
          <h2 className="mt-4 text-3xl sm:text-4xl">
            Trusted across Zimbabwe.
          </h2>
        </div>

        <div
          className={`mt-12 grid gap-6 ${items.length === 1 ? "max-w-2xl" : items.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}
        >
          {items.map((t, i) => (
            <figure key={i} className="ve-card flex flex-col rounded-2xl p-7">
              <blockquote className="font-serif text-lg leading-relaxed text-ink">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-5 text-sm">
                <span className="font-medium text-ink">{t.name}</span>
                {t.area && <span className="text-muted"> · {t.area}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}
