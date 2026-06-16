import * as Location from 'expo-location';
import { LatLng } from './mapRouteService';

export async function ensureForegroundLocationPermission() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
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

