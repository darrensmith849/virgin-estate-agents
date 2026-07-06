/*
 * Deep links that open a location in the visitor's own maps app for
 * turn-by-turn directions from their current position. These are plain HTTPS
 * links so they work on every device:
 *  - Google: opens the Google Maps app on Android/iOS (web fallback elsewhere).
 *  - Apple:  opens Apple Maps on iOS/macOS (web fallback elsewhere).
 *  - Waze:   opens the Waze app, or its web client.
 */
export function directionsUrls(lat: number, lng: number) {
  const dest = `${lat},${lng}`;
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`,
    apple: `https://maps.apple.com/?daddr=${dest}&dirflg=d`,
    waze: `https://waze.com/ul?ll=${dest}&navigate=yes`,
  };
}

/** Directions to a street address — the maps apps geocode it precisely, which
 *  is more accurate than coordinates for a named address like the office. */
export function addressDirectionsUrls(address: string) {
  const q = encodeURIComponent(address);
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=driving`,
    apple: `https://maps.apple.com/?daddr=${q}&dirflg=d`,
    waze: `https://waze.com/ul?q=${q}&navigate=yes`,
  };
}

/** A link that just shows the pinned location (no directions) in Google Maps. */
export function mapSearchUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
