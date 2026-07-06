import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { Container } from "@/components/ui/container";
import { FEATURED_SUBURBS, slugifySuburb, suburbBlurb } from "@/lib/suburbs";

export function SuburbExplorer() {
  return (
    <section className="reveal py-20 sm:py-28">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-sand">
              Explore Harare
            </p>
            <h2 className="mt-4 text-3xl sm:text-4xl">
              Areas we know inside out.
            </h2>
            <p className="mt-4 text-muted">
              From Borrowdale&rsquo;s gated estates to leafy Highlands — find the
              suburb that fits the life you want.
            </p>
          </div>
          <Link
            href="/guides"
            className="group flex items-center gap-1.5 text-sm text-brand transition-colors hover:text-brand-700"
          >
            <span className="link-underline">View all areas</span>
            <ArrowRight
              size={15}
              className="transition-transform duration-300 ease-out group-hover:translate-x-1"
            />
          </Link>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_SUBURBS.map((name) => {
            const slug = slugifySuburb(name);
            return (
              <Link
                key={name}
                href={`/guides/${slug}`}
                className="ve-card group flex flex-col overflow-hidden rounded-2xl transition-all duration-300 ease-out hover:-translate-y-1"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={`/images/suburbs/${slug}.jpg`}
                    alt={`Property in ${name}, Harare`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-serif text-2xl text-ink transition-colors group-hover:text-brand">
                    {name}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                    {suburbBlurb(name)}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                    View homes
                    <ArrowRight
                      size={14}
                      className="transition-transform duration-300 ease-out group-hover:translate-x-1"
                    />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
