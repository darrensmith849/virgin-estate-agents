import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About",
  description: `About ${SITE.name} — a considered approach to property in Harare.`,
};

const IMAGE =
  "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1600&q=80";

export default function AboutPage() {
  return (
    <>
      <Container className="py-14 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-sand">
            About us
          </p>
          <h1 className="mt-4 text-4xl leading-tight sm:text-5xl">
            A considered approach to property in Harare.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">
            Virgin Estate Agents was founded on a simple belief: finding a home
            should feel calm, honest and considered. We pair genuine local
            knowledge with a careful, design-led way of presenting property — so
            every listing is shown the way it deserves.
          </p>
        </div>
      </Container>

      <div className="relative aspect-[21/9] w-full">
        <Image src={IMAGE} alt="Harare property" fill sizes="100vw" className="object-cover" />
      </div>

      <Container className="py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="text-2xl sm:text-3xl">What we stand for</h2>
            <div className="mt-6 space-y-5 leading-relaxed text-ink-soft">
              <p>
                We work across Harare&rsquo;s most sought-after suburbs — from
                Borrowdale and Highlands to Mount Pleasant and Avondale —
                helping buyers, sellers, landlords and tenants alike.
              </p>
              <p>
                Clear pricing in USD, accurate specifications and real
                photography are non-negotiable. No inflated promises, no
                surprises — just property presented properly.
              </p>
            </div>
            <Link
              href="/listings"
              className={buttonVariants({ variant: "primary", size: "md", className: "mt-8" })}
            >
              Browse our listings
            </Link>
          </div>

          <div className="space-y-8 border-t border-line pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            {[
              { stat: "20+", label: "Harare suburbs covered" },
              { stat: "USD", label: "Transparent pricing" },
              { stat: "1:1", label: "Personal agent attention" },
            ].map((item) => (
              <div key={item.label}>
                <p className="font-serif text-3xl text-brand">{item.stat}</p>
                <p className="mt-1 text-sm text-muted">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}
