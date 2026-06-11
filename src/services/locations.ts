export interface LocationSuggestion {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export async function searchVietnamLocations(query: string): Promise<LocationSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    q: trimmed,
    format: 'jsonv2',
    addressdetails: '1',
    countrycodes: 'vn',
    limit: '6',
    'accept-language': 'vi',
  });

  const email = process.env.EXPO_PUBLIC_NOMINATIM_EMAIL;
  if (email) params.set('email', email);

  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'booking-daigo-mobile/1.0',
    },
  });

  if (!response.ok) {
    throw new Error('Không thể tải gợi ý địa điểm');
  }

  const data = (await response.json()) as Array<{
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
  }>;

  return data.map((item) => ({
    id: String(item.place_id),
    label: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
  }));
}

export function getDistanceKm(from?: LocationSuggestion | null, to?: LocationSuggestion | null) {
  if (!from || !to) return 0;

  const earthRadiusKm = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return Math.max(1, Math.round(earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))));
}

