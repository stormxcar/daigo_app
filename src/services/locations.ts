export interface LocationSuggestion {
  id: string;
  label: string;
  lat: number;
  lng: number;
  provider?: 'goong' | 'nominatim';
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const GOONG_API_URL = 'https://rsapi.goong.io';
const LOCATION_CACHE_TTL = 5 * 60 * 1000;

const locationCache = new Map<string, { expiresAt: number; results: LocationSuggestion[] }>();

type GoongPrediction = {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

async function getGoongPlaceDetail(placeId: string) {
  const apiKey = process.env.EXPO_PUBLIC_GOONG_API_KEY;
  if (!apiKey) return null;

  const params = new URLSearchParams({
    place_id: placeId,
    api_key: apiKey,
  });

  const response = await fetch(`${GOONG_API_URL}/Place/Detail?${params.toString()}`);
  if (!response.ok) return null;
  const data = await response.json();
  const location = data.result?.geometry?.location;
  if (typeof location?.lat !== 'number' || typeof location?.lng !== 'number') return null;

  return {
    lat: location.lat,
    lng: location.lng,
  };
}

async function searchGoongLocations(query: string): Promise<LocationSuggestion[]> {
  const apiKey = process.env.EXPO_PUBLIC_GOONG_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    input: query,
    api_key: apiKey,
  });

  const response = await fetch(`${GOONG_API_URL}/Place/AutoComplete?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Không thể tải gợi ý địa điểm từ Goong');
  }

  const data = await response.json();
  const predictions = (data.predictions ?? []) as GoongPrediction[];
  const limitedPredictions = predictions.slice(0, 6);

  const suggestions = await Promise.all(
    limitedPredictions.map(async (item) => {
      const detail = await getGoongPlaceDetail(item.place_id).catch(() => null);
      if (!detail) return null;

      const suggestion: LocationSuggestion = {
        id: item.place_id,
        label: item.description,
        lat: detail.lat,
        lng: detail.lng,
        provider: 'goong',
      };
      return suggestion;
    })
  );

  return suggestions.filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export async function searchVietnamLocations(query: string): Promise<LocationSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const cacheKey = trimmed.toLocaleLowerCase('vi-VN');
  const cached = locationCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.results;
  }

  const goongResults = await searchGoongLocations(trimmed);
  if (goongResults.length > 0) {
    locationCache.set(cacheKey, { expiresAt: Date.now() + LOCATION_CACHE_TTL, results: goongResults });
    return goongResults;
  }

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

  const results: LocationSuggestion[] = data.map((item) => ({
    id: String(item.place_id),
    label: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
    provider: 'nominatim' as const,
  }));

  locationCache.set(cacheKey, { expiresAt: Date.now() + LOCATION_CACHE_TTL, results });
  return results;
}

export async function reverseVietnamLocation(lat: number, lng: number): Promise<LocationSuggestion> {
  const apiKey = process.env.EXPO_PUBLIC_GOONG_API_KEY;

  if (apiKey) {
    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      api_key: apiKey,
    });

    const response = await fetch(`${GOONG_API_URL}/Geocode?${params.toString()}`);
    if (response.ok) {
      const data = await response.json();
      const address = data.results?.[0]?.formatted_address;
      if (address) {
        return {
          id: `goong-reverse-${lat}-${lng}`,
          label: address,
          lat,
          lng,
          provider: 'goong',
        };
      }
    }
  }

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'jsonv2',
    addressdetails: '1',
    'accept-language': 'vi',
  });

  const email = process.env.EXPO_PUBLIC_NOMINATIM_EMAIL;
  if (email) params.set('email', email);

  const response = await fetch(`${NOMINATIM_REVERSE_URL}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'booking-daigo-mobile/1.0',
    },
  });

  if (!response.ok) {
    throw new Error('Không thể lấy địa chỉ từ tọa độ đã chọn');
  }

  const data = (await response.json()) as { place_id?: number; display_name?: string };
  return {
    id: String(data.place_id ?? `reverse-${lat}-${lng}`),
    label: data.display_name || 'Vị trí đã chọn',
    lat,
    lng,
    provider: 'nominatim',
  };
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
