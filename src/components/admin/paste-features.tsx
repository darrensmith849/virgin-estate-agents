"use client";

import { useState } from "react";
import { ClipboardPaste, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { parseSpecs } from "@/lib/spec-parser";

/*
 * "Paste features": paste a list of features and tick them all at once. Each
 * line is matched to the agency's own feature names where it can be ("pool" →
 * Swimming pool, "BICs" → Built-in cupboards); anything else is added as a new
 * feature for this listing. Specs such as "3 bedrooms" are left for Paste specs.
 */
export function PasteFeatures({
  options,
  onApply,
}: {
  /** The features currently offered on this listing. */
  options: string[];
  onApply: (features: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [found, setFound] = useState<{ name: string; include: boolean; isNew: boolean }[] | null>(
    null,
  );
  const [skipped, setSkipped] = useState<string[]>([]);
  const [applied, setApplied] = useState<string | null>(null);

  function read() {
    // The same reader as Paste specs, told there are no spec types, so every
    // feature-like line lands in `features` and counts go to `standard`.
    const result = parseSpecs(text, { featureOptions: options, specOptions: [] });
    const known = new Set(options.map((o) => o.toLowerCase()));
    setFound(
      result.features.map((name) => ({ name, include: true, isNew: !known.has(name.toLowerCase()) })),
    );
    setSkipped([
      ...Object.keys(result.standard).length ? ["bedrooms, bathrooms, garages or sizes (use Paste specs)"] : [],
      ...result.other.map((o) => `${o.label}: ${o.value}`),
      ...result.unmatched,
    ]);
  }

  function close() {
    setOpen(false);
    setText("");
    setFound(null);
    setSkipped([]);
  }

  function apply() {
    const names = (found ?? []).filter((f) => f.include).map((f) => f.name);
    onApply(names);
    setApplied(`Ticked ${names.length} feature${names.length === 1 ? "" : "s"} — save to keep them.`);
    close();
  }

  if (!open) {
    return (
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setOpen(true);
            setApplied(null);
          }}
        >
          <ClipboardPaste size={16} />
          Paste features
        </Button>
        {applied ? (
          <span role="status" className="text-sm text-brand">
            {applied}
          </span>
        ) : (
          <span className="text-sm text-muted">Paste a list and they&rsquo;re all ticked for you.</span>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-lg border border-line bg-paper p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-ink">Paste features</h3>
          <p className="mt-0.5 text-sm text-muted">
            One per line, or separated by commas — e.g. &ldquo;pool, borehole, solar, walled and
            gated&rdquo;.
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={close} aria-label="Close">
          <X size={16} />
        </Button>
      </div>

      <Textarea
        aria-label="Features to paste"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setFound(null);
        }}
        rows={5}
        className="mt-3"
        placeholder={"Swimming pool\nBorehole\nSolar backup\nWalled and gated\nFibre internet"}
      />

      {!found ? (
        <Button type="button" className="mt-3" onClick={read} disabled={!text.trim()}>
          Read
        </Button>
      ) : found.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No features found in that text. Try one per line.</p>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-ink-soft">
            These will be ticked. Untick anything you don&rsquo;t want.
          </p>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {found.map((f) => (
              <li key={f.name}>
                <label className="flex items-start gap-2 text-sm text-ink-soft">
                  <input
                    type="checkbox"
                    checked={f.include}
                    onChange={() =>
                      setFound((prev) =>
                        (prev ?? []).map((x) => (x.name === f.name ? { ...x, include: !x.include } : x)),
                      )
                    }
                    className="mt-0.5 h-4 w-4 rounded border-line text-brand focus:ring-brand/30"
                  />
                  <span>
                    {f.name}
                    {f.isNew && <span className="ml-1 text-xs text-muted">(new)</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {skipped.length > 0 && (
            <p className="mt-3 text-xs text-muted">
              Left out: {skipped.map((u) => `“${u}”`).join(", ")}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <Button type="button" onClick={apply} disabled={!found.some((f) => f.include)}>
              Tick these features
            </Button>
            <Button type="button" variant="ghost" onClick={() => setFound(null)}>
              Edit text
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
