"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { agents } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { agentSchema } from "@/lib/validations";

export type AgentFormState =
  | { ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

function parse(formData: FormData) {
  return agentSchema.safeParse({
    name: formData.get("name"),
    title: formData.get("title"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
    bio: formData.get("bio"),
    active: formData.get("active") != null,
  });
}

export async function createAgent(
  _prev: AgentFormState,
  formData: FormData,
): Promise<AgentFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authorised." };

  const parsed = parse(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  await db.insert(agents).values({
    ...parsed.data,
    photoUrl: (formData.get("photoUrl") as string) || null,
  });

  revalidatePath("/admin/agents");
  revalidatePath("/agents"); // public team page is static
  redirect("/admin/agents");
}

export async function updateAgent(
  id: string,
  _prev: AgentFormState,
  formData: FormData,
): Promise<AgentFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authorised." };

  const parsed = parse(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  await db
    .update(agents)
    .set({
      ...parsed.data,
      photoUrl: (formData.get("photoUrl") as string) || null,
      updatedAt: new Date(),
    })
    .where(eq(agents.id, id));

  revalidatePath("/admin/agents");
  revalidatePath("/agents"); // public team page is static
  redirect("/admin/agents");
}

export async function deleteAgent(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await db.delete(agents).where(eq(agents.id, id));
  revalidatePath("/admin/agents");
  revalidatePath("/agents"); // public team page is static
  redirect("/admin/agents");
}
