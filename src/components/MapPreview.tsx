import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { Expand, LocateFixed, MapPin, Minimize, X } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';

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
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const createMapHtml = (pickup: MapPoint, dropoff: MapPoint, userLocation?: { lat: number; lng: number }) => {
  const userMarker = userLocation
    ? `
      const userMarker = L.circleMarker([${userLocation.lat}, ${userLocation.lng}], {
        radius: 8,
        color: '#2563eb',
        weight: 3,
        fillColor: '#60a5fa',
        fillOpacity: 0.95
      }).addTo(map).bindPopup('Vị trí hiện tại');
    `
    : '';

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
      html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #eef2f7; touch-action: pan-x pan-y; }
      .leaflet-control-attribution { font-size: 10px; }
      .pin {
        width: 30px;
        height: 30px;
        border-radius: 18px 18px 18px 4px;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 6px 14px rgba(15, 23, 42, 0.25);
      }
      .pin span {
        display: block;
        transform: rotate(45deg);
        color: white;
        font: 800 12px system-ui;
        text-align: center;
        line-height: 24px;
      }
      .pickup { background: #2563eb; }
      .dropoff { background: #ef4444; }
      .leaflet-control-zoom { border: none !important; }
      .leaflet-control-zoom a {
        width: 36px !important; height: 36px !important;
        line-height: 36px !important;
        border-radius: 8px !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
        margin-bottom: 4px !important;
        font-size: 18px !important;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const pickup = [${pickup.lat}, ${pickup.lng}];
      const dropoff = [${dropoff.lat}, ${dropoff.lng}];
      const map = L.map('map', { zoomControl: true, gestureHandling: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      const pickupIcon = L.divIcon({ className: '', html: '<div class="pin pickup"><span>A</span></div>', iconSize: [34, 34], iconAnchor: [17, 30] });
      const dropoffIcon = L.divIcon({ className: '', html: '<div class="pin dropoff"><span>B</span></div>', iconSize: [34, 34], iconAnchor: [17, 30] });
      L.marker(pickup, { icon: pickupIcon }).addTo(map).bindPopup('${escapeHtml(pickup.label)}');
      L.marker(dropoff, { icon: dropoffIcon }).addTo(map).bindPopup('${escapeHtml(dropoff.label)}');
      ${userMarker}

      const bounds = L.latLngBounds([pickup, dropoff${userLocation ? `, [${userLocation.lat}, ${userLocation.lng}]` : ''}]);
      map.fitBounds(bounds, { padding: [36, 36] });

      fetch('https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson')
        .then((response) => response.json())
        .then((data) => {
          const route = data.routes && data.routes[0];
          if (!route) {
            L.polyline([pickup, dropoff], { color: '#2563eb', weight: 5, opacity: 0.75, dashArray: '8 8' }).addTo(map);
            return;
          }
          const coordinates = route.geometry.coordinates.map((item) => [item[1], item[0]]);
          L.polyline(coordinates, { color: '#2563eb', weight: 6, opacity: 0.86 }).addTo(map);
          map.fitBounds(L.latLngBounds(coordinates), { padding: [34, 34] });
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'route',
            distance: route.distance,
            duration: route.duration
          }));
        })
        .catch(() => {
          L.polyline([pickup, dropoff], { color: '#2563eb', weight: 5, opacity: 0.75, dashArray: '8 8' }).addTo(map);
        });
    </script>
  </body>
</html>`;
};

export function MapPreview({ pickup, dropoff, height = 340, followUser = false, showControls = true }: MapPreviewProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView | null>(null);
  const fullscreenWebViewRef = useRef<WebView | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | undefined>();
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const html = useMemo(() => createMapHtml(pickup, dropoff, userLocation), [pickup, dropoff, userLocation]);

  const requestLocation = async () => {
    try {
      setLocating(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Chưa bật GPS', 'Vui lòng cấp quyền vị trí để hiển thị vị trí hiện tại trên bản đồ.');
        return;
      }
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert('GPS đang tắt', 'Vui lòng bật dịch vụ vị trí trên điện thoại rồi thử lại.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setUserLocation({ lat: location.coords.latitude, lng: location.coords.longitude });
    } catch (error: any) {
      Alert.alert('Không thể lấy vị trí', error.message || 'Vui lòng kiểm tra GPS và thử lại.');
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    if (followUser) requestLocation();
  }, [followUser]);

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'route') setRouteInfo({ distance: data.distance, duration: data.duration });
    } catch {
      undefined;
    }
  };

  const mapWebView = (ref: React.RefObject<WebView | null>, mapHeight: number | string) => (
    <WebView
      ref={ref}
      originWhitelist={['*']}
      source={{ html }}
      javaScriptEnabled
      domStorageEnabled
      geolocationEnabled
      nestedScrollEnabled
      scrollEnabled
      mixedContentMode="always"
      onMessage={onMessage}
      style={{ width: '100%', height: mapHeight as number, backgroundColor: colors.surfaceAlt }}
    />
  );

  return (
    <>
      {/* ─── Compact map card ─── */}
      <View style={[styles.container, { backgroundColor: colors.surfaceAlt }]}>
        <View style={{ position: 'relative' }}>
          {mapWebView(webViewRef, height)}

          {/* Expand button — overlay on map top-right */}
          <TouchableOpacity
            onPress={() => setFullscreen(true)}
            activeOpacity={0.85}
            style={[styles.expandBtn, { backgroundColor: colors.primary }]}
          >
            <Expand size={16} color="white" />
          </TouchableOpacity>
        </View>

        {/* Info bar */}
        <View style={[styles.infoBar, { backgroundColor: colors.surface }]}>
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

          {routeInfo && (
            <View style={[styles.routeChip, { backgroundColor: colors.primary }]}>
              <Text style={styles.routeText}>
                {(routeInfo.distance / 1000).toFixed(1)} km · {Math.ceil(routeInfo.duration / 60)} phút
              </Text>
            </View>
          )}

          {showControls && (
            <TouchableOpacity
              onPress={requestLocation}
              disabled={locating}
              style={[styles.gpsBtn, { backgroundColor: locating ? colors.surfaceAlt : colors.primary }]}
              activeOpacity={0.85}
            >
              <LocateFixed size={15} color="white" />
              <Text style={styles.gpsBtnText}>
                {locating ? 'Đang lấy GPS...' : 'Vị trí của tôi'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ─── Fullscreen Modal ─── */}
      <Modal
        visible={fullscreen}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setFullscreen(false)}
      >
        <View style={[styles.fullscreenContainer, { paddingTop: insets.top, backgroundColor: '#0f172a' }]}>
          {/* Fullscreen header */}
          <View style={[styles.fullscreenHeader, { backgroundColor: colors.primary }]}>
            <View style={styles.locationRow}>
              {[
                { label: 'Đón', value: pickup.label, color: '#93c5fd' },
                { label: 'Đến', value: dropoff.label, color: '#fca5a5' },
              ].map((item) => (
                <View key={item.label} style={styles.locationItem}>
                  <MapPin size={13} color={item.color} />
                  <Text numberOfLines={1} style={[styles.locationText, { color: 'white', flex: 1 }]}>
                    <Text style={{ color: item.color, fontWeight: '700' }}>{item.label}: </Text>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>

            {routeInfo && (
              <Text style={styles.fullscreenRouteText}>
                {(routeInfo.distance / 1000).toFixed(1)} km · {Math.ceil(routeInfo.duration / 60)} phút
              </Text>
            )}
          </View>

          {/* Full map */}
          <View style={{ flex: 1 }}>
            {mapWebView(fullscreenWebViewRef, '100%')}

            {/* Minimize + GPS buttons overlay */}
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
  expandBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  infoBar: {
    padding: spacing.md,
    gap: spacing.sm,
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
    gap: spacing.xs,
  },
  fullscreenRouteText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: spacing.xs,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
