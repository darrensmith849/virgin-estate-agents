import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SellerCta() {
  return (
    <section className="reveal py-12 sm:py-16">
      <Container>
        <div className="ve-card rounded-2xl px-7 py-10 sm:px-12 sm:py-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-sand">
                Sell or let with us
              </p>
              <h2 className="mt-3 text-2xl sm:text-3xl">
                Thinking of selling or letting?
              </h2>
              <p className="mt-3 text-muted">
                Find out what your property is really worth. Request a
                confidential, no-obligation valuation in USD from a team that
                knows your suburb street by street.
              </p>
            </div>
            <div className="shrink-0">
              <Link
                href="/contact"
                className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
              >
                Request a valuation
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
