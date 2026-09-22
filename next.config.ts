import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /*
     * Serve AVIF where the browser takes it, WebP otherwise.
     *
     * This is the single biggest lever on what a visitor actually downloads:
     * measured on this site's own photos, AVIF comes back roughly half the
     * size of the equivalent WebP for the same visual quality. Order matters —
     * the first entry the request's `Accept` header matches is the one used.
     *
     * Two things this depends on, both verified rather than assumed:
     *  - Caddy and Cloudflare forward `Accept` through to Next, so the format
     *    negotiation actually happens (a proxy that strips it would pin every
     *    visitor to one format).
     *  - AVIF encoding works in the deployed sharp build. `sharp.format.avif`
     *    reports false there, but `.avif()` encodes correctly; the flag is
     *    describing the libvips loader, not the saver.
     *
     * The cost is encode time on a cold request — AVIF is slower to compress,
     * and each format is cached separately — which is why the cache TTL below
     * is long.
     */
    formats: ["image/avif", "image/webp"],
    /*
     * Uploaded photos are immutable: the filename is a uuid, and an edit
     * produces a new one. So nothing is gained by re-optimising them on a
     * schedule, and a month of cache keeps repeat visitors off the encoder.
     */
    minimumCacheTTL: 2678400, // 31 days
    /*
     * The allowlist Next 16 requires. 60 is what property photos are served
     * at — measured on this library, dropping from 75 to 60 takes roughly a
     * third off the bytes with no artefacting visible at the sizes the site
     * renders, which matters more here than usual: most visitors are on
     * Zimbabwean mobile data. 90 stays for the cinematic hero imagery, which
     * is large, clean, and the first thing anyone sees.
     */
    qualities: [50, 60, 75, 90],
    // Property photos are served from R2 / Cloudflare Images in production, and
    // demo imagery from Unsplash while seeding. Tighten these to the client's
    // own R2 public domain before launch.
    remotePatterns: [
      // Uploaded media is served by Caddy from disk, not from Next's public
      // manifest, so it has to be optimised as a remote URL — see lib/media.ts.
      ...(process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://")
        ? [
            {
              protocol: "https" as const,
              hostname: new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname,
              pathname: "/uploads/**",
            },
          ]
        : []),
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
    ],
  },
};

export default nextConfig;
