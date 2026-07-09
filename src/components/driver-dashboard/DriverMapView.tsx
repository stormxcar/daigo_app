import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, InteractionManager, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Crosshair, MapPinned, MapPin, Navigation2, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeMapUnavailable, getNativeMapLibre } from '@/components/NativeMapLibre';
import { DeviceLocation } from '@/services/deviceLocation';
import { DrivingRoute, LatLng, getDrivingRoute } from '@/services/mapRouteService';
import { useTheme } from '@/theme';
import { fontForWeight, fontSize, spacing, shadows } from '@/theme/tokens';
import { Booking } from '@/types';
import { BOOKING_STATUS } from '@/constants';

type MapPoint = LatLng;

const goongStyleUrl = () => {
  const mapKey = process.env.EXPO_PUBLIC_GOONG_MAP_KEY;
  if (!mapKey) return null;
  return `https://tiles.goong.io/assets/goong_map_web.json?api_key=${encodeURIComponent(mapKey)}`;
};

const fallbackMapStyle = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#dbeafe' } }],
} as any;

const toLngLat = (point: MapPoint): [number, number] => [point.longitude, point.latitude];

const getBounds = (points: MapPoint[]): [number, number, number, number] => {
  const lngs = points.map((point) => point.longitude);
  const lats = points.map((point) => point.latitude);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
};


const radiusFeature = (center: MapPoint | null, radiusKm: number) => {
  if (!center) return { type: 'FeatureCollection', features: [] };
  const earthRadiusMeters = 6371000;
  const radiusMeters = radiusKm * 1000;
  const lat = (center.latitude * Math.PI) / 180;
  const lng = (center.longitude * Math.PI) / 180;
  const coordinates: [number, number][] = [];

  for (let index = 0; index <= 64; index += 1) {
    const bearing = (index / 64) * 2 * Math.PI;
    const pointLat = Math.asin(
      Math.sin(lat) * Math.cos(radiusMeters / earthRadiusMeters) +
      Math.cos(lat) * Math.sin(radiusMeters / earthRadiusMeters) * Math.cos(bearing),
    );
    const pointLng = lng + Math.atan2(
      Math.sin(bearing) * Math.sin(radiusMeters / earthRadiusMeters) * Math.cos(lat),
      Math.cos(radiusMeters / earthRadiusMeters) - Math.sin(lat) * Math.sin(pointLat),
    );
    coordinates.push([(pointLng * 180) / Math.PI, (pointLat * 180) / Math.PI]);
  }

  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [coordinates] },
    }],
  };
};
const routeFeature = (route: DrivingRoute | null) => ({
  type: 'FeatureCollection',
  features: route?.coordinates?.length
    ? [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: route.coordinates.map(toLngLat),
          },
        },
      ]
    : [],
});

function DriverMarker({ online }: { online: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.driverMarker, { backgroundColor: online ? colors.success : colors.textSecondary, borderColor: '#ffffff' }]}>
      <Navigation2 size={18} color="white" fill="white" />
    </View>
  );
}

function BookingMarker({ type }: { type: 'pickup' | 'dropoff' | 'nearby' }) {
  const { colors } = useTheme();
  const color = type === 'dropoff' ? colors.error : type === 'nearby' ? colors.warning : colors.primary;
  return (
    <View style={[styles.bookingMarker, { backgroundColor: color }]}> 
      {type === 'nearby' ? <UserRound size={15} color="white" /> : <MapPin size={15} color="white" fill="white" />}
    </View>
  );
}

export type DriverDashboardRouteState = {
  loading: boolean;
  route: DrivingRoute | null;
  error: string | null;
};

type Props = {
  location: DeviceLocation | null;
  isOnline: boolean;
  activeTrip?: Booking | null;
  nearbyBookings?: Booking[];
  pickupRadiusKm?: 2 | 5 | 10;
  followDriver?: boolean;
  onCenterPress?: () => void;
  onBookingPress?: (booking: Booking) => void;
  onRouteStateChange?: (state: DriverDashboardRouteState) => void;
};

const getBookingPoint = (booking?: Booking | null, kind: 'pickup' | 'dropoff' = 'pickup'): MapPoint | null => {
  if (!booking) return null;
  const lat = kind === 'pickup' ? booking.pickupLat : booking.dropoffLat;
  const lng = kind === 'pickup' ? booking.pickupLng : booking.dropoffLng;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return { latitude: lat, longitude: lng };
};

const getActiveTarget = (booking?: Booking | null): { point: MapPoint | null; phase: 'pickup' | 'dropoff' } => {
  const phase = booking?.status === BOOKING_STATUS.TRIP_STARTED ? 'dropoff' : 'pickup';
  return { point: getBookingPoint(booking, phase), phase };
};

