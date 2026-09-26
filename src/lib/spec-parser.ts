/*
 * Reads a pasted list of property specifications — typically copied out of a
 * mandate, a WhatsApp message or ChatGPT — and sorts it into the listing form:
 *
 *   "3 bedrooms, 2 bathrooms, double garage, pool, 1 200m² stand, borehole"
 *
 * becomes bedrooms 3, bathrooms 2, garages 2, land size 1200, and the Swimming
 * pool and Borehole features ticked. Pure and dependency-free so it runs in the
 * browser and nothing leaves the admin's machine. Nothing is applied until the
 * admin has seen the preview and pressed Apply.
 */

export type StandardField =
  | "bedrooms"
  | "bathrooms"
  | "garages"
  | "landSizeSqm"
  | "floorSizeSqm";

export type ParsedSpecs = {
  /** Values for the five fixed numeric specs. */
  standard: Partial<Record<StandardField, number>>;
  /** Values for the agency's own spec types, keyed by their Settings label. */
  specTypes: { label: string; value: string }[];
  /** Features to tick — existing names where they matched, otherwise new. */
  features: string[];
  /** Label/value details that fit nowhere else. */
  other: { label: string; value: string }[];
  /** Lines that couldn't be read, shown but never applied. */
  unmatched: string[];
};

export type ParserVocabulary = {
  featureOptions: string[];
  specOptions: string[];
  /** The agency's wording for the standard specs, also recognised. */
  specLabels?: Partial<Record<"bedrooms" | "bathrooms" | "garages", string>>;
  /** Standard specs switched off in Settings (keys of DEFAULT_SPEC_LABELS). */
  hiddenSpecs?: string[];
};

/* "a"/"an" are deliberately absent: "an en-suite bathroom" is a feature, not
   a count that should overwrite "2 bathrooms". Leading articles are stripped
   instead, so "a double garage" still reads as 2. */
const NUMBER_WORDS: Record<string, number> = {
  one: 1, single: 1, two: 2, double: 2, twin: 2, three: 3, triple: 3,
  four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
  twelve: 12,
};
const NUM = String.raw`(\d+(?:\.\d+)?|${Object.keys(NUMBER_WORDS).join("|")})`;

