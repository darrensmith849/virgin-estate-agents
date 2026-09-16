import "server-only";
import { headers } from "next/headers";

/**
 * Per-IP throttling for the unauthenticated write/spend paths: the AI
 * assistant (billable model calls), the enquiry form, view tracking and the
 * admin login.
 *
 * Two backends, picked at runtime:
 *
 *  - Cloudflare's native rate-limiting bindings, when running on Workers.
 *  - An in-process fixed-window counter otherwise — which is the live setup,
 *    a single `next start` process behind Caddy on the VPS.
 *
 * The in-process counters reset when the service restarts and wouldn't be
 * shared if the app were ever run as a cluster. That's an acceptable trade for
 * the same reason the Workers limiter is per-colo: the goal is to stop floods,
 * not to meter exactly. If this ever runs multi-process, move the store to
 * Postgres or Redis behind the same `withinRateLimit` call and nothing else
 * has to change.
 *
 * Limits mirror the `ratelimits` bindings declared in wrangler.jsonc so both
 * backends behave the same.
 */

export type LimiterName =
  | "CHAT_LIMITER"
  | "ENQUIRY_LIMITER"
  | "LOGIN_LIMITER"
  | "VIEW_LIMITER";

type Limiter = { limit: (opts: { key: string }) => Promise<{ success: boolean }> };

const LIMITS: Record<LimiterName, { limit: number; periodMs: number }> = {
  // Every call is a billable model request.
  CHAT_LIMITER: { limit: 10, periodMs: 60_000 },
  ENQUIRY_LIMITER: { limit: 4, periodMs: 60_000 },
  // Slows password guessing.
  LOGIN_LIMITER: { limit: 8, periodMs: 60_000 },
  VIEW_LIMITER: { limit: 30, periodMs: 60_000 },
};

type Bucket = { count: number; resetAt: number };

/*
 * Held on globalThis so the counters survive module re-evaluation (dev HMR, or
 * the same module being pulled into more than one server bundle). A plain
 * module-level Map would silently start from zero each time.
 */
const STORE_KEY = Symbol.for("virgin.rateLimit.buckets");
const SWEEP_KEY = Symbol.for("virgin.rateLimit.lastSweep");

type GlobalStore = typeof globalThis & {
  [STORE_KEY]?: Map<string, Bucket>;
  [SWEEP_KEY]?: number;
};

const g = globalThis as GlobalStore;

function buckets(): Map<string, Bucket> {
  if (!g[STORE_KEY]) g[STORE_KEY] = new Map<string, Bucket>();
  return g[STORE_KEY];
}

const SWEEP_INTERVAL_MS = 60_000;

/** Drop expired buckets so a stream of unique IPs can't grow the map forever.
 *  Done lazily on access rather than on a timer, which would keep a handle
 *  open and has to be torn down on reload. */
function sweep(now: number) {
  if ((g[SWEEP_KEY] ?? 0) + SWEEP_INTERVAL_MS > now) return;
  g[SWEEP_KEY] = now;
  const map = buckets();
  for (const [key, bucket] of map) {
    if (bucket.resetAt <= now) map.delete(key);
  }
}

/**
 * Strip a source port if the proxy included one.
 *
 * Caddy's `{remote}` placeholder expands to `host:port`, not just the host, so
 * a header set from it carries a port that changes on every connection. Left
 * alone that hands each request its own bucket and the limiter never fires —
 * which is exactly what happened here. Handled in the app as well as in the
 * Caddyfile so a future proxy tweak can't quietly disable throttling again.
 *
 * IPv6 needs care: "2001:db8::1" is a bare address with no port, while
 * "[2001:db8::1]:443" is bracketed with one.
 */
function stripPort(value: string): string {
  const v = value.trim();
  const bracketed = /^\[(.+)\](?::\d+)?$/.exec(v);
  if (bracketed) return bracketed[1];
  // Several colons and no brackets means a bare IPv6 address — leave it whole.
  if ((v.match(/:/g)?.length ?? 0) > 1) return v;
  const withPort = /^(.+):(\d{1,5})$/.exec(v);
  return withPort ? withPort[1] : v;
}

/**
 * The visitor's IP.
 *
 * Order matters for more than tidiness. Caddy overwrites `X-Real-IP` and
 * `X-Forwarded-For` with the connecting address, so both are trustworthy here;
 * it does not set `cf-connecting-ip`, which means on this deployment that
 * header is whatever the caller typed. Trusting it first would let anyone mint
 * a fresh rate-limit bucket per request just by varying it, so it is consulted
 * only after the proxy's own headers, where it still works on Workers.
 */
export async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    const raw =
      h.get("x-real-ip") ||
      h.get("x-forwarded-for")?.split(",")[0] ||
      h.get("cf-connecting-ip");
    return raw ? stripPort(raw) || "unknown" : "unknown";
  } catch {
    return "unknown";
  }
}

/** Cloudflare's binding, when running on Workers. Absent on the VPS. */
async function cloudflareLimiter(name: LimiterName): Promise<Limiter | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    const limiter = (env as unknown as Record<string, Limiter | undefined>)[name];
    return limiter?.limit ? limiter : null;
  } catch {
    return null; // Not inside a Cloudflare context.
  }
}

/** Fixed-window counter. Returns false once the window's allowance is spent. */
function withinLocalLimit(name: LimiterName, key: string): boolean {
  const { limit, periodMs } = LIMITS[name];
  const now = Date.now();
  sweep(now);

  const map = buckets();
  const id = `${name}:${key}`;
  const existing = map.get(id);

  if (!existing || existing.resetAt <= now) {
    map.set(id, { count: 1, resetAt: now + periodMs });
    return true;
  }

  existing.count += 1;
  return existing.count <= limit;
}

/**
 * Returns true when the caller is within its allowance. Fails **open** on any
 * unexpected error — a limiter fault must never take the site down.
 */
export async function withinRateLimit(
  name: LimiterName,
  key?: string,
): Promise<boolean> {
  try {
    const id = key ?? (await clientIp());

    const binding = await cloudflareLimiter(name);
    if (binding) {
      const { success } = await binding.limit({ key: id });
      return success;
    }

    // An unresolvable IP would otherwise share one bucket across every
    // anonymous caller and lock them all out together, so let those through.
    if (id === "unknown") return true;

    return withinLocalLimit(name, id);
  } catch (err) {
    console.error(`[rate-limit] ${name} check failed; allowing:`, err);
    return true;
  }
}
