import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Car, Crosshair, Expand, LocateFixed, MapPin, Navigation, Route } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, shadows, spacing } from '@/theme/tokens';
import { Button } from '@/components/BaseComponents';
import { BOOKING_STATUS, TERMINAL_BOOKING_STATUSES } from '@/constants';
import { DriverLocation } from '@/types';
import { getDistanceMeters } from '@/services/driverLocation';
import { DrivingRoute, getDrivingRoute, LatLng } from '@/services/mapRouteService';
import { getNativeMapLibre, NativeMapUnavailable } from '@/components/NativeMapLibre';
import { showError, showInfo, showSuccess } from '@/utils/toast';

interface MapPoint {
  label: string;
  latitude: number;
  longitude: number;
}

interface RealtimeTripMapProps {
  pickup: MapPoint;
  dropoff: MapPoint;
  driverLocation?: DriverLocation | null;
  bookingStatus?: string;
  height?: number;
  expanded?: boolean;
  showControls?: boolean;
  onExpand?: () => void;
  onOpenExternalMap?: () => void;
}

const toLngLat = (point: LatLng): [number, number] => [point.longitude, point.latitude];

const isTerminalStatus = (status?: string) =>
  !!status && TERMINAL_BOOKING_STATUSES.includes(status as any);

const shouldRouteToDropoff = (status?: string) => status === BOOKING_STATUS.TRIP_STARTED;

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

const distanceToRouteMeters = (point: LatLng, route: LatLng[]) => {
  if (route.length === 0) return Infinity;
  return Math.min(...route.map((routePoint) => getDistanceMeters(point, routePoint)));
};

const getBounds = (points: LatLng[]): [number, number, number, number] => {
  const lngs = points.map((point) => point.longitude);
  const lats = points.map((point) => point.latitude);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
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

function PinMarker({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.pin, { backgroundColor: color }]}>
      <Text style={styles.pinText}>{label}</Text>
    </View>
  );
}

function DriverMarker({ heading }: { heading?: number | null }) {
  return (
    <View style={[styles.driverMarker, { transform: [{ rotate: `${heading ?? 0}deg` }] }]}>
      <Car size={18} color="white" />
    </View>
  );
}

