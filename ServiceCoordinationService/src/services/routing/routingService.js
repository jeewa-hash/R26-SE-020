import { getGoogleRoute } from "./googleRoutesService.js";

const toRadians = (value) => (Number(value) * Math.PI) / 180;

const getHaversineDistanceKm = (lat1, lng1, lat2, lng2) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const haversineFallback = (prevLat, prevLng, nextLat, nextLng) => {
  const distanceKm = getHaversineDistanceKm(prevLat, prevLng, nextLat, nextLng);
  return {
    distanceKm: Number(distanceKm.toFixed(2)),
    estimatedTravelTimeMins: Math.max(1, Math.ceil((distanceKm / 35) * 60)),
    source: "HAVERSINE_FALLBACK",
    trafficAware: false,
  };
};

/**
 * Primary routing provider = Google Routes API.
 * Haversine remains a resilience fallback and is explicitly labelled.
 */
export async function getRoadDistanceAndTime(prevLat, prevLng, nextLat, nextLng) {
  if (
    prevLat == null ||
    prevLng == null ||
    nextLat == null ||
    nextLng == null
  ) {
    return {
      distanceKm: 0,
      estimatedTravelTimeMins: 0,
      source: "NO_COORDINATES",
      trafficAware: false,
    };
  }

  try {
    return await getGoogleRoute(prevLat, prevLng, nextLat, nextLng);
  } catch (error) {
    console.error("Google Routes calculation failed:", error.message);
    return haversineFallback(prevLat, prevLng, nextLat, nextLng);
  }
}
