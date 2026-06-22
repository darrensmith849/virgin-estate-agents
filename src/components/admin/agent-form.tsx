"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import { Save, UploadCloud, Loader2, User } from "lucide-react";

import type { AgentFormState } from "@/lib/actions/agents";
import type { Agent } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";

export function AgentForm({
  action,
  agent,
  submitLabel = "Save agent",
}: {
  action: (state: AgentFormState, formData: FormData) => Promise<AgentFormState>;
  agent?: Agent;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<AgentFormState, FormData>(
    action,
    undefined,
  );
  const fe = state?.fieldErrors ?? {};
  const [photoUrl, setPhotoUrl] = useState(agent?.photoUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File | null | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("files", file);
      fd.append("prefix", "agents");
      const res = await fetch("/admin/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.files?.[0]) setPhotoUrl(data.files[0].url);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <p className="rounded-[var(--radius)] bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="rounded-xl border border-line bg-card p-6">
        <div className="flex items-start gap-5">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-line bg-paper-2">
            {photoUrl ? (
              <Image src={photoUrl} alt="" fill sizes="96px" className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted">
                <User size={28} />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Profile photo</p>
            <p className="mt-1 mb-3 text-xs text-muted">Square image works best.</p>
            <input type="hidden" name="photoUrl" value={photoUrl} />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-line px-3 py-2 text-sm text-ink-soft hover:bg-paper-2"
            >
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
              {uploading ? "Uploading…" : "Upload photo"}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" error={fe.name?.[0]}>
            <Input id="name" name="name" defaultValue={agent?.name ?? ""} required />
          </Field>
          <Field label="Title" htmlFor="title">
            <Input id="title" name="title" defaultValue={agent?.title ?? ""} placeholder="e.g. Senior Sales Agent" />
          </Field>
          <Field label="Email" htmlFor="email" error={fe.email?.[0]}>
            <Input id="email" name="email" type="email" defaultValue={agent?.email ?? ""} />
          </Field>
          <Field label="Phone" htmlFor="phone">
            <Input id="phone" name="phone" defaultValue={agent?.phone ?? ""} placeholder="+263 …" />
          </Field>
          <Field label="WhatsApp" htmlFor="whatsapp" hint="Used for click-to-chat">
            <Input id="whatsapp" name="whatsapp" defaultValue={agent?.whatsapp ?? ""} placeholder="+263 …" />
          </Field>
          <div className="flex items-end">
            <label className="flex items-center gap-2.5 text-sm text-ink-soft">
              <input
                type="checkbox"
                name="active"
                defaultChecked={agent?.active ?? true}
                className="h-4 w-4 rounded border-line text-brand focus:ring-brand/30"
              />
              Show on website
            </label>
          </div>
        </div>

        <Field label="Bio" htmlFor="bio" className="mt-4">
          <Textarea id="bio" name="bio" defaultValue={agent?.bio ?? ""} rows={3} />
        </Field>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <Save size={16} />
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
