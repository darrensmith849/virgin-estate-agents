import { Container } from "@/components/ui/container";

const STEPS = [
  {
    n: "01",
    title: "Talk to us",
    body: "Tell us what you're looking for — or what you're selling. We listen first, then advise honestly.",
  },
  {
    n: "02",
    title: "A curated shortlist",
    body: "We match you to the right properties, or position yours in front of the right buyers.",
  },
  {
    n: "03",
    title: "Private viewings",
    body: "See homes properly, at your own pace, with clear guidance at every step.",
  },
  {
    n: "04",
    title: "A smooth close",
    body: "Straightforward paperwork, fair negotiation and support all the way to the keys.",
  },
];

export function HowItWorks() {
  return (
    <section className="reveal py-20 sm:py-28">
      <Container>
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-sand">
            Working with us
          </p>
          <h2 className="mt-4 text-3xl sm:text-4xl">
            A calm, considered process.
          </h2>
          <p className="mt-4 text-muted">
            No pressure, no noise — just a clear path from first conversation to
            collecting the keys.
          </p>
        </div>

        <ol className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="border-t border-line pt-5">
              <span className="font-serif text-3xl text-sand">{s.n}</span>
              <h3 className="mt-3 text-lg">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
