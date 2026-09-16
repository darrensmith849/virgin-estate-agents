import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search, ShieldCheck, MapPinned, Sparkles } from "lucide-react";

import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { ListingCard } from "@/components/listings/listing-card";
import PropertyJourneyScroll from "@/components/PropertyJourneyScroll";
import { SuburbExplorer } from "@/components/site/suburb-explorer";
import { Services } from "@/components/site/services";
import { HowItWorks } from "@/components/site/how-it-works";
import { SellerCta } from "@/components/site/seller-cta";
import { Faq } from "@/components/site/faq";
import { StatsBand } from "@/components/site/stats-band";
import { Testimonials } from "@/components/site/testimonials";
import { getFeaturedListings, listPropertyTypesInUse } from "@/lib/data/listings";
import { HARARE_SUBURBS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Render at request time so featured listings reflect the live database.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "Virgin Estate Agents — Property for Sale & Rent in Harare, Zimbabwe",
  },
  description:
    "Browse curated houses, apartments, stands and commercial property across Harare's finest suburbs — Borrowdale, Highlands, Mount Pleasant, Avondale and Chisipite. Honest USD pricing and real photography.",
  alternates: { canonical: "/" },
};

const HERO_IMAGE = "/hero-home.jpg";

export default async function HomePage() {
  const [featured, propertyTypes] = await Promise.all([
    getFeaturedListings(6),
    listPropertyTypesInUse(),
  ]);

  return (
    <>
      {/* ----------------------------------------------------------------- */}
      {/* Hero — dark image stage, sits above the silver content background */}
      {/* ----------------------------------------------------------------- */}
      <section
        className="hero-section"
        style={{ "--hero-image": `url(${HERO_IMAGE})` } as CSSProperties}
      >
        <Image
          src={HERO_IMAGE}
          alt="Premium Harare property"
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="hero-image"
        />
        <div className="hero-overlay" />

        <div className="hero-content">
          <p className="hero-kicker">HARARE · ZIMBABWE</p>
          <h1>Find a home worth coming back to.</h1>
          <p className="hero-copy">
            A considered selection of houses, apartments, stands and commercial
            property across Harare&rsquo;s most sought-after suburbs.
          </p>

          {/* Search bar */}
          <form
            action="/listings"
            method="GET"
            className="hero-search rounded-xl border border-white/15 bg-white/95 p-2 shadow-xl backdrop-blur sm:flex sm:items-center sm:gap-2"
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
                {propertyTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
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
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Featured listings                                                 */}
      {/* ----------------------------------------------------------------- */}
      {featured.length > 0 && (
        <section className="reveal py-20 sm:py-24">
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
                className="group flex items-center gap-1.5 text-sm text-brand transition-colors hover:text-brand-700"
              >
                <span className="link-underline">View all listings</span>
                <ArrowRight
                  size={15}
                  className="transition-transform duration-300 ease-out group-hover:translate-x-1"
                />
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
      {/* Services — what we do                                             */}
      {/* ----------------------------------------------------------------- */}
      <Services />

      {/* ----------------------------------------------------------------- */}
      {/* Explore by suburb — neighbourhood guides                          */}
      {/* ----------------------------------------------------------------- */}
      <SuburbExplorer />

      {/* ----------------------------------------------------------------- */}
      {/* Property journey — pinned cinematic reveal                         */}
      {/* ----------------------------------------------------------------- */}
      <PropertyJourneyScroll />

      {/* ----------------------------------------------------------------- */}
      {/* Value props                                                       */}
      {/* ----------------------------------------------------------------- */}
      <section className="reveal py-20 sm:py-28">
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

      {/* ----------------------------------------------------------------- */}
      {/* How it works — process                                            */}
      {/* ----------------------------------------------------------------- */}
      <HowItWorks />

      {/* ----------------------------------------------------------------- */}
      {/* Sell / let with us — valuation invite                             */}
      {/* ----------------------------------------------------------------- */}
      <SellerCta />

      {/* ----------------------------------------------------------------- */}
      {/* Track record — business metrics                                   */}
      {/* ----------------------------------------------------------------- */}
      <StatsBand />

      {/* ----------------------------------------------------------------- */}
      {/* Testimonials                                                      */}
      {/* ----------------------------------------------------------------- */}
      <Testimonials />

      {/* ----------------------------------------------------------------- */}
      {/* FAQ                                                               */}
      {/* ----------------------------------------------------------------- */}
      <Faq />

      {/* ----------------------------------------------------------------- */}
      {/* CTA band                                                          */}
      {/* ----------------------------------------------------------------- */}
      <section className="reveal pb-12">
        <Container>
          <div className="ve-dark-cta overflow-hidden px-8 py-16 text-center sm:px-16">
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
