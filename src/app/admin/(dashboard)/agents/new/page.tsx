import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createAgent } from "@/lib/actions/agents";
import { AgentForm } from "@/components/admin/agent-form";
import { PageHeader } from "@/components/admin/page-header";

export const metadata = { title: "Add agent" };

export default function NewAgentPage() {
  return (
    <>
      <Link
        href="/admin/agents"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={15} /> Back to agents
      </Link>
      <PageHeader title="Add agent" />
      <AgentForm action={createAgent} submitLabel="Create agent" />
    </>
  );
}
