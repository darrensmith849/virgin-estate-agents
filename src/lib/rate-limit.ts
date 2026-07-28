import "server-only";
import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Per-IP throttling for the unauthenticated write/spend paths: the AI
 * assistant (billable model calls), the enquiry form, view tracking and the
 * admin login.
 *
 * Backed by Cloudflare's native rate-limiting bindings (declared in
 * `wrangler.jsonc`), so there is no KV/Durable Object to provision and nothing
 * for the agency to configure. Limits are best-effort and per-colo — that is
 * fine here: the goal is to stop floods, not to meter exactly.
 *
 * Off Cloudflare (local `next dev`) the bindings are absent and every check
 * passes, so development is unaffected.
 */
export type LimiterName =
  | "CHAT_LIMITER"
  | "ENQUIRY_LIMITER"
  | "LOGIN_LIMITER"
  | "VIEW_LIMITER";

type Limiter = { limit: (opts: { key: string }) => Promise<{ success: boolean }> };

/** The visitor's IP as Cloudflare sees it, or "unknown" off-platform. */
export async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    return (
      h.get("cf-connecting-ip") ||
      h.get("x-real-ip") ||
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

/**
 * Returns true when the caller is within its allowance. Fails **open** on any
 * unexpected error — a limiter outage must never take the site down.
 */
export async function withinRateLimit(
  name: LimiterName,
  key?: string,
): Promise<boolean> {
  try {
    const { env } = getCloudflareContext();
    const limiter = (env as unknown as Record<string, Limiter | undefined>)[name];
    if (!limiter?.limit) return true; // Not bound (local dev) — allow.

    const { success } = await limiter.limit({ key: key ?? (await clientIp()) });
    return success;
  } catch (err) {
    console.error(`[rate-limit] ${name} check failed; allowing:`, err);
    return true;
  }
}
