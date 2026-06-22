import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Incremental cache / queue can be added later (e.g. R2 or KV-backed caching).
// The defaults are fine for launch.
export default defineCloudflareConfig();
