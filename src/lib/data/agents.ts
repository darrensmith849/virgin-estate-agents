import "server-only";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { agents } from "@/db/schema";
import { ensureTeamSeed } from "@/db/bootstrap";
import { safeRead } from "./_safe";

/** Active agents for public display (team page, listing cards). */
export async function listActiveAgents() {
  // Seed the real team once (no-op after the first run); never throws.
  await ensureTeamSeed();
  return safeRead(
    () =>
      db.query.agents.findMany({
        where: eq(agents.active, true),
        orderBy: [asc(agents.sortOrder), asc(agents.name)],
      }),
    [],
  );
}

/** All agents for the admin (includes inactive) and listing form selects. */
export async function listAllAgents() {
  return db.query.agents.findMany({
    orderBy: [asc(agents.sortOrder), asc(agents.name)],
  });
}

export async function getAgentById(id: string) {
  return db.query.agents.findFirst({ where: eq(agents.id, id) });
}
