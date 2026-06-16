import * as Linking from 'expo-linking';
import { LatLng } from './mapRouteService';

export function buildExternalDirectionsUrl(origin: LatLng, destination: LatLng) {
  const params = new URLSearchParams({
    api: '1',
    origin: `${origin.latitude},${origin.longitude}`,
    destination: `${destination.latitude},${destination.longitude}`,
    travelmode: 'driving',
    dir_action: 'navigate',
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export async function openExternalDirections(origin: LatLng, destination: LatLng) {
  const url = buildExternalDirectionsUrl(origin, destination);
  await Linking.openURL(url);
}
