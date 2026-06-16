import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Crosshair, Expand, LocateFixed, MapPin, Minimize } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, shadows, spacing } from '@/theme/tokens';
import { DrivingRoute, getDrivingRoute, LatLng } from '@/services/mapRouteService';
import { getNativeMapLibre, NativeMapUnavailable } from '@/components/NativeMapLibre';
import { showError, showSuccess } from '@/utils/toast';

interface MapPoint {
  label: string;
  lat: number;
  lng: number;
}

interface MapPreviewProps {
  pickup: MapPoint;
  dropoff: MapPoint;
  height?: number;
  followUser?: boolean;
  showControls?: boolean;
  selectable?: boolean;
  onPickupChange?: (point: MapPoint) => void;
  onDropoffChange?: (point: MapPoint) => void;
}

type SelectMode = 'pickup' | 'dropoff';

const toLatLng = (point: MapPoint): LatLng => ({ latitude: point.lat, longitude: point.lng });
const toLngLat = (point: LatLng): [number, number] => [point.longitude, point.latitude];

const goongStyleUrl = () => {
  const mapKey = process.env.EXPO_PUBLIC_GOONG_MAP_KEY;
  if (!mapKey) return null;
  return `https://tiles.goong.io/assets/goong_map_web.json?api_key=${encodeURIComponent(mapKey)}`;
};

const fallbackMapStyle = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#eef2f7' } }],
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

async function reverseGoongLocation(point: LatLng) {
  const apiKey = process.env.EXPO_PUBLIC_GOONG_API_KEY;
  if (!apiKey) return 'Vị trí đã chọn';

  const params = new URLSearchParams({
    latlng: `${point.latitude},${point.longitude}`,
    api_key: apiKey,
  });

  const response = await fetch(`https://rsapi.goong.io/Geocode?${params.toString()}`);
  if (!response.ok) return 'Vị trí đã chọn';
  const data = await response.json();
  return data.results?.[0]?.formatted_address || 'Vị trí đã chọn';
}

function PinMarker({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.pin, { backgroundColor: color }]}>
      <Text style={styles.pinText}>{label}</Text>
    </View>
  );
}

