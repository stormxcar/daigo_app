import * as Location from 'expo-location';

export interface DeviceLocation {
  label: string;
  lat: number;
  lng: number;
}

const PLUS_CODE_PATTERN = /^[23456789CFGHJMPQRVWX]{4,}\+[23456789CFGHJMPQRVWX]{2,}/i;

const cleanAddressParts = (parts: (string | null | undefined)[]) =>
  parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .filter((part) => !PLUS_CODE_PATTERN.test(part));

async function reverseGeocodeWithNominatim(lat: number, lng: number) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'jsonv2',
    addressdetails: '1',
    'accept-language': 'vi',
  });

  const email = process.env.EXPO_PUBLIC_NOMINATIM_EMAIL;
  if (email) params.set('email', email);

  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'booking-daigo-mobile/1.0',
    },
  });

  if (!response.ok) return null;
  const data = (await response.json()) as { display_name?: string };
  return data.display_name ?? null;
}

export async function getCurrentDeviceLocation(): Promise<DeviceLocation> {
  // Check existing permission first to avoid showing the dialog multiple times
  const existing = await Location.getForegroundPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Location.requestForegroundPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') {
    throw new Error('Bạn cần cho phép truy cập vị trí để dùng GPS.');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Highest,
  });

  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const addresses = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
  const first = addresses[0];
  const localParts = first
    ? cleanAddressParts([
        first.streetNumber && first.street ? `${first.streetNumber} ${first.street}` : undefined,
        first.street,
        first.district,
        first.city,
        first.region,
      ])
    : [];
  const localLabel = Array.from(new Set(localParts)).join(', ');
  const nominatimLabel =
    localLabel.length < 12 ? await reverseGeocodeWithNominatim(lat, lng).catch(() => null) : null;
  const label = nominatimLabel || localLabel || `Vị trí hiện tại (${lat.toFixed(5)}, ${lng.toFixed(5)})`;

  return { label, lat, lng };
}
