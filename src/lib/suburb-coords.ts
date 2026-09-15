// Approximate centre points for Harare suburbs, used to pinpoint each area on a
// map. The featured/guided suburbs use coordinates confirmed from listing data;
// the rest are approximate centroids — refine with exact points when available.
export const SUBURB_COORDS: Record<string, { lat: number; lng: number }> = {
  Borrowdale: { lat: -17.751, lng: 31.107 },
  "Borrowdale Brooke": { lat: -17.722, lng: 31.115 },
  Highlands: { lat: -17.793, lng: 31.09 },
  "Mount Pleasant": { lat: -17.762, lng: 31.041 },
  Avondale: { lat: -17.799, lng: 31.034 },
  Chisipite: { lat: -17.776, lng: 31.116 },
  "Glen Lorne": { lat: -17.741, lng: 31.15 },
  Greendale: { lat: -17.8, lng: 31.12 },
  "Greystone Park": { lat: -17.74, lng: 31.1 },
  Helensvale: { lat: -17.74, lng: 31.12 },
  "Hogerty Hill": { lat: -17.73, lng: 31.12 },
  Mandara: { lat: -17.8, lng: 31.13 },
  Marlborough: { lat: -17.77, lng: 30.99 },
  Newlands: { lat: -17.8, lng: 31.07 },
  Pomona: { lat: -17.7, lng: 31.1 },
  Vainona: { lat: -17.74, lng: 31.07 },
  Belgravia: { lat: -17.812, lng: 31.045 },
  "Milton Park": { lat: -17.81, lng: 31.03 },
  Mabelreign: { lat: -17.78, lng: 30.99 },
  Westgate: { lat: -17.77, lng: 30.97 },
};

export function suburbCoords(name: string | null | undefined) {
  return name ? (SUBURB_COORDS[name] ?? null) : null;
}

/** Office location (7 Normandy Rd, Avondale, Harare) — used for the contact-page
 *  map. Directions links use the address string so Google/Waze geocode the house
 *  number themselves; these coords just centre the embedded map on Normandy Road.
 *  Source: OpenStreetMap (Normandy Road, Avondale, Harare). */
export const OFFICE_COORDS = { lat: -17.79244, lng: 31.04598 };
