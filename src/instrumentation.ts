/**
 * Runs once when the server starts, before it handles any request: brings the
 * database schema up to date (db/ensure-schema.ts), then, in the background,
 * pre-builds the listing photos so visitors don't wait for them
 * (lib/image-warm.ts).
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
  const { warmListingImages } = await import("./lib/image-warm");
  warmListingImages();
}
