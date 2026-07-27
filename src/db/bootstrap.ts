import "server-only";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "./index";
import { agents } from "./schema";

/**
 * Lightweight, idempotent runtime provisioning.
 *
 * The production database lives behind the deployed Worker (its connection
 * string is a Worker secret), so we can't run migrations against it from local
 * tooling. Instead these helpers bring prod up to date on demand — the same way
 * photo/agent writes already reach the database at runtime. Each helper is
 * memoised per Worker instance and safe to call repeatedly.
 */

/* --------------------------- listing_videos table ------------------------- */

let videoTablePromise: Promise<void> | null = null;

/** Ensure the listing_videos table exists (created on first video use). */
export function ensureVideoTable(): Promise<void> {
  if (!videoTablePromise) {
    videoTablePromise = createVideoTable().catch((err) => {
      videoTablePromise = null; // allow a retry on the next call
      throw err;
    });
  }
  return videoTablePromise;
}

async function createVideoTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "listing_videos" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "listing_id" uuid NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
      "key" text NOT NULL,
      "url" text NOT NULL,
      "title" varchar(255),
      "sort_order" integer DEFAULT 0 NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "listing_videos_listing_idx"
    ON "listing_videos" ("listing_id")
  `);
}

/* ------------------------------ team seed --------------------------------- */

// The agency's real team, previously hardcoded on the public agents page. Seeded
// once into the DB so the (now database-driven) team page keeps showing them.
// Photos are intentionally left blank — the agency uploads their own headshots
// in the admin (until then the page shows an initials placeholder).
const REAL_TEAM = [
  {
    name: "Kevin Michael Higgins",
    title: "Property Consultant",
    email: "kevinh@ccsales.co.zw",
    phone: "+263 712 602 565",
    whatsapp: "+263 712 602 565",
    bio: "Kevin guides buyers and sellers across Harare's residential market with patience, sharp local insight and a genuine eye for the right fit — keeping every step considered, transparent and unhurried.",
    sortOrder: 0,
  },
  {
    name: "Spencer Harron Murray",
    title: "Property Consultant",
    email: "spencer@virtrust.com",
    phone: "+263 772 448 822",
    whatsapp: "+263 772 448 822",
    bio: "Spencer pairs a straightforward, client-first approach with strong local knowledge, helping buyers and investors move with confidence and secure the right property at the right price.",
    sortOrder: 1,
  },
  {
    name: "Boyd Michael Littleford",
    title: "Manager",
    email: "boyd@virtrust.com",
    phone: "+263 775 472 523",
    whatsapp: "+263 775 472 523",
    bio: "Boyd manages our sales team with a sharp eye for Harare's prime northern suburbs and a calm, considered approach to every deal — making sure every client feels well looked after from first viewing to close.",
    sortOrder: 2,
  },
  {
    name: "Grant Michael Littleford",
    title: "Director",
    email: "grant@virtrust.com",
    phone: "+263 712 607 060",
    whatsapp: "+263 712 607 060",
    bio: "Grant leads Virgin Estate Agents, pairing deep local market knowledge with a hands-on, principled approach to every sale and acquisition — and a genuine commitment to doing right by every client.",
    sortOrder: 3,
  },
];

// Placeholder demo agents from the initial seed — hidden from the public team
// page once the real team is in place.
const DEMO_AGENT_EMAILS = [
  "tendai@virginestateagents.co.zw",
  "rumbi@virginestateagents.co.zw",
  "farai@virginestateagents.co.zw",
];

// Bundled placeholder headshots the team may have been seeded with earlier —
// cleared so the agency's own uploads take their place.
const SEEDED_PHOTO_PATHS = [
  "/images/agents/kevin.jpg",
  "/images/agents/spencer.jpg",
  "/images/agents/boyd-littleford-2.jpg",
  "/images/agents/grant.jpg",
];

let teamSeedPromise: Promise<void> | null = null;

/**
 * Seed the real team into the DB exactly once (guarded by whether the first
 * member already exists, so it never fights later admin edits). Failures are
 * swallowed — a seed hiccup must never break the agents page.
 */
export function ensureTeamSeed(): Promise<void> {
  if (!teamSeedPromise) {
    teamSeedPromise = seedTeam().catch((err) => {
      teamSeedPromise = null;
      console.error("[bootstrap] team seed failed:", err);
    });
  }
  return teamSeedPromise;
}

async function seedTeam(): Promise<void> {
  const already = await db.query.agents.findFirst({
    where: eq(agents.email, REAL_TEAM[0].email),
    columns: { id: true },
  });

  if (!already) {
    await db.insert(agents).values(REAL_TEAM);
    // Hide the demo agents so the public team page shows only the real team.
    await db
      .update(agents)
      .set({ active: false })
      .where(inArray(agents.email, DEMO_AGENT_EMAILS));
  }

  // Blank any bundled placeholder headshots so the agency's own uploads show.
  // Idempotent: once cleared these rows no longer match, and real uploads
  // (different URLs) are never touched.
  await db
    .update(agents)
    .set({ photoUrl: null })
    .where(inArray(agents.photoUrl, SEEDED_PHOTO_PATHS));
}
