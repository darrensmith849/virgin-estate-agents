import type { Metadata } from "next";
import Image from "next/image";
import { Phone, Mail, MessageCircle, User } from "lucide-react";

import { Container } from "@/components/ui/container";
import { listActiveAgents } from "@/lib/data/agents";
import { whatsappLink } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Our agents",
  description: "Meet the Virgin Estate Agents team in Harare.",
};

export default async function AgentsPage() {
  const agents = await listActiveAgents();

  return (
    <Container className="py-14 sm:py-20">
      <div className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-sand">
          The team
        </p>
        <h1 className="mt-4 text-4xl sm:text-5xl">People who know Harare.</h1>
        <p className="mt-4 text-muted">
          Local expertise, a careful eye, and a genuine commitment to getting
          the match right.
        </p>
      </div>

      {agents.length === 0 ? (
        <p className="mt-12 text-muted">Our team will be listed here soon.</p>
      ) : (
        <div className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => {
            const wa = whatsappLink(a.whatsapp);
            return (
              <div key={a.id}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-paper-2">
                  {a.photoUrl ? (
                    <Image
                      src={a.photoUrl}
                      alt={a.name}
                      fill
                      sizes="(max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted">
                      <User size={40} />
                    </div>
                  )}
                </div>
                <h2 className="mt-4 font-serif text-xl text-ink">{a.name}</h2>
                {a.title && <p className="text-sm text-sand">{a.title}</p>}
                {a.bio && <p className="mt-2 text-sm leading-relaxed text-muted">{a.bio}</p>}
                <div className="mt-4 flex gap-2">
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`WhatsApp ${a.name}`}
                      className="rounded-full border border-line p-2 text-ink-soft hover:bg-paper-2"
                    >
                      <MessageCircle size={16} />
                    </a>
                  )}
                  {a.phone && (
                    <a
                      href={`tel:${a.phone.replace(/\s/g, "")}`}
                      aria-label={`Call ${a.name}`}
                      className="rounded-full border border-line p-2 text-ink-soft hover:bg-paper-2"
                    >
                      <Phone size={16} />
                    </a>
                  )}
                  {a.email && (
                    <a
                      href={`mailto:${a.email}`}
                      aria-label={`Email ${a.name}`}
                      className="rounded-full border border-line p-2 text-ink-soft hover:bg-paper-2"
                    >
                      <Mail size={16} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Container>
  );
}