export function DriverMapView({
  location,
  isOnline,
  activeTrip,
  nearbyBookings = [],
  pickupRadiusKm = 5,
  followDriver = true,
  onCenterPress,
  onBookingPress,
  onRouteStateChange,
}: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [mapReady, setMapReady] = useState(false);
  const [route, setRoute] = useState<DrivingRoute | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const nativeMap = mapReady ? getNativeMapLibre() : null;
  const cameraRef = useRef<any>(null);

  const driverPoint = useMemo(() => {
    if (!location) return null;
    return { latitude: location.lat, longitude: location.lng };
  }, [location]);

  const { point: activeTargetPoint, phase } = useMemo(() => getActiveTarget(activeTrip), [activeTrip]);
  const nearbyPoints = useMemo(
    () => nearbyBookings.map((booking) => ({ booking, point: getBookingPoint(booking, 'pickup') })).filter((item): item is { booking: Booking; point: MapPoint } => !!item.point),
    [nearbyBookings],
  );
  const routeTargetPoint = activeTargetPoint ?? nearbyPoints[0]?.point ?? null;
  const radiusGeoJSON = useMemo(() => radiusFeature(driverPoint, pickupRadiusKm), [driverPoint, pickupRadiusKm]);
  const routeGeoJSON = useMemo(() => routeFeature(route), [route]);
  const mapPoints = useMemo(() => {
    if (route?.coordinates?.length) return route.coordinates;
    return [driverPoint, routeTargetPoint, ...nearbyPoints.slice(0, 4).map((item) => item.point)].filter(Boolean) as MapPoint[];
  }, [driverPoint, nearbyPoints, route?.coordinates, routeTargetPoint]);

  const styleUrl = goongStyleUrl();
  const MapView = nativeMap?.Map;
  const Camera = nativeMap?.Camera;
  const Marker = nativeMap?.Marker;
  const GeoJSONSource = nativeMap?.GeoJSONSource;
  const Layer = nativeMap?.Layer;

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setMapReady(true));
    return () => task.cancel();
  }, []);

  useEffect(() => {
    if (!driverPoint || !routeTargetPoint) {
      setRoute(null);
      setRouteError(null);
      onRouteStateChange?.({ loading: false, route: null, error: null });
      return;
    }

    let active = true;
    onRouteStateChange?.({ loading: true, route: null, error: null });
    getDrivingRoute(driverPoint, routeTargetPoint)
      .then((nextRoute) => {
        if (!active) return;
        setRoute(nextRoute);
        setRouteError(null);
        onRouteStateChange?.({ loading: false, route: nextRoute, error: null });
      })
      .catch((error: any) => {
        if (!active) return;
        const message = error?.message ?? 'Không thể tải lộ trình Goong.';
        setRoute(null);
        setRouteError(message);
        onRouteStateChange?.({ loading: false, route: null, error: message });
      });

    return () => {
      active = false;
    };
  }, [driverPoint, onRouteStateChange, routeTargetPoint]);

  useEffect(() => {
    if (!cameraRef.current || !driverPoint || !followDriver) return;
    if (activeTargetPoint && mapPoints.length >= 2) {
      cameraRef.current.fitBounds(getBounds(mapPoints), {
        padding: { top: 128, right: 48, bottom: 330, left: 48 },
        duration: 450,
      });
      return;
    }
    cameraRef.current.setCamera({
      centerCoordinate: [driverPoint.longitude, driverPoint.latitude],
      zoomLevel: nearbyPoints.length ? 13 : 14,
      animationDuration: 420,
    });
  }, [activeTargetPoint, driverPoint, followDriver, mapPoints, nearbyPoints.length]);

  const centerMap = () => {
    if (!cameraRef.current || !driverPoint) return;
    if (mapPoints.length >= 2) {
      cameraRef.current.fitBounds(getBounds(mapPoints), {
        padding: { top: 128, right: 48, bottom: 330, left: 48 },
        duration: 500,
      });
    } else {
      cameraRef.current.setCamera({ centerCoordinate: [driverPoint.longitude, driverPoint.latitude], zoomLevel: 14, animationDuration: 500 });
    }
    onCenterPress?.();
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#dbeafe' }]}> 
      {driverPoint && nativeMap && MapView && Camera && Marker ? (
        <MapView
          mapStyle={styleUrl ?? fallbackMapStyle}
          style={StyleSheet.absoluteFill}
          androidView="texture"
          compass
          attribution={false}
          logo={false}
          dragPan
          touchZoom
          touchRotate
          touchPitch
        >
          <Camera
            ref={cameraRef}
            centerCoordinate={[driverPoint.longitude, driverPoint.latitude]}
            zoomLevel={activeTrip ? 14 : 13}
            animationMode="flyTo"
            animationDuration={550}
          />

          {driverPoint && GeoJSONSource && Layer && (
            <GeoJSONSource id="driver-dashboard-radius-source" data={radiusGeoJSON as any}>
              <Layer id="driver-dashboard-radius-fill" type="fill" style={{ fillColor: colors.primary, fillOpacity: 0.11 } as any} />
              <Layer id="driver-dashboard-radius-outline" type="line" style={{ lineColor: colors.primary, lineWidth: 2, lineOpacity: 0.36 } as any} />
            </GeoJSONSource>
          )}

          {route && GeoJSONSource && Layer && (
            <GeoJSONSource id="driver-dashboard-route-source" data={routeGeoJSON as any}>
              <Layer id="driver-dashboard-route-outline" type="line" style={{ lineColor: '#ffffff', lineWidth: 9, lineOpacity: 0.9, lineJoin: 'round', lineCap: 'round' } as any} />
              <Layer id="driver-dashboard-route-line" type="line" style={{ lineColor: colors.primary, lineWidth: 5, lineOpacity: 0.96, lineJoin: 'round', lineCap: 'round' } as any} />
            </GeoJSONSource>
          )}

          {activeTargetPoint && (
            <Marker id={`active-${phase}`} lngLat={toLngLat(activeTargetPoint)} anchor="bottom">
              <BookingMarker type={phase} />
            </Marker>
          )}

          {!activeTrip && nearbyPoints.slice(0, 8).map(({ booking, point }) => (
            <Marker key={booking.id} id={`nearby-${booking.id}`} lngLat={toLngLat(point)} anchor="bottom">
              <TouchableOpacity activeOpacity={0.82} onPress={() => onBookingPress?.(booking)}>
                <BookingMarker type="nearby" />
              </TouchableOpacity>
            </Marker>
          ))}

          <Marker id="driver-current-location" lngLat={[driverPoint.longitude, driverPoint.latitude]} anchor="center">
            <DriverMarker online={isOnline} />
          </Marker>
        </MapView>
      ) : driverPoint && mapReady ? (
        <NativeMapUnavailable height="100%" />
      ) : (
        <View style={[styles.fallback, { backgroundColor: isDark ? '#0f172a' : '#dbeafe' }]}> 
          {driverPoint ? <ActivityIndicator color={colors.primary} /> : <MapPinned size={42} color={colors.primary} />}
          <Text style={[styles.fallbackTitle, { color: colors.text }]}>{driverPoint ? 'Đang chuẩn bị bản đồ' : 'Chưa có vị trí tài xế'}</Text>
          <Text style={[styles.fallbackText, { color: colors.textSecondary }]}> 
            {driverPoint
              ? 'Bản đồ được mount sau khi màn hình ổn định để giảm tải bộ nhớ.'
              : 'Bật GPS hoặc nhập vị trí thủ công để dashboard hiển thị bản đồ nhận chuyến.'}
          </Text>
        </View>
      )}

      <View pointerEvents="none" style={[styles.mapShade, { backgroundColor: isDark ? 'rgba(15,23,42,0.22)' : 'rgba(15,23,42,0.04)' }]} />

      {!!routeError && activeTrip && (
        <View style={[styles.routeWarning, { top: insets.top + 184, backgroundColor: colors.warning + 'EE' }]}> 
          <Text numberOfLines={1} style={styles.routeWarningText}>Chưa tải được lộ trình Goong, vẫn hiển thị marker chuyến.</Text>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.84}
        onPress={centerMap}
        disabled={!driverPoint}
        style={[styles.centerButton, { top: insets.top + 74, backgroundColor: isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.94)', opacity: driverPoint ? 1 : 0.55 }]}
      >
        <Crosshair size={20} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['2xl'] },
  fallbackTitle: { marginTop: spacing.md, fontSize: fontSize.lg, ...fontForWeight('900'), textAlign: 'center' },
  fallbackText: { marginTop: spacing.sm, fontSize: fontSize.sm, lineHeight: 20, textAlign: 'center' },
  driverMarker: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 3, ...shadows.md },
  bookingMarker: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', ...shadows.md },
  mapShade: { ...StyleSheet.absoluteFillObject },
  centerButton: { position: 'absolute', right: spacing.lg, width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', ...shadows.md },
  routeWarning: { position: 'absolute', left: spacing.lg, right: spacing.lg, borderRadius: 18, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...shadows.sm },
  routeWarningText: { color: '#fff', fontSize: fontSize.xs, ...fontForWeight('800') },
});







