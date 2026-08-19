import axios from "axios";

const OSRM_BASE_URL = "https://router.project-osrm.org";

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

    return {
      distanceKm: 0,
      estimatedTravelTimeMins: 0,
      source: "OSRM_FAILED",
    };
  }
}