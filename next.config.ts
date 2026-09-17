import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow crisper rendering for the cinematic hero / journey imagery while
    // keeping the lighter 75 default for everything else.
    qualities: [75, 90],
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
