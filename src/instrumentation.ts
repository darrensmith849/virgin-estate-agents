/**
 * Runs once when the server starts, before it handles any request.
 * Used only to bring the database schema up to date — see db/ensure-schema.ts.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureSchema } = await import("./db/ensure-schema");
  // Never hold up start-up for long: an unreachable database is handled by the
  // pages' own fallbacks.
  await Promise.race([
    ensureSchema(),
    new Promise<void>((resolve) => setTimeout(resolve, 10_000)),
  ]);
}
