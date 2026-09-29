/*
 * Reads the words out of a picture — a screenshot of a WhatsApp message, an
 * email or a Google review — so a testimonial can be added without retyping
 * it. It runs in the browser (Tesseract), so the picture never leaves the
 * computer. The reading engine downloads the first time it's used (a few MB)
 * and the browser keeps it after that.
 */

export type ReadProgress = { stage: "preparing" | "reading"; percent: number };

export async function readImageText(
  file: Blob,
  onProgress?: (progress: ReadProgress) => void,
): Promise<{ quote: string; name: string | null; confidence: number }> {
  const canvas = await toCanvas(file);
  onProgress?.({ stage: "preparing", percent: 0 });
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m) =>
      onProgress?.({
        stage: m.status === "recognizing text" ? "reading" : "preparing",
        percent: Math.round((m.progress ?? 0) * 100),
      }),
  });
  try {
    const { data } = await worker.recognize(canvas);
    return { ...splitQuote(data.text), confidence: data.confidence };
  } finally {
    await worker.terminate();
  }
}

/** Draws the picture at a size the reader likes: small text enlarged, huge images capped. */
async function toCanvas(file: Blob): Promise<HTMLCanvasElement> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That picture couldn't be opened. Try a PNG or JPG screenshot.");
  }
  let scale = Math.min(3, Math.max(1, 1600 / bitmap.width));
  const maxPixels = 20_000_000;
  if (bitmap.width * bitmap.height * scale * scale > maxPixels) {
    scale = Math.sqrt(maxPixels / (bitmap.width * bitmap.height));
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't read pictures. Try Chrome, Edge or Safari.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

// A message time, with WhatsApp's ticks read as ✓, v, V, / or J: "10:42", "10:42 pm ✓✓".
const TIME = String.raw`\d{1,2}[:.]\d{2}(?:\s*[ap]\.?\s?m\.?)?\s*[✓✔√vVJ/]*`;

/** Lines that are part of the app around the message, not what the client wrote. */
const NOISE: RegExp[] = [
  new RegExp(`^${TIME}$`, "i"),
  /^(today|yesterday|edited|read more|more|like|reply|share|helpful|report|translated by google|see original|new|forwarded|message|type a message)$/i,
  /^local guide\b/i,
  /^(online|typing(…|\.\.\.)?|last seen\b.*|(tap|click) here for contact info)$/i, // chat header
  /^[★☆*·\s]+$/,
  /^(a|an|one|\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i,
  /^\d+\s+reviews?\b/i,
  /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/,
  /^(mon|tue|wed|thu|fri|sat|sun)[a-z]*,?\s+\d{1,2}\s+[a-z]+(\s+\d{4})?$/i,
  /^[^\p{L}\p{N}]*$/u, // icons, bars and stray symbols
  /^[^\p{L}]*(\p{L}[^\p{L}]+)*\p{L}?[^\p{L}]*$/u, // no two letters together: misread stars, icons
  // A row of buttons: "Like  Share", "Like · Reply · 2w".
  /^((like|reply|share|helpful|report|more|translate|edited|\d+\s?[smhdwy])[\s·•|]*)+$/i,
];

// "2 weeks ago" at the end of a review's rating line.
const AGO = /\s*\b(a|an|one|\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i;

// "Dear Boyd," alone on a line — the greeting of an email or letter.
const GREETING = /^(dear|hi|hello|good (morning|afternoon|evening))\b.{0,40},$/i;
// "Kind regards," — the sign-off; the sender's name usually follows it.
const SIGN_OFF =
  /^((kind|best|warm|many)\s+)?(regards|wishes|thanks)[,.!]?$|^(thank you|sincerely|yours( sincerely| faithfully| truly)?|cheers)[,.!]?$/i;
// Looks like a person or family: "Mrs Chikwanha", "Tendai Moyo", "The Moyo family".
const NAME = /^(the\s+)?\p{Lu}[\p{L}'’.-]*(\s+(&|and|of|family|\p{Lu}[\p{L}'’.-]*)){0,4}$/u;

/**
 * Turns what the reader saw into one clean quote, plus the sender's name when
 * the picture shows it (a chat or review header, or an email sign-off). Drops
 * times, ticks, star ratings, "2 weeks ago"-style lines and greetings, rejoins
 * wrapped lines and hyphenated words, and takes off surrounding quote marks.
 */
export function splitQuote(raw: string): { quote: string; name: string | null } {
  let lines = raw
    .replace(/\r/g, "")
    .split("\n")
    .map((line) =>
      line
        .replace(new RegExp(`\\s+${TIME}\\s*$`, "i"), "") // time at the end of a bubble
        .replace(/[★☆]+/g, "") // star ratings
        .replace(AGO, "")
        .replace(/(^|\s)\|(?=\s|$)/g, "$1I") // a lone "|" is almost always "I"
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((line) => line && !NOISE.some((re) => re.test(line)));

  let name: string | null = null;
  const signOff = lines.findIndex((line, i) => i > 0 && SIGN_OFF.test(line));
  if (signOff > 0) {
    const after = lines[signOff + 1];
    if (after && after.length <= 60 && NAME.test(after)) name = after;
    lines = lines.slice(0, signOff);
  } else if (
    // A header line on its own, with the message starting fresh below it
    // ("Thank You" + "for everything…" is one sentence, not a name).
    lines.length >= 2 &&
    lines[0].length <= 40 &&
    NAME.test(lines[0]) &&
    !/^(thank|thanks|hi|hello|dear|good)\b/i.test(lines[0]) &&
    !/^\p{Ll}/u.test(lines[1])
  ) {
    name = lines[0];
    lines = lines.slice(1);
  }
  if (lines.length >= 2 && GREETING.test(lines[0])) lines = lines.slice(1);

  let quote = "";
  for (const line of lines) {
    if (!quote) quote = line;
    else if (/\p{L}-$/u.test(quote) && /^\p{Ll}/u.test(line)) quote = quote.slice(0, -1) + line;
    else quote += " " + line;
  }
  quote = quote.replace(/^["“”'‘’]+|["“”'‘’]+$/g, "").trim();
  return { quote, name };
}

/** Keeps a quote within `max` characters, ending on a whole sentence or word. */
export function fitQuote(text: string, max: number): { text: string; cut: boolean } {
  if (text.length <= max) return { text, cut: false };
  const head = text.slice(0, max - 1);
  const sentence = head.search(/[.!?][^.!?]*$/);
  if (sentence > max * 0.6) return { text: head.slice(0, sentence + 1), cut: true };
  return { text: head.slice(0, head.lastIndexOf(" ")).replace(/[,;:\s]+$/, "") + "…", cut: true };
}
