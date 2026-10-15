import AsyncStorage from '@react-native-async-storage/async-storage';

// Accept stored profile coordinates, post coordinates and GeoJSON points.
export const coordinatesOf = (record) => {
  if (!record || typeof record !== 'object') return null;
  const candidates = [record, record.location, record.serviceLocation, record.coordinates, record.provider, record.user, record.poster];
  for (const value of candidates) {
    if (!value || typeof value !== 'object') continue;
    const lat = value.latitude ?? value.lat ?? value.locationLat ?? (Array.isArray(value.coordinates) ? value.coordinates[1] : undefined);
    const lng = value.longitude ?? value.lng ?? value.lon ?? value.locationLng ?? (Array.isArray(value.coordinates) ? value.coordinates[0] : undefined);
    if (lat == null || lng == null || String(lat).trim() === '' || String(lng).trim() === '') continue;
    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180) {
      return { latitude: Number(lat), longitude: Number(lng) };
    }
  }
  return null;
};

export const distanceKm = (a, b) => {
  const rad = (value) => value * Math.PI / 180;
  const h = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
};

export const sortByDistance = (records, origin) => records.map((record, index) => {
  const destination = coordinatesOf(record);
  return { record, index, distance: origin && destination ? distanceKm(origin, destination) : Infinity };
}).sort((a, b) => a.distance - b.distance || a.index - b.index).map(({ record, distance }) => ({ ...record, distanceKm: Number.isFinite(distance) ? distance : null }));

export const sortNearby = async (records, authBase, viewerRole, targetRole) => {
  const stored = await AsyncStorage.getItem('user');
  let user = {};
  try { user = stored ? JSON.parse(stored) : {}; } catch (_) {}
  const token = await AsyncStorage.getItem('userToken') || await AsyncStorage.getItem('token');
  const profiles = new Map();
  const profile = (role, id) => {
    if (!id) return Promise.resolve(null);
    const key = role === 'provider' ? 'provider-directory' : `${role}:${id}`;
    if (!profiles.has(key)) profiles.set(key, (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(role === 'provider' ? `${authBase}/provider/providers` : `${authBase}/${role}/user/${encodeURIComponent(id)}`, { signal: controller.signal, headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!response.ok) return null;
        const body = await response.json();
        if (role === 'provider') return body.providers || [];
        return body.user || body.provider || body.seeker || body.data?.user || body.data?.provider || body.data || body;
      } catch (_) { return null; }
      finally { clearTimeout(timeout); }
    })());
    return profiles.get(key).then((value) => role === 'provider' && Array.isArray(value) ? value.find((person) => String(person._id || person.id) === String(id)) || null : value);
  };
  const origin = coordinatesOf(user) || coordinatesOf(await profile(viewerRole, user._id || user.id || await AsyncStorage.getItem('userId')));
  if (!origin) return sortByDistance(records, null);
  const enriched = [];
  // Bound concurrent profile lookups when a feed has many authors.
  for (let offset = 0; offset < records.length; offset += 8) {
    enriched.push(...await Promise.all(records.slice(offset, offset + 8).map(async (record) => {
      if (coordinatesOf(record)) return record;
      const person = targetRole === 'provider' ? record.provider : record.user;
      const idValue = targetRole === 'provider' ? record.providerId || person?.id || person?._id : record.seekerId || record.userId || person?._id;
      const id = typeof idValue === 'object' ? idValue?._id || idValue?.id : idValue;
      const coordinates = coordinatesOf(await profile(targetRole, id));
      return coordinates ? { ...record, coordinates } : record;
    })));
  }
  return sortByDistance(enriched, origin);
};
