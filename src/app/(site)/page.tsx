import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search, ShieldCheck, MapPinned, Sparkles } from "lucide-react";

import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { ListingCard } from "@/components/listings/listing-card";
import { getFeaturedListings } from "@/lib/data/listings";
import { HARARE_SUBURBS, PROPERTY_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2200&q=80";

export default async function HomePage() {
  const featured = await getFeaturedListings(6);

  return (
    <>
      {/* ----------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ----------------------------------------------------------------- */}
      <section className="relative -mt-18 flex min-h-[88vh] items-center">
        <Image
          src={HERO_IMAGE}
          alt="A modern home in Harare"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/65" />

        <Container className="relative z-10 pt-28 pb-16">
          <div className="max-w-2xl fade-up">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-white/75">
              Harare · Zimbabwe
            </p>
            <h1 className="font-serif text-4xl leading-[1.05] text-white sm:text-5xl lg:text-6xl">
              Find a home worth
              <br />
              coming back to.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
              A considered selection of houses, apartments, stands and commercial
              property across Harare&rsquo;s most sought-after suburbs.
            </p>
          </div>

          {/* Search bar */}
          <form
            action="/listings"
            method="GET"
            className="mt-10 max-w-3xl rounded-xl border border-white/15 bg-white/95 p-2 shadow-xl backdrop-blur sm:flex sm:items-center sm:gap-2"
          >
            <div className="flex flex-1 items-center gap-2 px-3 py-2">
              <Search size={18} className="shrink-0 text-muted" />
              <select
                name="suburb"
                defaultValue=""
                className="w-full bg-transparent text-sm text-ink outline-none"
                aria-label="Suburb"
              >
                <option value="">Any suburb</option>
                {HARARE_SUBURBS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="hidden h-8 w-px bg-line sm:block" />
            <div className="flex flex-1 items-center px-3 py-2">
              <select
                name="type"
                defaultValue=""
                className="w-full bg-transparent text-sm text-ink outline-none"
                aria-label="Property type"
              >
                <option value="">Any type</option>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className={cn(
                buttonVariants({ variant: "primary", size: "md" }),
                "mt-2 w-full sm:mt-0 sm:w-auto",
              )}
            >
              Search
              <ArrowRight size={16} />
            </button>
          </form>
        </Container>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Featured listings                                                 */}
      {/* ----------------------------------------------------------------- */}
      {featured.length > 0 && (
        <section className="py-20 sm:py-24">
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.3em] text-sand">
                  Featured
                </p>
                <h2 className="mt-4 text-3xl sm:text-4xl">Handpicked properties</h2>
              </div>
              <Link
                href="/listings"
                className="flex items-center gap-1.5 text-sm text-brand transition-colors hover:text-brand-700"
              >
                View all listings
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Value props                                                       */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-20 sm:py-28">
        <Container>
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-sand">
              The Virgin Estate difference
            </p>
            <h2 className="mt-4 text-3xl sm:text-4xl">
              A calmer way to find property.
            </h2>
            <p className="mt-4 text-muted">
              We pair a careful, design-led approach with genuine local knowledge —
              so every listing is presented honestly and beautifully.
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: MapPinned,
                title: "Rooted in Harare",
                body: "Deep familiarity with Borrowdale, Highlands, Mount Pleasant and beyond — the streets, schools and value.",
              },
              {
                icon: ShieldCheck,
                title: "Honest listings",
                body: "Clear pricing in USD, accurate specs and real photography. No surprises, no inflated promises.",
              },
              {
                icon: Sparkles,
                title: "Considered presentation",
                body: "Each property is shown the way it deserves — uncluttered, photography-led and easy to explore.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="border-t border-line pt-6">
                <Icon size={22} className="text-brand" />
                <h3 className="mt-4 text-xl">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* CTA band                                                          */}
      {/* ----------------------------------------------------------------- */}
      <section className="pb-24">
        <Container>
          <div className="overflow-hidden rounded-2xl bg-brand px-8 py-16 text-center sm:px-16">
            <h2 className="mx-auto max-w-xl text-3xl text-white sm:text-4xl">
              Ready to find your next address?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-brand-100">
              Browse the full collection or talk to our team about exactly what
              you&rsquo;re looking for.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/listings"
                className={buttonVariants({
                  variant: "subtle",
                  size: "lg",
                  className: "bg-white text-brand hover:bg-brand-50",
                })}
              >
                Browse listings
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/contact"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "border-white/30 text-white hover:bg-white/10",
                })}
              >
                Talk to us
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
