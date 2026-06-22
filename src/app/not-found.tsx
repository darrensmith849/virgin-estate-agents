import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-5 text-center">
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
    </main>
  );
}
