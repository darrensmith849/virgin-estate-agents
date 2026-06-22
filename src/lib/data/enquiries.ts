import "server-only";
import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { enquiries } from "@/db/schema";

export async function listEnquiries() {
  return db.query.enquiries.findMany({
    orderBy: [desc(enquiries.createdAt)],
    with: { listing: { columns: { id: true, title: true, slug: true } } },
  });
}

export async function getEnquiryById(id: string) {
  return db.query.enquiries.findFirst({
    where: eq(enquiries.id, id),
    with: { listing: { columns: { id: true, title: true, slug: true } } },
  });
}

export async function countNewEnquiries() {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(enquiries)
    .where(eq(enquiries.status, "new"));
  return row?.count ?? 0;
}