function toNumber(raw: string): number {
  const word = NUMBER_WORDS[raw.toLowerCase()];
  return word ?? Number(raw);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A spec type's name as a whole phrase, even one ending in "." ("Staff qtrs."). */
function labelRe(label: string): RegExp {
  return new RegExp(String.raw`(?<![a-z0-9])${escapeRe(label)}(?![a-z0-9])`, "i");
}

/* ---------------------------------------------------------------- split -- */

/** Break pasted text into one item per spec. */
export function splitItems(text: string): string[] {
  return text
    // New lines, semicolons, bullets and pipes always separate items.
    .split(/\r?\n|;|•|·|\||•|\t/)
    // Commas separate too — but not thousands, as in "1,200 m²".
    .flatMap((part) => part.split(/,(?!\d{3}\b)/))
    .map((item) =>
      item
        // Markdown from ChatGPT: **bold**, __bold__, # headings.
        .replace(/\*\*|__|`/g, "")
        .replace(/^#+\s*/, "")
        // Leading list markers: "-", "*", "✓", "1.", "a)" and the like.
        .replace(/^[\s\-–—*+>✓✔☑✅▪▫◦●○]+/u, "")
        .replace(/^(?:\d{1,2}|[a-z])[.)]\s+/i, "")
        .replace(/^(?:a|an|the)\s+(?=\S)/i, "")
        .replace(/[.\s]+$/, "")
        .trim(),
    )
    // Emoji bullets and similar decoration.
    .map((item) => item.replace(/^[\p{Extended_Pictographic}\uFE0F\s]+/u, "").trim())
    // Headings such as "Features:" or "Specifications" carry no value.
    .filter((item) => item && !/:$/.test(item) && !/^(?:(?:property|key|main|other)\s+)?(?:features|specifications?|specs|details|amenities|overview|summary|highlights)$/i.test(item));
}

/* ------------------------------------------------------ standard specs -- */

type StandardHit = { field: StandardField; value: number };

function keywordPattern(words: string[]): string {
  return words.map(escapeRe).join("|");
}

type CountedHit = StandardHit & { rest: string };

/**
 * "3 bedrooms", "3-bed", "bedrooms: 3", "three bedroomed", "double garage".
 * Anything after the spec ("3 bedrooms with built-in cupboards") comes back as
 * `rest`, to be read as an item of its own.
 */
function readCounted(item: string, field: StandardField, words: string[]): CountedHit | null {
  const kw = keywordPattern(words);
  const before = new RegExp(String.raw`^${NUM}\s*(?:x\s*)?-?\s*(?:lock-?up\s+|en-?suite\s+|full\s+|car\s+)?(?:${kw})\b`, "i");
  const after = new RegExp(String.raw`^(?:${kw})\s*[:=\-–]?\s*${NUM}\b`, "i");
  const m = item.match(before) ?? item.match(after);
  if (!m) return null;
  const value = toNumber(m[1]);
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0 || value > 100) return null;
  const rest = item
    .slice(m[0].length)
    // "Three bedroomed house with 2 baths" → "2 baths".
    .replace(/^[\s,:;()\-–]*(?:(?:house|home|property|unit|flat|apartment|cottage)\b)?[\s,]*(?:(?:and|&|\+|with|plus)\b)?[\s,()]*/i, "")
    .replace(/[\s)]+$/, "")
    .trim();
  return { field, value, rest };
}

const BED_WORDS = ["bedrooms", "bedroom", "bedroomed", "beds", "bed", "brs", "br", "bdrms", "bdrm", "b/r"];
const BATH_WORDS = ["bathrooms", "bathroom", "baths", "bath", "ba"];
const GARAGE_WORDS = ["garages", "garage"];

const LAND_HINT = /\b(stand|land|plot|erf|site|yard|property|grounds|acreage|farm)\b/i;
const FLOOR_HINT = /\b(floor|house|home|building|built|under\s*roof|living|office|warehouse|interior|internal)\b/i;

/** "1 200m² stand", "Stand: 2000 sqm", "1.5 ha", "250 m2 under roof". */
function readArea(item: string): StandardHit | null {
  const m = item.match(
    /(\d{1,3}(?:[ ,]\d{3})+|\d+(?:\.\d+)?)\s*(m²|m2|sq\.?\s*m(?:etres|eters)?|sqm|square\s+met(?:re|er)s?|ha|hectares?|acres?|ac)(?![a-z0-9])/i,
  );
  if (!m) return null;
  const amount = Number(m[1].replace(/[ ,]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = m[2].toLowerCase();
  const sqm = /^(ha|hectare)/.test(unit)
    ? amount * 10_000
    : /^(ac|acre)/.test(unit)
      ? amount * 4046.86
      : amount;

  // Where it says what the area is, believe it. Hectares and acres are only
  // ever land; a bare figure is taken as the stand, the usual headline number.
  const field: StandardField =
    FLOOR_HINT.test(item) && !LAND_HINT.test(item)
      ? "floorSizeSqm"
      : "landSizeSqm";
  // Nothing real is this big; almost certainly a typo, so don't guess.
  if (sqm > 1_000_000_000) return null;
  return { field, value: Math.round(sqm) };
}

/* ------------------------------------------------------------- matching -- */

const STOP = new Set(["a", "an", "the", "with", "and", "of", "in", "on", "for", "all", "each", "every", "both", "fully", "large", "big", "small", "new", "own", "private"]);

/** Words that mean the same thing in listings, folded to one spelling. */
const SYNONYMS: Record<string, string> = {
  verandah: "veranda", aircon: "air", airconditioning: "air", "air-conditioning": "air",
  "air-con": "air", fibre: "fiber", solar: "solar", panels: "solar", bic: "cupboards",
  bics: "cupboards", wardrobes: "cupboards", "built-in": "built", builtin: "built",
  gated: "gate", walled: "wall", walls: "wall", fenced: "fence", fencing: "fence",
  electrified: "electric", "e-fence": "electric fence", jojo: "tank", tanks: "tank",
  "staff": "staff", quarters: "quarters", sq: "quarters", dsq: "quarters",
};

function words(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[’']/g, "")
    .split(/[^a-z0-9-]+/)
    .map((w) => SYNONYMS[w] ?? w)
    .flatMap((w) => w.split(" "))
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))
    .filter((w) => w && !STOP.has(w));
}

/**
 * Best matching option for an item: an exact match first, then the option
 * whose words are all in the item (or vice versa) with the fewest left over.
 */
function bestMatch(item: string, options: string[]): string | null {
  const itemWords = words(item);
  if (!itemWords.length) return null;
  const exact = options.find((o) => o.toLowerCase() === item.toLowerCase());
  if (exact) return exact;

  let best: { option: string; spare: number } | null = null;
  for (const option of options) {
    const optionWords = words(option);
    if (!optionWords.length) continue;
    const itemSet = new Set(itemWords);
    const optionSet = new Set(optionWords);
    const optionInItem = optionWords.every((w) => itemSet.has(w));
    const itemInOption = itemWords.every((w) => optionSet.has(w));
    if (!optionInItem && !itemInOption) continue;
    const spare = Math.abs(optionWords.length - itemWords.length);
    if (!best || spare < best.spare) best = { option, spare };
  }
  return best?.option ?? null;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ----------------------------------------------------------------- main -- */

export function parseSpecs(text: string, vocab: ParserVocabulary): ParsedSpecs {
  const out: ParsedSpecs = { standard: {}, specTypes: [], features: [], other: [], unmatched: [] };
  const hidden = new Set(vocab.hiddenSpecs ?? []);
  const labelWords = (key: "bedrooms" | "bathrooms" | "garages") => {
    const custom = vocab.specLabels?.[key]?.toLowerCase();
    return custom ? [custom, custom.replace(/s$/, "")] : [];
  };
  const counted: [StandardField, string[]][] = [
    ["bedrooms", [...labelWords("bedrooms"), ...BED_WORDS]],
    ["bathrooms", [...labelWords("bathrooms"), ...BATH_WORDS]],
    ["garages", [...labelWords("garages"), ...GARAGE_WORDS]],
  ];

  const addFeature = (name: string) => {
    if (!out.features.some((f) => f.toLowerCase() === name.toLowerCase())) out.features.push(name);
  };
  const addOther = (label: string, value: string) => {
    const existing = out.other.find((o) => o.label.toLowerCase() === label.toLowerCase());
    if (existing) existing.value = value;
    else out.other.push({ label: capitalise(label), value });
  };

  /** Anything that reads as a known spec, type or feature — no guessing. */
  function readsStrongly(item: string): boolean {
    return (
      counted.some(([field, kw]) => readCounted(item, field, kw)?.rest === "") ||
      /^(?:lock-?up\s+)?garage$/i.test(item) ||
      readArea(item) !== null ||
      vocab.specOptions.some((l) => labelRe(l).test(item)) ||
      bestMatch(item, vocab.featureOptions) !== null
    );
  }

  /** Read one item; returns any leftover text to read as a further item. */
  function readOne(item: string): { ok: boolean; rest?: string } {
    // 1. The five standard specs.
    for (const [field, kw] of counted) {
      const hit = readCounted(item, field, kw);
      if (!hit) continue;
      if (field === "garages" && hidden.has("garages")) {
        // Garages switched off in Settings: fall back to the feature list.
        const feature = bestMatch(item, vocab.featureOptions);
        if (feature) addFeature(feature);
        else addOther("Garages", String(hit.value));
      } else {
        out.standard[field] = hit.value;
      }
      return { ok: true, rest: hit.rest };
    }
    // "Garage" on its own means one.
    if (/^(?:lock-?up\s+)?garage$/i.test(item) && !hidden.has("garages")) {
      out.standard.garages = 1;
      return { ok: true };
    }
    const area = readArea(item);
    if (area) {
      out.standard[area.field] = area.value;
      return { ok: true };
    }

    // 2. The agency's own spec types ("Staff quarters: 1", "Study").
    for (const label of vocab.specOptions) {
      const re = labelRe(label);
      if (!re.test(item) && bestMatch(item, [label]) === null) continue;
      const rest = item
        .replace(re, "")
        .replace(/^[\s:=\-–]+|[\s:=\-–]+$/g, "")
        .trim();
      const cleaned = rest.replace(/^\((.*)\)$/, "$1").replace(/^x\s*/i, "").trim();
      const value = cleaned && cleaned.length <= 40 ? cleaned : "Yes";
      const existing = out.specTypes.find((s) => s.label === label);
      if (existing) existing.value = value;
      else out.specTypes.push({ label, value });
      return { ok: true };
    }

    // 3. Features, matched to the agency's list where possible.
    const feature = bestMatch(item, vocab.featureOptions);
    if (feature) {
      addFeature(feature);
      return { ok: true };
    }

    // 4. "Label: value" or a counted thing ("3 carports") → Other details.
    const pair = item.match(/^([^:=]{2,60})\s*[:=]\s*(.{1,120})$/);
    if (pair) {
      addOther(pair[1].trim(), pair[2].trim());
      return { ok: true };
    }
    const countedThing = item.match(new RegExp(String.raw`^${NUM}\s*x?\s+([a-z][a-z\s-]{2,58})$`, "i"));
    if (countedThing) {
      addOther(countedThing[2].trim(), String(toNumber(countedThing[1])));
      return { ok: true };
    }

    // 5. A short phrase is a one-off feature; a long sentence is left out.
    if (item.length <= 50 && /[a-z]/i.test(item) && !/\d/.test(item)) {
      addFeature(capitalise(item));
      return { ok: true };
    }
    return { ok: false };
  }

  const queue = splitItems(text);
  let guard = 0;
  while (queue.length && guard++ < 500) {
    const item = queue.shift()!;
    // "Borehole and solar", "pool & borehole": split on the joining word, but
    // only when every part is recognised — "Lounge and dining room" stays whole.
    const parts = item.split(/\s+(?:and|&|\+|with|plus)\s+/i).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1 && parts.every(readsStrongly)) {
      queue.unshift(...parts);
      continue;
    }
    const { ok, rest } = readOne(item);
    if (!ok) out.unmatched.push(item);
    else if (rest) queue.unshift(rest);
  }
  return out;
}

/** True when a parse found nothing to apply. */
export function isEmptyParse(p: ParsedSpecs): boolean {
  return (
    Object.keys(p.standard).length === 0 &&
    p.specTypes.length === 0 &&
    p.features.length === 0 &&
    p.other.length === 0
  );
}
