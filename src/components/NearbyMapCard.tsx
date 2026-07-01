import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, InteractionManager, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Car, Crosshair, MapPinned, Navigation } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { fontForWeight, borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Button } from '@/components/BaseComponents';
import { NativeMapUnavailable, getNativeMapLibre } from '@/components/NativeMapLibre';
import { DeviceLocation } from '@/services/deviceLocation';
import { getDistanceMeters } from '@/services/driverLocation';
import { DrivingRoute, LatLng, getDrivingRoute } from '@/services/mapRouteService';
import { apiClient } from '@/services/api';
import { DriverStatus, Vehicle } from '@/types';

type DriverPoint = {
  latitude: number;
  longitude: number;
  updatedAt?: string;
};

type NearbyVehicle = Vehicle & {
  driverPoint: DriverPoint;
  straightDistanceMeters?: number;
};

type NearbyDriverMapCardProps = {
  vehicles: Vehicle[];
  currentLocation?: DeviceLocation | null;
  onPress?: (vehicle?: Vehicle) => void;
};

const toLngLat = (point: LatLng): [number, number] => [point.longitude, point.latitude];

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

function DriverMarker() {
  return (
    <View style={styles.driverMarker}>
      <Car size={17} color="white" />
    </View>
  );
}

function formatDistance(meters?: number | null) {
  if (typeof meters !== 'number' || !Number.isFinite(meters)) return 'Chưa rõ';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function NearbyDriverMapCard({ vehicles, currentLocation, onPress }: NearbyDriverMapCardProps) {
  const { colors } = useTheme();
  const [mapReady, setMapReady] = useState(false);
  const nativeMap = mapReady ? getNativeMapLibre() : null;
  const cameraRef = useRef<any>(null);
  const [driverStatuses, setDriverStatuses] = useState<DriverStatus[]>([]);
  const [route, setRoute] = useState<DrivingRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const customerPoint = useMemo(
    () =>
      currentLocation
        ? {
            latitude: currentLocation.lat,
            longitude: currentLocation.lng,
          }
        : null,
    [currentLocation]
  );

  const onlineVehicles = useMemo<NearbyVehicle[]>(() => {
    if (!customerPoint) return [];
    const statusByDriverId = new Map(driverStatuses.map((status) => [status.profileId, status]));
    const mapped: Array<NearbyVehicle | null> = vehicles.map((vehicle) => {
        const status = vehicle.driverId ? statusByDriverId.get(vehicle.driverId) : undefined;
        const latitude = status?.currentLatitude;
        const longitude = status?.currentLongitude;
        if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
        const driverPoint = {
          latitude,
          longitude,
          updatedAt: status?.updatedLocationAt,
        };
        return {
          ...vehicle,
          driverPoint,
          straightDistanceMeters: getDistanceMeters(driverPoint, customerPoint),
        };
      });
    return mapped
      .filter((vehicle): vehicle is NearbyVehicle => vehicle !== null)
      .sort((a, b) => (a.straightDistanceMeters ?? Infinity) - (b.straightDistanceMeters ?? Infinity));
  }, [customerPoint, driverStatuses, vehicles]);

  const nearestVehicle = onlineVehicles[0];
  const driverPoint = nearestVehicle?.driverPoint ?? null;
  const routeGeoJSON = useMemo(() => routeFeature(route), [route]);
  const mapPoints = useMemo(() => {
    const points = [customerPoint, driverPoint].filter(Boolean) as LatLng[];
    return route?.coordinates?.length ? route.coordinates : points;
  }, [customerPoint, driverPoint, route?.coordinates]);
  const styleUrl = goongStyleUrl();
  const Camera = nativeMap?.Camera;
  const GeoJSONSource = nativeMap?.GeoJSONSource;
  const Layer = nativeMap?.Layer;
  const MapView = nativeMap?.Map;
  const Marker = nativeMap?.Marker;

  useEffect(() => {
    let active = true;
    const task = InteractionManager.runAfterInteractions(() => {
      if (active) setMapReady(true);
    });
    const subscription = AppState.addEventListener('change', (state) => {
      setMapReady(state === 'active');
    });

    return () => {
      active = false;
      task.cancel();
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let active = true;
    apiClient
      .getOnlineDriverStatuses()
      .then((items) => {
        if (active) setDriverStatuses(items);
      })
      .catch(() => {
        if (active) setDriverStatuses([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const fitMap = useCallback((animated = true) => {
    if (!cameraRef.current || mapPoints.length < 2) return;
    cameraRef.current.fitBounds(getBounds(mapPoints), {
      padding: { top: 48, right: 42, bottom: 64, left: 42 },
      duration: animated ? 650 : 0,
      easing: 'ease',
    });
  }, [mapPoints]);

  useEffect(() => {
    if (!customerPoint || !driverPoint) {
      setRoute(null);
      setRouteError(null);
      return;
    }

    let active = true;
    setRouteLoading(true);
    getDrivingRoute(driverPoint, customerPoint)
      .then((nextRoute) => {
        if (!active) return;
        setRoute(nextRoute);
        setRouteError(null);
      })
      .catch((error: any) => {
        if (!active) return;
        setRoute(null);
        setRouteError(error?.message ?? 'Không thể tải lộ trình tài xế gần nhất.');
      })
      .finally(() => {
        if (active) setRouteLoading(false);
      });

    return () => {
      active = false;
    };
  }, [customerPoint, driverPoint]);

  useEffect(() => {
    if (mapPoints.length >= 2) fitMap(false);
  }, [fitMap, mapPoints.length]);

  const title = nearestVehicle ? 'Tài xế gần bạn' : 'Xe gần bạn';
  const subtitle = currentLocation?.label ?? 'Bật GPS để tìm tài xế gần nhất';
  const distanceLabel = route?.distanceMeters
    ? formatDistance(route.distanceMeters)
    : formatDistance(nearestVehicle?.straightDistanceMeters);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress?.(nearestVehicle)}
      style={{ marginBottom: spacing.xl }}
    >
      <View style={[styles.container, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fontSize.base, ...fontForWeight('900'), color: colors.text }}>
              {title}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs }}>
              {subtitle}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: nearestVehicle ? colors.primary : colors.textTertiary }]}>
            <Text style={styles.badgeText}>{nearestVehicle ? distanceLabel : 'GPS'}</Text>
          </View>
        </View>

        <View style={styles.mapWrap}>
          {customerPoint && driverPoint && nativeMap && Camera && GeoJSONSource && Layer && MapView && Marker ? (
            <MapView
              mapStyle={styleUrl ?? fallbackMapStyle}
              style={StyleSheet.absoluteFill}
              androidView="texture"
              compass={false}
              attribution={false}
              logo={false}
              dragPan
              touchZoom
              touchRotate
              touchPitch
            >
              <Camera
                ref={cameraRef}
                initialViewState={{
                  bounds: getBounds([customerPoint, driverPoint]),
                  padding: { top: 48, right: 42, bottom: 64, left: 42 },
                  zoom: 13,
                }}
              />
              {route && (
                <GeoJSONSource id="nearby-route-source" data={routeGeoJSON as any}>
                  <Layer
                    id="nearby-route-outline"
                    type="line"
                    style={{
                      lineColor: '#ffffff',
                      lineWidth: 9,
                      lineOpacity: 0.86,
                      lineJoin: 'round',
                      lineCap: 'round',
                    } as any}
                  />
                  <Layer
                    id="nearby-route-line"
                    type="line"
                    style={{
                      lineColor: colors.primary,
                      lineWidth: 5,
                      lineOpacity: 0.95,
                      lineJoin: 'round',
                      lineCap: 'round',
                    } as any}
                  />
                </GeoJSONSource>
              )}
              <Marker id="nearby-customer" lngLat={toLngLat(customerPoint)} anchor="bottom">
                <PinMarker label="Bạn" color={colors.primary} />
              </Marker>
              <Marker id="nearby-driver" lngLat={toLngLat(driverPoint)} anchor="center">
                <DriverMarker />
              </Marker>
            </MapView>
          ) : customerPoint && driverPoint && mapReady ? (
            <NativeMapUnavailable height={180} />
          ) : customerPoint && driverPoint ? (
            <View style={[styles.emptyMap, { backgroundColor: colors.surface }]}>
              <MapPinned size={30} color={colors.primary} />
              <Text style={{ color: colors.text, ...fontForWeight('900'), marginTop: spacing.sm }}>
                Đang chuẩn bị bản đồ
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.xs, lineHeight: 19 }}>
                Bản đồ sẽ được tải sau khi màn hình ổn định để giảm tải bộ nhớ.
              </Text>
            </View>
          ) : (
            <View style={[styles.emptyMap, { backgroundColor: colors.surface }]}>
              <MapPinned size={30} color={colors.primary} />
              <Text style={{ color: colors.text, ...fontForWeight('900'), marginTop: spacing.sm }}>
                Chưa có GPS tài xế online
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.xs, lineHeight: 19 }}>
                Khi tài xế bật nhận chuyến và chia sẻ vị trí, bản đồ gần bạn sẽ hiển thị tại đây.
              </Text>
            </View>
          )}

          {customerPoint && driverPoint && (
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => fitMap()}
              style={[styles.centerBtn, { backgroundColor: colors.surface }]}
            >
              <Crosshair size={17} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: colors.text, fontSize: fontSize.sm, ...fontForWeight('900')}}>
              {nearestVehicle ? nearestVehicle.name : 'Chưa tìm thấy xe online'}
            </Text>
            <Text numberOfLines={2} style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.xs, lineHeight: 18 }}>
              {nearestVehicle
                ? `${nearestVehicle.driverName ?? 'Tài xế'} • ${nearestVehicle.pricePerKm.toLocaleString('vi-VN')}đ/km${route?.duration ? ` • ${route.duration}` : ''}`
                : 'Bạn vẫn có thể vào đặt xe để xem toàn bộ xe đang sẵn sàng.'}
            </Text>
            {!!routeError && (
              <Text numberOfLines={1} style={{ color: colors.warning, fontSize: fontSize.xs, marginTop: spacing.xs }}>
                Đang dùng khoảng cách thẳng do Goong route chưa tải được.
              </Text>
            )}
          </View>
          <Button
            label={routeLoading ? 'Đang tính' : 'Đặt xe'}
            size="sm"
            onPress={() => onPress?.(nearestVehicle)}
            icon={<Navigation size={15} color="white" />}
            disabled={routeLoading}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const NearbyMapCard = NearbyDriverMapCard;

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  badge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    color: 'white',
    fontSize: fontSize.xs,
    ...fontForWeight('900'),
  },
  mapWrap: {
    height: 180,
    overflow: 'hidden',
    backgroundColor: '#dbeafe',
  },
  emptyMap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  centerBtn: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pin: {
    minWidth: 34,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderWidth: 2,
    borderColor: 'white',
  },
  pinText: {
    color: 'white',
    fontSize: 10,
    ...fontForWeight('900'),
  },
  driverMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    borderWidth: 2,
    borderColor: 'white',
  },
});
