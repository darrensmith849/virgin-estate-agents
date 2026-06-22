import Image from "next/image";
import { Phone, Mail, MessageCircle, User } from "lucide-react";

import type { Agent } from "@/db/schema";
import { whatsappLink } from "@/lib/utils";

export function AgentCard({
  agent,
  listingTitle,
}: {
  agent: Agent;
  listingTitle?: string;
}) {
  const wa = whatsappLink(
    agent.whatsapp,
    listingTitle ? `Hi ${agent.name}, I'm interested in "${listingTitle}".` : undefined,
  );

  return (
    <div className="rounded-xl border border-line bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-sand">
        Listing agent
      </p>
      <div className="mt-4 flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-paper-2">
          {agent.photoUrl ? (
            <Image src={agent.photoUrl} alt={agent.name} fill sizes="64px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted">
              <User size={22} />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-ink">{agent.name}</p>
          {agent.title && <p className="text-sm text-muted">{agent.title}</p>}
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-[var(--radius)] bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            <MessageCircle size={16} /> WhatsApp
          </a>
        )}
        {agent.phone && (
          <a
            href={`tel:${agent.phone.replace(/\s/g, "")}`}
            className="flex items-center justify-center gap-2 rounded-[var(--radius)] border border-line px-4 py-2.5 text-sm text-ink-soft transition-colors hover:bg-paper-2"
          >
            <Phone size={16} /> {agent.phone}
          </a>
        )}
        {agent.email && (
          <a
            href={`mailto:${agent.email}`}
            className="flex items-center justify-center gap-2 rounded-[var(--radius)] border border-line px-4 py-2.5 text-sm text-ink-soft transition-colors hover:bg-paper-2"
          >
            <Mail size={16} /> Email
          </a>
        )}
      </div>
    </div>
  );
}
