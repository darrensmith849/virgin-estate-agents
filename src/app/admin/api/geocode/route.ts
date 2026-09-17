import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/dal";
import { SITE } from "@/lib/constants";

/*
 * Turn a typed address into map coordinates, so staff never have to know what
 * a latitude is.
 *
 * Backed by OpenStreetMap's Nominatim: free, no API key, same data as the maps
 * on the site. Its usage policy asks for an identifying User-Agent and at most
 * one request per second, so results are cached and calls are serialised behind
 * a minimum gap. Admin-only — this is a lookup on someone else's service.
 */

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const MIN_GAP_MS = 1_100;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

type ReversePlace = {
  label: string | null;
  road: string | null;
  addressLine: string | null;
  suburb: string | null;
  city: string | null;
  /** ISO country code of whatever the pin landed on, lowercase. */
  countryCode: string | null;
  /** True when the pin is not in Zimbabwe, so the caller can refuse it. */
  outsideZimbabwe: boolean;
};

type Hit = {
  lat: number;
  lon: number;
  label: string;
  /** Parsed from the result so choosing one can fill the form. */
  suburb: string | null;
  city: string | null;
};

const LAST_CALL = Symbol.for("virgin.geocode.lastCall");
const CACHE = Symbol.for("virgin.geocode.cache");

type GlobalStore = typeof globalThis & {
  [LAST_CALL]?: number;
  [CACHE]?: Map<string, { at: number; hits: Hit[]; place?: ReversePlace }>;
};
const g = globalThis as GlobalStore;

function cache() {
  if (!g[CACHE]) g[CACHE] = new Map();
  return g[CACHE]!;
}

/** Hold off until at least MIN_GAP_MS has passed since the last upstream call. */
async function throttle() {
  const now = Date.now();
  const wait = (g[LAST_CALL] ?? 0) + MIN_GAP_MS - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  g[LAST_CALL] = Date.now();
}


/*
 * Progressively looser forms of the same address.
 *
 * OpenStreetMap's Zimbabwe coverage rarely has house numbers, and street types
 * are usually abbreviated — "12 Dulverton Drive" finds nothing, while
 * "Dulverton Dr" is on the map. So the exact string is tried first and then
 * relaxed a step at a time, stopping at the first form that matches. Callers
 * see which form succeeded, so a street-level pin is obvious rather than
 * silently passed off as the exact address.
 */
const STREET_TYPES: [RegExp, string][] = [
  [/\bdrive\b/gi, "Dr"],
  [/\broad\b/gi, "Rd"],
  [/\bavenue\b/gi, "Ave"],
  [/\bstreet\b/gi, "St"],
  [/\bclose\b/gi, "Cl"],
  [/\bcrescent\b/gi, "Cres"],
  [/\blane\b/gi, "Ln"],
  [/\bcourt\b/gi, "Ct"],
];

function variants(query: string): string[] {
  const out: string[] = [];
  const push = (v: string) => {
    const clean = v.replace(/\s+/g, " ").replace(/(^|,)\s*,/g, "$1").trim();
    if (clean && !out.some((existing) => existing.toLowerCase() === clean.toLowerCase())) {
      out.push(clean);
    }
  };

  push(query);

  // Drop a leading house/stand number — the commonest reason for a miss.
  const noNumber = query.replace(/^\s*[\d]+[a-z]?\s+/i, "");
  push(noNumber);

  // Abbreviate the street type the way OSM tends to store it.
  let abbreviated = noNumber;
  for (const [pattern, short] of STREET_TYPES) abbreviated = abbreviated.replace(pattern, short);
  push(abbreviated);

  // Last resort: street name without any type word at all.
  let bare = noNumber;
  for (const [pattern] of STREET_TYPES) bare = bare.replace(pattern, "");
  push(bare);

  return out.slice(0, 4);
}

