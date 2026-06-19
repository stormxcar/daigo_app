import * as Location from 'expo-location';
import { LatLng } from './mapRouteService';

export async function ensureForegroundLocationPermission() {
  // Check existing permission first to avoid showing the dialog multiple times
  const existing = await Location.getForegroundPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Location.requestForegroundPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') {
    throw new Error('Bạn cần cấp quyền vị trí để dùng GPS.');
  }

  const enabled = await Location.hasServicesEnabledAsync();
  if (!enabled) {
    throw new Error('Vui lòng bật GPS để bắt đầu lộ trình.');
  }
}

export async function getCurrentLatLng(): Promise<LatLng> {
  await ensureForegroundLocationPermission();
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.BestForNavigation,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

