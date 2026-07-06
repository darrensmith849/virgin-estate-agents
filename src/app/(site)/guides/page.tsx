import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Container } from "@/components/ui/container";
import { HARARE_SUBURBS } from "@/lib/constants";
import { slugifySuburb, suburbBlurb } from "@/lib/suburbs";

export const metadata: Metadata = {
  title: "Harare neighbourhood guides",
  description:
    "Explore property by suburb across Harare — Borrowdale, Highlands, Mount Pleasant, Avondale, Chisipite and more.",
  alternates: { canonical: "/guides" },
};

export default function GuidesIndexPage() {
  return (
    <Container className="reveal py-14 sm:py-20">
      <div className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-sand">
          Neighbourhood guides
        </p>
        <h1 className="mt-4 text-4xl sm:text-5xl">Explore Harare by suburb.</h1>
        <p className="mt-4 text-muted">
          Get to know the city&rsquo;s most sought-after addresses — and see
          what&rsquo;s available in each right now.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {HARARE_SUBURBS.map((name) => (
          <Link
            key={name}
            href={`/guides/${slugifySuburb(name)}`}
            className="ve-card group flex flex-col rounded-2xl p-7 transition-all duration-300 ease-out hover:-translate-y-1"
          >
            <h2 className="font-serif text-2xl text-ink transition-colors group-hover:text-brand">
              {name}
            </h2>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
              {suburbBlurb(name)}
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
              View homes
              <ArrowRight
                size={14}
                className="transition-transform duration-300 ease-out group-hover:translate-x-1"
              />
            </span>
          </Link>
        ))}
      </div>
    </Container>
  );
}
