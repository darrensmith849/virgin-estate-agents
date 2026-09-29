import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { getContactDetails } from "@/lib/data/settings";

/*
 * Any address that doesn't exist. It sits outside the site's own layout, so it
 * brings the header, footer and page background with it — without them it
 * rendered on the dark base colour, with its heading and "Go home" invisible.
 */
export default async function NotFound() {
  const { phone } = await getContactDetails();
  return (
    <>
      <SiteHeader phone={phone} />
      <main id="main-content" className="ve-content-shell flex-1">
        <section className="flex min-h-[60vh] flex-col items-center justify-center px-5 py-24 text-center">
          <p className="font-serif text-6xl text-brand">404</p>
          <h1 className="mt-4 text-2xl">This page can&rsquo;t be found</h1>
          <p className="mt-2 max-w-sm text-muted">
            The page you&rsquo;re looking for may have moved or no longer exists.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/" className={buttonVariants({ variant: "outline", size: "md" })}>
              Go home
            </Link>
            <Link href="/listings" className={buttonVariants({ variant: "primary", size: "md" })}>
              Browse listings
            </Link>
          </div>
        </section>
        <SiteFooter />
      </main>
    </>
  );
}
