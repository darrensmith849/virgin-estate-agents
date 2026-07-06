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

// Reuse the connection across requests / HMR reloads.
const globalForDb = globalThis as unknown as {
  __db__?: NeonHttpDatabase<typeof schema>;
};

function getDb(): NeonHttpDatabase<typeof schema> {
  if (!globalForDb.__db__) {
    globalForDb.__db__ = createDb();
  }
  return globalForDb.__db__;
}

/**
 * Lazy proxy: importing `db` never opens a connection, so modules load fine
 * even when DATABASE_URL is absent (e.g. a fresh deploy before the database is
 * wired up). The connection is created on the first query. Public data reads
 * wrap their queries in `safeRead()` so pages degrade to empty states rather
 * than 500 when the database is unconfigured or unreachable.
 */
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(real)
      : value;
  },
});

/** Whether a database connection string is configured for this runtime. */
export const isDbConfigured = Boolean(process.env.DATABASE_URL);

export { schema };
