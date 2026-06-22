import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getAgentById } from "@/lib/data/agents";
import { updateAgent } from "@/lib/actions/agents";
import { AgentForm } from "@/components/admin/agent-form";
import { PageHeader } from "@/components/admin/page-header";

export const metadata = { title: "Edit agent" };

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = await getAgentById(id);
  if (!agent) notFound();

  return (
    <>
      <Link
        href="/admin/agents"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={15} /> Back to agents
      </Link>
      <PageHeader title="Edit agent" description={agent.name} />
      <AgentForm
        action={updateAgent.bind(null, agent.id)}
        agent={agent}
        submitLabel="Save changes"
      />
    </>
  );
}
