import axios from "axios";

const GOOGLE_ROUTES_URL =
  "https://routes.googleapis.com/directions/v2:computeRoutes";

const parseGoogleDurationSeconds = (value = "") => {
  const match = String(value).match(/^([0-9]+(?:\.[0-9]+)?)s$/);
  return match ? Number(match[1]) : null;
};

export async function getGoogleRoute(prevLat, prevLng, nextLat, nextLng) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }

  const response = await axios.post(
    GOOGLE_ROUTES_URL,
    {
      origin: {
        location: {
          latLng: {
            latitude: Number(prevLat),
            longitude: Number(prevLng),
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: Number(nextLat),
            longitude: Number(nextLng),
          },
        },
      },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: false,
      units: "METRIC",
    },
    {
      timeout: Number(process.env.ROUTING_TIMEOUT_MS || 5000),
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
      },
    }
  );

  const route = response.data?.routes?.[0];
  if (!route) throw new Error("Google Routes returned no route");

  const durationSeconds = parseGoogleDurationSeconds(route.duration);
  if (durationSeconds === null) {
    throw new Error("Google Routes returned an invalid route duration");
  }

  return {
    distanceKm: Number((Number(route.distanceMeters || 0) / 1000).toFixed(2)),
    estimatedTravelTimeMins: Math.max(1, Math.ceil(durationSeconds / 60)),
    source: "GOOGLE_ROUTES",
    trafficAware: true,
  };
}
