import {
  Home,
  KeyRound,
  ClipboardCheck,
  Calculator,
  Building2,
  LineChart,
} from "lucide-react";

import { Container } from "@/components/ui/container";

const SERVICES = [
  {
    icon: Home,
    title: "Residential sales",
    body: "Buying or selling a home across Harare's northern suburbs, handled with care from first viewing to final signature.",
  },
  {
    icon: KeyRound,
    title: "Lettings & rentals",
    body: "Quality tenants, fair terms and a smooth let — looking after landlords and tenants alike.",
  },
  {
    icon: ClipboardCheck,
    title: "Property management",
    body: "Hands-off ownership: maintenance, rent collection and clear reporting, all taken care of.",
  },
  {
    icon: Calculator,
    title: "Valuations",
    body: "Accurate, honest market valuations in USD — no inflated numbers, just what your property is really worth.",
  },
  {
    icon: Building2,
    title: "Commercial & land",
    body: "Offices, retail, industrial space and stands for owners, investors and developers.",
  },
  {
    icon: LineChart,
    title: "Advisory & investment",
    body: "Local insight to help you buy well, hold wisely and sell at the right moment.",
  },
];

export function Services() {
  return (
    <section className="reveal py-20 sm:py-28">
      <Container>
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-sand">
            What we do
          </p>
          <h2 className="mt-4 text-3xl sm:text-4xl">
            Full-service property, end to end.
          </h2>
          <p className="mt-4 text-muted">
            Whether you&rsquo;re buying, selling, letting or investing, one
            team handles it all — with genuine local knowledge behind every
            decision.
          </p>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="ve-card group rounded-2xl p-7 transition-all duration-300 ease-out hover:-translate-y-1"
            >
              <Icon
                size={22}
                className="text-brand transition-transform duration-300 ease-out group-hover:-translate-y-0.5"
              />
              <h3 className="mt-4 text-xl">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
