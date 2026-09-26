"use client";

import { useState } from "react";
import { ClipboardPaste, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { isEmptyParse, parseSpecs, type ParsedSpecs, type StandardField } from "@/lib/spec-parser";
import type { Vocabulary } from "@/lib/vocabulary";

/*
 * "Paste specs": paste a list (from a mandate, WhatsApp or ChatGPT), check what
 * was understood, and fill the form in one go. Nothing is saved here — the
 * admin still reviews the form and presses Save as usual.
 */

const STANDARD_LABEL_KEY: Record<StandardField, keyof Vocabulary["specLabels"]> = {
  bedrooms: "bedrooms",
  bathrooms: "bathrooms",
  garages: "garages",
  landSizeSqm: "landSize",
  floorSizeSqm: "floorSize",
};

type Row = { id: string; group: string; text: string; include: boolean; isNew?: boolean };

function rowsFor(p: ParsedSpecs, vocabulary: Vocabulary): Row[] {
  const known = new Set(vocabulary.featureOptions.map((f) => f.toLowerCase()));
  return [
    ...(Object.entries(p.standard) as [StandardField, number][]).map(([field, value]) => ({
      id: `std:${field}`,
      group: "Specifications",
      text: `${vocabulary.specLabels[STANDARD_LABEL_KEY[field]]}: ${value.toLocaleString("en-GB")}${
        field === "landSizeSqm" || field === "floorSizeSqm" ? " m²" : ""
      }`,
      include: true,
    })),
    ...p.specTypes.map((s) => ({
      id: `type:${s.label}`,
      group: "Specifications",
      text: `${s.label}: ${s.value}`,
      include: true,
    })),
    ...p.features.map((f) => ({
      id: `feat:${f}`,
      group: "Features",
      text: f,
      include: true,
      isNew: !known.has(f.toLowerCase()),
    })),
    ...p.other.map((o) => ({
      id: `other:${o.label}`,
      group: "Other details",
      text: `${o.label}: ${o.value}`,
      include: true,
    })),
  ];
}

/** Keep only what the admin left ticked in the preview. */
function selected(p: ParsedSpecs, rows: Row[]): ParsedSpecs {
  const on = new Set(rows.filter((r) => r.include).map((r) => r.id));
  return {
    standard: Object.fromEntries(
      Object.entries(p.standard).filter(([field]) => on.has(`std:${field}`)),
    ),
    specTypes: p.specTypes.filter((s) => on.has(`type:${s.label}`)),
    features: p.features.filter((f) => on.has(`feat:${f}`)),
    other: p.other.filter((o) => on.has(`other:${o.label}`)),
    unmatched: [],
  };
}

export function PasteSpecs({
  vocabulary,
  onApply,
}: {
  vocabulary: Vocabulary;
  onApply: (parsed: ParsedSpecs) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedSpecs | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [applied, setApplied] = useState<string | null>(null);

  function read() {
    const result = parseSpecs(text, {
      featureOptions: vocabulary.featureOptions,
      specOptions: vocabulary.specOptions,
      specLabels: vocabulary.specLabels,
      hiddenSpecs: vocabulary.hiddenSpecs,
    });
    setParsed(result);
    setRows(rowsFor(result, vocabulary));
  }

  function close() {
    setOpen(false);
    setText("");
    setParsed(null);
    setRows([]);
  }

  function apply() {
    if (!parsed) return;
    const count = rows.filter((r) => r.include).length;
    onApply(selected(parsed, rows));
    setApplied(
      `Filled in ${count} item${count === 1 ? "" : "s"} — check the form below, then save.`,
    );
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
          Paste specs
        </Button>
        {applied ? (
          <span role="status" className="text-sm text-brand">{applied}</span>
        ) : (
          <span className="text-sm text-muted">
            Paste a whole list and it&rsquo;s sorted into the boxes for you.
          </span>
        )}
      </div>
    );
  }

  const groups = ["Specifications", "Features", "Other details"];

  return (
    <div className="mb-6 rounded-lg border border-line bg-paper p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-ink">Paste specs</h3>
          <p className="mt-0.5 text-sm text-muted">
            One per line, or separated by commas — e.g. &ldquo;3 bedrooms, 2
            bathrooms, double garage, pool, 1 200m² stand&rdquo;.
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={close} aria-label="Close">
          <X size={16} />
        </Button>
      </div>

      <Textarea
        aria-label="Specifications to paste"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setParsed(null);
        }}
        rows={6}
        className="mt-3"
        placeholder={"3 bedrooms\n2 bathrooms (main en-suite)\nDouble garage\nSwimming pool\nBorehole\n1 200m² stand"}
      />

      {!parsed ? (
        <Button type="button" className="mt-3" onClick={read} disabled={!text.trim()}>
          Read
        </Button>
      ) : isEmptyParse(parsed) ? (
        <p className="mt-3 text-sm text-muted">
          Nothing recognisable in that text. Try one item per line.
        </p>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-ink-soft">
            Here&rsquo;s what was found. Untick anything you don&rsquo;t want.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {groups.map((group) => {
              const items = rows.filter((r) => r.group === group);
              if (!items.length) return null;
              return (
                <div key={group}>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">{group}</p>
                  <ul className="mt-2 space-y-1.5">
                    {items.map((row) => (
                      <li key={row.id}>
                        <label className="flex items-start gap-2 text-sm text-ink-soft">
                          <input
                            type="checkbox"
                            checked={row.include}
                            onChange={() =>
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.id === row.id ? { ...r, include: !r.include } : r,
                                ),
                              )
                            }
                            className="mt-0.5 h-4 w-4 rounded border-line text-brand focus:ring-brand/30"
                          />
                          <span>
                            {row.text}
                            {row.isNew && <span className="ml-1 text-xs text-muted">(new)</span>}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {parsed.unmatched.length > 0 && (
            <p className="mt-4 text-xs text-muted">
              Not understood, so left out: {parsed.unmatched.map((u) => `“${u}”`).join(", ")}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <Button type="button" onClick={apply} disabled={!rows.some((r) => r.include)}>
              Apply to listing
            </Button>
            <Button type="button" variant="ghost" onClick={() => setParsed(null)}>
              Edit text
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
