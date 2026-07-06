import { Container } from "@/components/ui/container";
import { CountUp } from "@/components/site/count-up";
import { HARARE_SUBURBS } from "@/lib/constants";

/*
 * StatsBand — a premium "by the numbers" band for the business' track record.
 * The headline figures are placeholders: replace with the client's real numbers.
 * "Harare suburbs" is derived from the live suburb list so it stays truthful.
 */
const STATS: { value: string; label: string }[] = [
  { value: "$120M+", label: "Property sold" },
  { value: "450+", label: "Homes matched" },
  { value: `${HARARE_SUBURBS.length}+`, label: "Harare suburbs" },
  { value: "12 yrs", label: "Local expertise" },
];

export function StatsBand({
  heading = "Our track record",
}: {
  heading?: string;
}) {
  return (
    <section className="reveal py-12 sm:py-16">
      <Container>
        <div className="ve-card rounded-2xl px-6 py-10 sm:px-12 sm:py-12">
          <p className="text-center text-xs font-medium uppercase tracking-[0.3em] text-sand">
            {heading}
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-serif text-4xl leading-none text-brand tabular-nums sm:text-5xl">
                  <CountUp value={s.value} />
                </dd>
                <p className="mt-2.5 text-sm text-muted">{s.label}</p>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}
