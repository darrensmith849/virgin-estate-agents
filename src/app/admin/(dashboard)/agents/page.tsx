import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, User } from "lucide-react";

import { listAllAgents } from "@/lib/data/agents";
import { deleteAgent } from "@/lib/actions/agents";
import { PageHeader } from "@/components/admin/page-header";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Agents" };

export default async function AdminAgentsPage() {
  const agents = await listAllAgents();

  return (
    <>
      <PageHeader title="Agents" description="Profiles shown on listings and the team page.">
        <Link
          href="/admin/agents/new"
          className={buttonVariants({ variant: "primary", size: "sm" })}
        >
          <Plus size={16} />
          Add agent
        </Link>
      </PageHeader>

      {agents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-card p-12 text-center text-muted">
          No agents yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {agents.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-4 rounded-xl border border-line bg-card p-4"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-paper-2">
                {a.photoUrl ? (
                  <Image src={a.photoUrl} alt={a.name} fill sizes="56px" className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted">
                    <User size={20} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{a.name}</p>
                <p className="truncate text-sm text-muted">{a.title ?? "—"}</p>
                {!a.active && (
                  <span className="mt-1 inline-block rounded-full bg-paper-2 px-2 py-0.5 text-xs text-muted">
                    Hidden
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Link
                  href={`/admin/agents/${a.id}/edit`}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius)] px-3 py-2 text-sm text-ink-soft hover:bg-paper-2"
                >
                  <Pencil size={15} /> Edit
                </Link>
                <ConfirmDelete
                  action={deleteAgent.bind(null, a.id)}
                  iconOnly
                  message={`Remove ${a.name}? Their listings will become unassigned.`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
