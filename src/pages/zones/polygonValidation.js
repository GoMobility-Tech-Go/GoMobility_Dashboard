import { area as turfArea, kinks } from "@turf/turf";

// Backend enforces: 10 m² (0.00001 km²) MIN, 100 km² MAX
const MIN_AREA_KM2 = 0.00001;
const MAX_AREA_KM2 = 100;

export function validatePolygon(geojson) {
  if (!geojson) {
    return { valid: false, error: "No polygon drawn" };
  }

  // Wrap into Feature for Turf
  const feature = { type: "Feature", properties: {}, geometry: geojson };

  // Self-intersection check
  try {
    const intersections = kinks(feature);
    if (intersections?.features?.length > 0) {
      const pt = intersections.features[0]?.geometry?.coordinates;
      const at = pt ? ` at ${pt[0].toFixed(4)},${pt[1].toFixed(4)}` : "";
      return { valid: false, error: `Polygon self-intersects${at}` };
    }
  } catch (e) {
    // Turf can throw on MultiPolygon in kinks — skip for MultiPolygon
    if (geojson.type !== "MultiPolygon") {
      return { valid: false, error: `Polygon geometry invalid: ${e.message}` };
    }
  }

  // Area check
  let areaM2 = 0;
  try {
    areaM2 = turfArea(feature);
  } catch (e) {
    return { valid: false, error: `Could not compute polygon area: ${e.message}` };
  }
  const areaKm2 = areaM2 / 1_000_000;

  if (areaKm2 < MIN_AREA_KM2) {
    return { valid: false, error: `Polygon too small (${areaKm2.toFixed(6)} km² ≈ ${areaM2.toFixed(1)} m²). Minimum: 10 m² (0.00001 km²).`, areaKm2 };
  }
  if (areaKm2 > MAX_AREA_KM2) {
    return { valid: false, error: `Polygon too large (${areaKm2.toFixed(2)} km²). Maximum: ${MAX_AREA_KM2} km².`, areaKm2 };
  }

  return { valid: true, areaKm2 };
}

export function formatAreaLabel(areaKm2) {
  if (areaKm2 == null) return "—";
  if (areaKm2 < 0.001) return `${(areaKm2 * 1_000_000).toFixed(0)} m²`;
  if (areaKm2 < 1)     return `${(areaKm2 * 100).toFixed(2)} hectare`;
  return `${areaKm2.toFixed(2)} km²`;
}
