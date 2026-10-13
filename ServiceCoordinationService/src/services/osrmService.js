import axios from "axios";

const OSRM_BASE_URL = "https://router.project-osrm.org";
const toRadians = (value) => (Number(value) * Math.PI) / 180;
const getHaversineDistanceKm = (lat1, lng1, lat2, lng2) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Calculates road distance and estimated travel time between two locations.
 * OSRM requires coordinates in longitude,latitude order.
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
    };
  }

  try {
    const url =
      `${OSRM_BASE_URL}/route/v1/driving/` +
      `${prevLng},${prevLat};${nextLng},${nextLat}?overview=false`;

    const response = await axios.get(url);

    if (
      !response.data ||
      response.data.code !== "Ok" ||
      !response.data.routes ||
      response.data.routes.length === 0
    ) {
      throw new Error("No route found from OSRM");
    }

    const route = response.data.routes[0];

    return {
      distanceKm: Number((route.distance / 1000).toFixed(2)),
      estimatedTravelTimeMins: Math.round(route.duration / 60),
      source: "OSRM",
    };
  } catch (error) {
    console.error("OSRM route calculation failed:", error.message);
    const distanceKm = getHaversineDistanceKm(prevLat, prevLng, nextLat, nextLng);
    return {
      distanceKm: Number(distanceKm.toFixed(2)),
      estimatedTravelTimeMins: Math.max(1, Math.round((distanceKm / 35) * 60)),
      source: "HAVERSINE_FALLBACK",
    };
  }
}
