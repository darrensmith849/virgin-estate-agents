import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { readSession } from "./session";

/**
 * Returns the current admin user, or null. Memoised per render pass.
 * This is the authoritative auth check — call it in pages, layouts, Server
 * Actions and Route Handlers (the `proxy` redirect is only an optimistic gate).
 */
export const getCurrentUser = cache(async () => {
  const session = await readSession();
  if (!session?.userId) return null;

  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return rows[0] ?? null;
});

/** Require an authenticated admin; redirect to login otherwise. */
export const requireUser = cache(async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
});
