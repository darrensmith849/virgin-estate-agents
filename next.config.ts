import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  images: {
    // Property photos are served from R2 / Cloudflare Images in production, and
    // demo imagery from Unsplash while seeding. Tighten these to the client's
    // own R2 public domain before launch.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
    ],
  },
};

export default nextConfig;

// Enables getCloudflareContext() (R2 bindings, env vars, etc.) during `next dev`.
initOpenNextCloudflareForDev();