export function RealtimeTripMap({
  pickup,
  dropoff,
  driverLocation,
  bookingStatus,
  height = 540,
  expanded = false,
  showControls = true,
  onExpand,
  onOpenExternalMap,
}: RealtimeTripMapProps) {
  const { colors } = useTheme();
  const nativeMap = getNativeMapLibre();
  const cameraRef = useRef<any>(null);
  const lastRouteOriginRef = useRef<LatLng | null>(null);
  const lastRouteAtRef = useRef(0);
  const [route, setRoute] = useState<DrivingRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [followDriver, setFollowDriver] = useState(false);

  const styleUrl = goongStyleUrl();
  const Camera = nativeMap?.Camera;
  const GeoJSONSource = nativeMap?.GeoJSONSource;
  const Layer = nativeMap?.Layer;
  const Map = nativeMap?.Map;
  const Marker = nativeMap?.Marker;
  const pickupPoint = useMemo(() => ({ latitude: pickup.latitude, longitude: pickup.longitude }), [pickup.latitude, pickup.longitude]);
  const dropoffPoint = useMemo(() => ({ latitude: dropoff.latitude, longitude: dropoff.longitude }), [dropoff.latitude, dropoff.longitude]);
  const driverPoint = useMemo(
    () =>
      typeof driverLocation?.latitude === 'number' && typeof driverLocation?.longitude === 'number'
        ? { latitude: driverLocation.latitude, longitude: driverLocation.longitude }
        : null,
    [driverLocation?.latitude, driverLocation?.longitude]
  );
  const hasActiveDriverRoute = !!driverPoint && !isTerminalStatus(bookingStatus);
  const routeOrigin = hasActiveDriverRoute ? driverPoint : pickupPoint;
  const routeDestination = hasActiveDriverRoute
    ? shouldRouteToDropoff(bookingStatus)
      ? dropoffPoint
      : pickupPoint
    : dropoffPoint;
  const distanceToPickup = driverPoint ? getDistanceMeters(driverPoint, pickupPoint) : null;
  const distanceToDropoff = driverPoint ? getDistanceMeters(driverPoint, dropoffPoint) : null;

  const routeGeoJSON = useMemo(() => routeFeature(route), [route]);

  const fitRoute = useCallback((animated = true) => {
    const fitPoints = route?.coordinates?.length
      ? route.coordinates
      : [pickupPoint, dropoffPoint, ...(driverPoint ? [driverPoint] : [])];
    if (fitPoints.length < 2) return;
    cameraRef.current?.fitBounds(getBounds(fitPoints), {
      padding: { top: 56, right: 42, bottom: expanded ? 96 : 64, left: 42 },
      duration: animated ? 650 : 0,
      easing: 'ease',
    });
  }, [route?.coordinates, pickupPoint, dropoffPoint, driverPoint, expanded]);

  const centerOnDriver = useCallback(() => {
    if (!driverPoint) {
      showInfo('Chưa có GPS tài xế', 'Hãy bật chia sẻ GPS realtime để bám theo vị trí tài xế.');
      return;
    }
    setFollowDriver(true);
    cameraRef.current?.flyTo({
      center: toLngLat(driverPoint),
      zoom: 16,
      pitch: 45,
      bearing: driverLocation?.heading ?? 0,
      duration: 650,
      easing: 'ease',
    });
  }, [driverPoint, driverLocation?.heading]);

  const loadRoute = useCallback(async (reason: 'initial' | 'manual' | 'deviation' | 'status' = 'initial') => {
    try {
      setRouteLoading(true);
      setRouteError(null);
      if (reason === 'deviation' && driverPoint) {
        showInfo('Bạn đang đi lệch lộ trình', 'Hệ thống đang tính lại đường đi bằng Goong.');
      }

      const nextRoute = await getDrivingRoute(routeOrigin, routeDestination);
      setRoute(nextRoute);
      lastRouteOriginRef.current = routeOrigin;
      lastRouteAtRef.current = Date.now();

      if (reason === 'manual' || reason === 'deviation') {
        showSuccess('Đã cập nhật lộ trình Goong');
      }
    } catch (error: any) {
      setRoute(null);
      setRouteError(error.message || 'Không thể tải lộ trình Goong. Vui lòng thử lại.');
      showError('Không thể tải lộ trình Goong', error.message);
    } finally {
      setRouteLoading(false);
    }
  }, [driverPoint, routeOrigin, routeDestination]);

  useEffect(() => {
    setRoute(null);
    loadRoute('status');
  }, [bookingStatus, loadRoute, routeOrigin, routeDestination]);

  useEffect(() => {
    if (route) fitRoute(false);
  }, [fitRoute, route]);

  useEffect(() => {
    if (!driverPoint || isTerminalStatus(bookingStatus)) return;
    if (followDriver) {
      cameraRef.current?.flyTo({
        center: toLngLat(driverPoint),
        zoom: 16,
        pitch: 45,
        bearing: driverLocation?.heading ?? 0,
        duration: 500,
        easing: 'linear',
      });
    }

    if (!route) {
      loadRoute('initial');
      return;
    }

    const lastOrigin = lastRouteOriginRef.current;
    const movedSinceRoute = lastOrigin ? getDistanceMeters(lastOrigin, driverPoint) : Infinity;
    const routeAge = Date.now() - lastRouteAtRef.current;
    const deviation = distanceToRouteMeters(driverPoint, route.coordinates);

    if (deviation > 90 || movedSinceRoute > 350 || routeAge > 60_000) {
      loadRoute(deviation > 90 ? 'deviation' : 'initial');
    }
  }, [
    bookingStatus,
    distanceToPickup,
    distanceToDropoff,
    driverLocation?.heading,
    driverPoint,
    followDriver,
    loadRoute,
    route,
  ]);

  return (
    <View style={{ borderRadius: borderRadius.lg, overflow: 'hidden', backgroundColor: colors.surfaceAlt }}>
      <View style={{ height, backgroundColor: colors.surfaceAlt }}>
        {nativeMap && Camera && GeoJSONSource && Layer && Map && Marker ? (
          <Map
            mapStyle={styleUrl ?? fallbackMapStyle}
            style={StyleSheet.absoluteFill}
            androidView="texture"
            compass
            attribution
            logo={false}
            dragPan
            touchZoom
            touchRotate
            touchPitch
            onPress={() => setFollowDriver(false)}
          >
            <Camera
              ref={cameraRef}
              initialViewState={{
                bounds: getBounds([pickupPoint, dropoffPoint]),
                padding: { top: 56, right: 42, bottom: 64, left: 42 },
                zoom: 13,
              }}
            />

            {route && (
              <GeoJSONSource id="route-source" data={routeGeoJSON as any}>
                <Layer
                  id="route-outline"
                  type="line"
                  style={{
                    lineColor: '#ffffff',
                    lineWidth: 10,
                    lineOpacity: 0.86,
                    lineJoin: 'round',
                    lineCap: 'round',
                  } as any}
                />
                <Layer
                  id="route-line"
                  type="line"
                  style={{
                    lineColor: colors.primary,
                    lineWidth: 6,
                    lineOpacity: 0.96,
                    lineJoin: 'round',
                    lineCap: 'round',
                  } as any}
                />
              </GeoJSONSource>
            )}

            <Marker id="pickup" lngLat={toLngLat(pickupPoint)} anchor="bottom">
              <PinMarker label="A" color={colors.primary} />
            </Marker>
            <Marker id="dropoff" lngLat={toLngLat(dropoffPoint)} anchor="bottom">
              <PinMarker label="B" color={colors.error} />
            </Marker>
            {driverPoint && (
              <Marker id="driver" lngLat={toLngLat(driverPoint)} anchor="center">
                <DriverMarker heading={driverLocation?.heading} />
              </Marker>
            )}
          </Map>
        ) : (
          <NativeMapUnavailable height={height} />
        )}

        <View style={styles.mapButtons}>
          <TouchableOpacity
            onPress={() => fitRoute(true)}
            activeOpacity={0.82}
            style={[styles.floatingButton, { backgroundColor: colors.surface }]}
          >
            <Crosshair size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={centerOnDriver}
            activeOpacity={0.82}
            style={[styles.floatingButton, { backgroundColor: followDriver ? colors.primary : colors.surface }]}
          >
            <LocateFixed size={18} color={followDriver ? 'white' : colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ padding: spacing.md, gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
          <MapPin size={16} color={colors.primary} />
          <Text numberOfLines={1} style={{ color: colors.text, flex: 1, fontSize: fontSize.sm }}>
            Đón: {pickup.label}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
          <Navigation size={16} color={colors.error} />
          <Text numberOfLines={1} style={{ color: colors.text, flex: 1, fontSize: fontSize.sm }}>
            Đến: {dropoff.label}
          </Text>
        </View>
        <Text style={{ color: routeError ? colors.warning : colors.textSecondary, fontSize: fontSize.sm }}>
          {routeError ||
            (driverPoint
              ? `Cách điểm đón ${Math.round(distanceToPickup ?? 0)}m, cách điểm đến ${Math.round(distanceToDropoff ?? 0)}m.`
              : 'Đang chờ tài xế bật chia sẻ GPS realtime.')}
        </Text>
        {route && (
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
            Lộ trình Goong: {(route.distanceMeters / 1000).toFixed(1)} km{route.duration ? ` - ${route.duration}` : ''}
          </Text>
        )}
        {!styleUrl && (
          <Text style={{ color: colors.warning, fontSize: fontSize.sm }}>
            Chưa cấu hình EXPO_PUBLIC_GOONG_MAP_KEY nên chưa tải được nền Goong.
          </Text>
        )}

        {showControls && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }}>
            {!!onExpand && (
              <Button
                label={expanded ? 'Thu gọn' : 'Mở rộng'}
                onPress={onExpand}
                size="sm"
                variant="outline"
                icon={<Expand size={16} color={colors.primary} />}
                style={{ flexGrow: 1 }}
              />
            )}
            <Button
              label={routeLoading ? 'Đang tải...' : 'Tải lộ trình Goong'}
              onPress={() => loadRoute('manual')}
              size="sm"
              loading={routeLoading}
              icon={<Route size={16} color="white" />}
              style={{ flexGrow: 1 }}
            />
            {!!onOpenExternalMap && (
              <Button
                label="Mở app bản đồ"
                onPress={onOpenExternalMap}
                size="sm"
                variant="secondary"
                icon={<Car size={16} color={colors.text} />}
                style={{ flexGrow: 1 }}
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
    ...shadows.md,
  },
  pinText: {
    color: 'white',
    fontWeight: '900',
    fontSize: fontSize.sm,
  },
  driverMarker: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
    backgroundColor: '#10b981',
    ...shadows.lg,
  },
  mapButtons: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    gap: spacing.sm,
  },
  floatingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
});
