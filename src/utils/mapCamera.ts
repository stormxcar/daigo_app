import type { LatLng } from '@/services/mapRouteService';

export const getMapBounds = (points: LatLng[]): [number, number, number, number] => {
  const lngs = points.map((point) => point.longitude);
  const lats = points.map((point) => point.latitude);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
};

export const safeCancelInteraction = (task: unknown) => {
  const cancel = (task as { cancel?: () => void } | null)?.cancel;
  if (typeof cancel === 'function') cancel();
};

type CameraPadding = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

export const fitCameraToPoints = (
  camera: any,
  points: LatLng[],
  options: { padding?: CameraPadding; duration?: number; easing?: string } = {},
) => {
  if (!camera || points.length < 2 || typeof camera.fitBounds !== 'function') return false;
  camera.fitBounds(getMapBounds(points), {
    padding: options.padding,
    duration: options.duration,
    easing: options.easing,
  });
  return true;
};

export const centerCameraOnPoint = (
  camera: any,
  point: LatLng,
  options: { zoom?: number; duration?: number; easing?: string; pitch?: number; bearing?: number } = {},
) => {
  if (!camera) return false;
  const payload = {
    center: [point.longitude, point.latitude],
    zoom: options.zoom,
    duration: options.duration,
    easing: options.easing,
    pitch: options.pitch,
    bearing: options.bearing,
  };

  if (typeof camera.flyTo === 'function') {
    camera.flyTo(payload);
    return true;
  }

  if (typeof camera.easeTo === 'function') {
    camera.easeTo(payload);
    return true;
  }

  if (typeof camera.jumpTo === 'function') {
    camera.jumpTo(payload);
    return true;
  }

  return false;
};
