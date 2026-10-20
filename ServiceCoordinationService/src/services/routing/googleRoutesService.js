import axios from "axios";

const GOOGLE_ROUTES_URL =
  "https://routes.googleapis.com/directions/v2:computeRoutes";

const parseGoogleDurationSeconds = (value = "") => {
  const match = String(value).match(/^([0-9]+(?:\.[0-9]+)?)s$/);
  return match ? Number(match[1]) : null;
};

export async function getGoogleRoute(prevLat, prevLng, nextLat, nextLng, { departureTime } = {}) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

  if (!apiKey || /your[_ -]|replace|example|placeholder/i.test(apiKey)) {
    throw new Error("Set GOOGLE_MAPS_API_KEY to a real Google Routes API key in ServiceCoordinationService/.env and restart the service");
  }

  const requestedDeparture = departureTime == null ? null : new Date(departureTime);
  if (requestedDeparture && !Number.isFinite(+requestedDeparture)) throw new Error('Invalid routing departure time');
  // Driving predictions cannot depart in the past. Retain the requested time
  // separately so the snapshot discloses when current traffic was used instead.
  const effectiveDeparture = new Date(Math.max(requestedDeparture ? +requestedDeparture : 0, Date.now() + 1000));
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
      routingPreference: "TRAFFIC_AWARE_OPTIMAL",
      departureTime: effectiveDeparture.toISOString(),
      computeAlternativeRoutes: false,
      units: "METRIC",
    },
    {
      timeout: Number(process.env.ROUTING_TIMEOUT_MS || 10000),
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
    routingPreference: "TRAFFIC_AWARE_OPTIMAL",
    departureTime: effectiveDeparture.toISOString(),
    requestedDepartureTime: requestedDeparture?.toISOString() || null,
  };
}
