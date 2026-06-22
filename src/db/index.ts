import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Picks the right driver for the environment:
 *  - Neon HTTP driver when the connection string points at Neon (production /
 *    Cloudflare Workers, where TCP sockets aren't available).
 *  - postgres.js when talking to a local/self-hosted Postgres (dev, and the
 *    future VPS migration).
 *
 * The runtime instances are structurally compatible for our query usage, so we
 * surface a single Neon-typed `db` for clean call-sites.
 */
function createDb(): NeonHttpDatabase<typeof schema> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const useNeon = url.includes("neon.tech") || process.env.NEXT_RUNTIME === "edge";

  if (useNeon) {
    return drizzleNeon(neon(url), { schema, casing: "snake_case" });
  }

  return drizzlePg(postgres(url, { prepare: false }), {
    schema,
    casing: "snake_case",
  }) as unknown as NeonHttpDatabase<typeof schema>;
}

// Reuse the connection across HMR reloads in dev.
const globalForDb = globalThis as unknown as {
  __db__?: NeonHttpDatabase<typeof schema>;
};

export const db = globalForDb.__db__ ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__db__ = db;
}

export { schema };
