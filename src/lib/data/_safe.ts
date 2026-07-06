import "server-only";

/**
 * Runs a public-facing database read, returning `fallback` if the database is
 * unconfigured or unreachable. This keeps the marketing site rendering (empty
 * states, 404s) instead of throwing a 500 — e.g. on a fresh deploy before
 * DATABASE_URL is set. Admin reads intentionally do NOT use this: the admin
 * area should surface database errors loudly.
 */
export async function safeRead<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error("[data] public read failed; serving fallback:", error);
    return fallback;
  }
}