export function MapPreview({
  pickup,
  dropoff,
  height = 340,
  followUser = false,
  showControls = true,
  selectable = false,
  onPickupChange,
  onDropoffChange,
}: MapPreviewProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const nativeMap = getNativeMapLibre();
  const compactCameraRef = useRef<any>(null);
  const fullscreenCameraRef = useRef<any>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<DrivingRoute | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [selectMode, setSelectMode] = useState<SelectMode>('pickup');

  const styleUrl = goongStyleUrl();
  const Camera = nativeMap?.Camera;
  const GeoJSONSource = nativeMap?.GeoJSONSource;
  const Layer = nativeMap?.Layer;
  const Map = nativeMap?.Map;
  const Marker = nativeMap?.Marker;
  const pickupPoint = toLatLng(pickup);
  const dropoffPoint = toLatLng(dropoff);
  const routeGeoJSON = useMemo(() => routeFeature(route), [route?.encodedPolyline]);
  const fitPoints = route?.coordinates?.length
    ? route.coordinates
    : [pickupPoint, dropoffPoint, ...(userLocation ? [userLocation] : [])];

  const fitMap = useCallback((camera: any, animated = true) => {
    if (!camera || fitPoints.length < 2) return;
    camera.fitBounds(getBounds(fitPoints), {
      padding: { top: 48, right: 42, bottom: 58, left: 42 },
      duration: animated ? 650 : 0,
      easing: 'ease',
    });
  }, [route?.encodedPolyline, pickup.lat, pickup.lng, dropoff.lat, dropoff.lng, userLocation?.latitude, userLocation?.longitude]);

  const requestLocation = async () => {
    try {
      setLocating(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        showError('Chưa bật GPS', 'Vui lòng cấp quyền vị trí.');
        return;
      }
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        showError('GPS đang tắt', 'Vui lòng bật dịch vụ vị trí.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const point = { latitude: location.coords.latitude, longitude: location.coords.longitude };
      setUserLocation(point);
      compactCameraRef.current?.flyTo({ center: toLngLat(point), zoom: 15, duration: 650, easing: 'ease' });
      fullscreenCameraRef.current?.flyTo({ center: toLngLat(point), zoom: 15, duration: 650, easing: 'ease' });
    } catch (error: any) {
      showError('Không thể lấy vị trí', error.message || 'Vui lòng kiểm tra GPS và thử lại.');
    } finally {
      setLocating(false);
    }
  };

  const handleMapPress = async (event: any) => {
    if (!selectable) return;
    const [longitude, latitude] = event.nativeEvent.lngLat as [number, number];
    const point = { latitude, longitude };
    const label = await reverseGoongLocation(point).catch(() => 'Vị trí đã chọn');
    const nextPoint = { label, lat: latitude, lng: longitude };

    if (selectMode === 'pickup') onPickupChange?.(nextPoint);
    if (selectMode === 'dropoff') onDropoffChange?.(nextPoint);

    showSuccess(selectMode === 'pickup' ? 'Đã chọn điểm đón' : 'Đã chọn điểm đến', label);
  };

  useEffect(() => {
    getDrivingRoute(pickupPoint, dropoffPoint)
      .then((nextRoute) => {
        setRoute(nextRoute);
        setRouteError(null);
      })
      .catch((error) => {
        setRoute(null);
        setRouteError(error.message || 'Không thể tải lộ trình Goong.');
      });
  }, [pickup.lat, pickup.lng, dropoff.lat, dropoff.lng]);

  useEffect(() => {
    if (route) {
      fitMap(compactCameraRef.current, false);
      fitMap(fullscreenCameraRef.current, false);
    }
  }, [route?.encodedPolyline]);

  useEffect(() => {
    if (followUser) requestLocation();
  }, [followUser]);

  const mapView = (cameraRef: React.RefObject<any>, mapHeight: number | string) => (
    <View style={{ height: mapHeight as number, backgroundColor: colors.surfaceAlt }}>
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
          onPress={handleMapPress}
        >
          <Camera
            ref={cameraRef}
            initialViewState={{
              bounds: getBounds([pickupPoint, dropoffPoint]),
              padding: { top: 48, right: 42, bottom: 58, left: 42 },
              zoom: 13,
            }}
          />
          {route && (
            <GeoJSONSource id="preview-route-source" data={routeGeoJSON as any}>
              <Layer
                id="preview-route-outline"
                type="line"
                style={{
                  lineColor: '#ffffff',
                  lineWidth: 10,
                  lineOpacity: 0.82,
                  lineJoin: 'round',
                  lineCap: 'round',
                } as any}
              />
              <Layer
                id="preview-route-line"
                type="line"
                style={{
                  lineColor: colors.primary,
                  lineWidth: 6,
                  lineOpacity: 0.95,
                  lineJoin: 'round',
                  lineCap: 'round',
                } as any}
              />
            </GeoJSONSource>
          )}
          <Marker id="preview-pickup" lngLat={toLngLat(pickupPoint)} anchor="bottom">
            <PinMarker label="A" color={colors.primary} />
          </Marker>
          <Marker id="preview-dropoff" lngLat={toLngLat(dropoffPoint)} anchor="bottom">
            <PinMarker label="B" color={colors.error} />
          </Marker>
          {userLocation && (
            <Marker id="preview-user" lngLat={toLngLat(userLocation)} anchor="center">
              <View style={[styles.userDot, { borderColor: colors.surface }]} />
            </Marker>
          )}
        </Map>
      ) : (
        <NativeMapUnavailable height={mapHeight} />
      )}

      <TouchableOpacity
        onPress={() => fitMap(cameraRef.current)}
        activeOpacity={0.82}
        style={[styles.centerBtn, { backgroundColor: colors.surface }]}
      >
        <Crosshair size={18} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.surfaceAlt }]}>
        <View style={{ position: 'relative' }}>
          {mapView(compactCameraRef, height)}
          <TouchableOpacity
            onPress={() => setFullscreen(true)}
            activeOpacity={0.85}
            style={[styles.expandBtn, { backgroundColor: colors.primary }]}
          >
            <Expand size={16} color="white" />
          </TouchableOpacity>
        </View>

        <View style={[styles.infoBar, { backgroundColor: colors.surface }]}>
          {selectable && (
            <View style={styles.modeRow}>
              {[
                { label: 'Chọn điểm đón', value: 'pickup' as SelectMode },
                { label: 'Chọn điểm đến', value: 'dropoff' as SelectMode },
              ].map((item) => (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => setSelectMode(item.value)}
                  style={[
                    styles.modeBtn,
                    { backgroundColor: selectMode === item.value ? colors.primary : colors.surfaceAlt },
                  ]}
                >
                  <Text style={{ color: selectMode === item.value ? 'white' : colors.text, fontWeight: '700', fontSize: fontSize.xs }}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.locationRow}>
            {[
              { label: 'Đón', value: pickup.label, color: colors.primary },
              { label: 'Đến', value: dropoff.label, color: colors.error },
            ].map((item) => (
              <View key={item.label} style={styles.locationItem}>
                <MapPin size={14} color={item.color} />
                <Text numberOfLines={1} style={[styles.locationText, { color: colors.text }]}>
                  <Text style={{ color: item.color, fontWeight: '700' }}>{item.label}: </Text>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          {route && (
            <View style={[styles.routeChip, { backgroundColor: colors.primary }]}>
              <Text style={styles.routeText}>
                {(route.distanceMeters / 1000).toFixed(1)} km{route.duration ? ` · ${route.duration}` : ''}
              </Text>
            </View>
          )}
          {routeError && <Text style={{ color: colors.warning, fontSize: fontSize.xs }}>{routeError}</Text>}
          {!styleUrl && (
            <Text style={{ color: colors.warning, fontSize: fontSize.xs }}>Thiếu EXPO_PUBLIC_GOONG_MAP_KEY nên chưa tải được nền Goong.</Text>
          )}

          {showControls && (
            <TouchableOpacity
              onPress={requestLocation}
              disabled={locating}
              style={[styles.gpsBtn, { backgroundColor: locating ? colors.surfaceAlt : colors.primary }]}
              activeOpacity={0.85}
            >
              <LocateFixed size={15} color="white" />
              <Text style={styles.gpsBtnText}>{locating ? 'Đang lấy GPS...' : 'Vị trí của tôi'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal
        visible={fullscreen}
        animationType="slide"
        statusBarTranslucent
        presentationStyle="fullScreen"
        onRequestClose={() => setFullscreen(false)}
      >
        <View style={[styles.fullscreenContainer, { paddingTop: insets.top, backgroundColor: colors.background }]}>
          <View style={[styles.fullscreenHeader, { backgroundColor: colors.primary }]}>
            <View style={styles.locationRow}>
              <Text numberOfLines={1} style={{ color: 'white', fontWeight: '800' }}>Bản đồ Goong</Text>
              {route && (
                <Text style={styles.fullscreenRouteText}>
                  {(route.distanceMeters / 1000).toFixed(1)} km{route.duration ? ` · ${route.duration}` : ''}
                </Text>
              )}
            </View>
          </View>

          <View style={{ flex: 1 }}>
            {mapView(fullscreenCameraRef, '100%')}
            <View style={styles.overlayButtons}>
              {showControls && (
                <TouchableOpacity
                  onPress={requestLocation}
                  disabled={locating}
                  activeOpacity={0.85}
                  style={[styles.overlayBtn, { backgroundColor: colors.primary }]}
                >
                  <LocateFixed size={18} color="white" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setFullscreen(false)}
                activeOpacity={0.85}
                style={[styles.overlayBtn, { backgroundColor: '#ef4444' }]}
              >
                <Minimize size={18} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
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
  userDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    backgroundColor: '#2563eb',
  },
  expandBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
    zIndex: 10,
  },
  centerBtn: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  infoBar: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  locationRow: {
    gap: spacing.xs,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationText: {
    fontSize: fontSize.sm,
    flex: 1,
  },
  routeChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  routeText: {
    color: 'white',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  gpsBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: fontSize.sm,
  },
  fullscreenContainer: {
    flex: 1,
  },
  fullscreenHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  fullscreenRouteText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  overlayButtons: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    gap: spacing.sm,
  },
  overlayBtn: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
