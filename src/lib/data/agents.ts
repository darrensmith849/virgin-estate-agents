import "server-only";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { agents } from "@/db/schema";
import { safeRead } from "./_safe";

/** Active agents for public display (team page, listing cards). */
export async function listActiveAgents() {
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
