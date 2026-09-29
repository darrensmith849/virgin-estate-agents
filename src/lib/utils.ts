import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conditional logic. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a USD amount the way Zimbabwean property is quoted, e.g. "$450,000". */
export function formatPrice(
  amount: number,
  opts?: { kind?: "sale" | "rent"; period?: string | null },
): string {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount || 0);

  if (opts?.kind === "rent") {
    return `${formatted} / ${opts.period || "month"}`;
  }
  return formatted;
}

/** Format an area in square metres, e.g. "450 m²". */
export function formatArea(sqm?: number | null): string | null {
  if (!sqm) return null;
  return `${new Intl.NumberFormat("en-US").format(sqm)} m²`;
}

/** Turn a title into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

/** Append a short random suffix to keep slugs unique. */
export function uniqueSlug(input: string): string {
  const base = slugify(input) || "listing";
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

/** Format a date as "12 June 2026". */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** Relative time, e.g. "2 days ago". */
export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  const ranges: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [3600, "minute"],
    [86400, "hour"],
    [604800, "day"],
    [2629800, "week"],
    [31557600, "month"],
    [Infinity, "year"],
  ];
  const divisors = [1, 60, 3600, 86400, 604800, 2629800, 31557600];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (let i = 0; i < ranges.length; i++) {
    if (seconds < ranges[i][0]) {
      const value = Math.round(seconds / divisors[i]);
      return rtf.format(-value, ranges[i][1]);
    }
  }
  return formatDate(d);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Guard for ids that reach the database from public input. */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Build a wa.me click-to-chat link (very common for ZW property enquiries). */
export function whatsappLink(phone?: string | null, text?: string): string | null {
  if (!phone) return null;
  let digits = phone.replace(/[^0-9]/g, "");
  if (!digits) return null;
  // A local Zimbabwean number ("0775 472 523") needs the country code for WhatsApp.
  if (digits.startsWith("0") && digits.length === 10) digits = `263${digits.slice(1)}`;
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${query}`;
}

/**
 * A phone number as shown on the site. Zimbabwean numbers, however they were
 * typed ("+263775472523", "+263 775 472 523", "0775 472 523"), all read the
 * standard way: "+263 77 547 2523". Anything else is shown as typed.
 */
export function formatPhone(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("263") && digits.length === 12
    ? digits.slice(3)
    : digits.startsWith("0") && digits.length === 10
      ? digits.slice(1)
      : null;
  if (!local) return value;
  return `+263 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
}

/**
 * "Suburb, City" for a listing, without saying a town twice: a geocoded city
 * like "Victoria Falls Municipality" for the suburb "Victoria Falls" reads
 * just "Victoria Falls".
 */
export function placeName(suburb: string | null | undefined, city: string | null | undefined): string {
  const s = suburb?.trim() ?? "";
  const c = city?.trim() ?? "";
  if (!s) return c;
  if (!c || c.toLowerCase().includes(s.toLowerCase())) return s;
  return `${s}, ${c}`;
}

/** Capitalise the first letter, for text typed all in lower case. */
export function capitalise(text: string | null | undefined): string {
  const t = text?.trim() ?? "";
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}