async function lookup(query: string): Promise<Hit[]> {
  await throttle();

  const url = new URL(ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  // The agency only sells in Zimbabwe; biasing avoids "Highlands, Scotland".
  url.searchParams.set("countrycodes", "zw");

  const res = await fetch(url, {
    headers: {
      // Nominatim's policy requires identifying the application.
      "User-Agent": `${SITE.name} listings admin (${SITE.url})`,
      "Accept-Language": "en",
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) {
    console.error("[geocode] upstream error", res.status);
    throw new Error(`upstream ${res.status}`);
  }

  const raw = (await res.json()) as {
    lat: string;
    lon: string;
    display_name: string;
    address?: Record<string, string>;
  }[];

  return raw
    .map((r) => {
      const a = r.address ?? {};
      return {
        lat: Number(r.lat),
        lon: Number(r.lon),
        label: r.display_name,
        // OSM files Harare's suburbs under several keys depending on the area.
        suburb:
          a.suburb ?? a.neighbourhood ?? a.residential ?? a.quarter ?? a.village ?? null,
        city: a.city ?? a.town ?? a.municipality ?? null,
      };
    })
    .filter((h) => Number.isFinite(h.lat) && Number.isFinite(h.lon));
}


/*
 * Reverse lookup: coordinates back to a place, used after the pin is dragged.
 *
 * Shares the throttle and cache with the forward lookups, since it is the same
 * upstream service under the same usage policy.
 */
async function reverseLookup(lat: number, lon: number) {
  await throttle();

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  // 18 is roughly building/street level; higher is noisier, lower loses the road.
  url.searchParams.set("zoom", "18");

  const res = await fetch(url, {
    headers: {
      "User-Agent": `${SITE.name} listings admin (${SITE.url})`,
      "Accept-Language": "en",
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`upstream ${res.status}`);

  const raw = (await res.json()) as {
    display_name?: string;
    address?: Record<string, string>;
  };
  const a = raw.address ?? {};
  const road = a.road ?? a.pedestrian ?? a.footway ?? null;
  /*
   * The forward search is restricted with countrycodes=zw, but reverse has no
   * such parameter — so a pin dropped over the border comes back as a foreign
   * place. Left unchecked that wrote "Guro, Manica" into the city of a Harare
   * listing. Flag it and let the client refuse rather than silently applying.
   */
  const countryCode = (a.country_code ?? "").toLowerCase() || null;
  return {
    label: raw.display_name ?? null,
    road,
    // House numbers are rare in this data, but use one when it is there.
    addressLine: road ? [a.house_number, road].filter(Boolean).join(" ") : null,
    suburb:
      a.suburb ?? a.neighbourhood ?? a.residential ?? a.quarter ?? a.village ?? null,
    city: a.city ?? a.town ?? a.municipality ?? null,
    countryCode,
    outsideZimbabwe: countryCode !== null && countryCode !== "zw",
  };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").trim();

  /*
   * "suggest" backs the type-ahead and runs at most two upstream lookups, so a
   * suggestion arrives in about a second rather than four. "resolve" is the
   * explicit deeper search and walks the full ladder. Nominatim's policy asks
   * that type-ahead be heavily throttled and cached, which is why the client
   * only fires on a pause and every result is cached for a day here.
   */
  if (params.get("mode") === "reverse") {
    const lat = Number(params.get("lat"));
    const lon = Number(params.get("lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
    }
    // Six decimals is ~0.1m, so nudging the pin doesn't miss the cache.
    const rk = `rev:${lat.toFixed(6)},${lon.toFixed(6)}`;
    const hit = cache().get(rk);
    if (hit && hit.at + CACHE_TTL_MS > Date.now()) {
      return NextResponse.json({ place: hit.place ?? null, cached: true });
    }
    try {
      const place = await reverseLookup(lat, lon);
      cache().set(rk, { at: Date.now(), hits: [], place });
      return NextResponse.json({ place });
    } catch (err) {
      console.error("[geocode] reverse failed", err);
      return NextResponse.json(
        { error: "Could not look that location up." },
        { status: 502 },
      );
    }
  }

  const suggesting = params.get("mode") === "suggest";
  // A couple of letters would match half of Harare and waste an upstream call.
  if (query.length < (suggesting ? 5 : 3)) {
    return NextResponse.json({ hits: [] });
  }

  const key = `${suggesting ? "s" : "r"}:${query.toLowerCase()}`;
  const cached = cache().get(key);
  if (cached && cached.at + CACHE_TTL_MS > Date.now()) {
    return NextResponse.json({ hits: cached.hits, cached: true });
  }

  try {
    let hits: Hit[] = [];
    let matched = query;
    // Three steps for suggestions, not two: in Harare the abbreviating step is
    // frequently the one that matches ("Dulverton Drive" misses, "Dulverton Dr"
    // hits), so stopping earlier fails precisely where help is needed. Worst
    // case that is ~2s behind the throttle, which a pause-triggered lookup can
    // absorb. The loosest step is left to the explicit deeper search, since it
    // tends to return noise.
    const ladder = suggesting ? variants(query).slice(0, 3) : variants(query);
    for (const candidate of ladder) {
      hits = await lookup(candidate);
      if (hits.length) {
        matched = candidate;
        break;
      }
    }

    const store = cache();
    // Cheap bound: drop the oldest insertion once the map gets large.
    if (store.size >= MAX_CACHE_ENTRIES) {
      const oldest = store.keys().next().value;
      if (oldest !== undefined) store.delete(oldest);
    }
    store.set(key, { at: Date.now(), hits });

    // `exact` is false when a looser form had to be used, so the caller can say
    // the pin is on the street rather than the door.
    return NextResponse.json({
      hits,
      exact: matched.toLowerCase() === query.toLowerCase(),
    });
  } catch (err) {
    console.error("[geocode] lookup failed", err);
    return NextResponse.json(
      { error: "Address lookup is unavailable right now." },
      { status: 502 },
    );
  }
}
