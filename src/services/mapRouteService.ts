export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface DrivingRoute {
  coordinates: LatLng[];
  distanceMeters: number;
  duration: string;
  durationSeconds: number;
  encodedPolyline: string;
}

const GOONG_DIRECTIONS_URL = 'https://rsapi.goong.io/direction';

export function decodeGoongPolyline(encoded: string): LatLng[] {
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  const coordinates: LatLng[] = [];

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    latitude += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    longitude += result & 1 ? ~(result >> 1) : result >> 1;
    coordinates.push({ latitude: latitude / 1e5, longitude: longitude / 1e5 });
  }

  return coordinates;
}

export async function getDrivingRoute(origin: LatLng, destination: LatLng): Promise<DrivingRoute> {
  const apiKey = process.env.EXPO_PUBLIC_GOONG_API_KEY;
  if (!apiKey) {
    throw new Error('Chưa cấu hình EXPO_PUBLIC_GOONG_API_KEY để tải lộ trình Goong.');
  }

  const params = new URLSearchParams({
    origin: `${origin.latitude},${origin.longitude}`,
    destination: `${destination.latitude},${destination.longitude}`,
    vehicle: 'car',
    api_key: apiKey,
  });

  const response = await fetch(`${GOONG_DIRECTIONS_URL}?${params.toString()}`);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'Không thể tải lộ trình Goong. Vui lòng thử lại.');
  }

  const route = data.routes?.[0];
  const encodedPolyline = route?.overview_polyline?.points;
  if (!encodedPolyline) {
    throw new Error(data?.message || 'Không có route Goong phù hợp cho lộ trình này.');
  }
  const leg = route.legs?.[0];

  return {
    coordinates: decodeGoongPolyline(encodedPolyline),
    distanceMeters: leg?.distance?.value ?? 0,
    duration: leg?.duration?.text ?? '',
    durationSeconds: leg?.duration?.value ?? 0,
    encodedPolyline,
  };
}
