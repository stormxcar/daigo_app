import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { ExternalLink, LocateFixed, MapPin, Navigation } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
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
      html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #eef2f7; }
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
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const pickup = [${pickup.lat}, ${pickup.lng}];
      const dropoff = [${dropoff.lat}, ${dropoff.lng}];
      const map = L.map('map', { zoomControl: true });
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

export function MapPreview({ pickup, dropoff, height = 280, followUser = false }: MapPreviewProps) {
  const { colors } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | undefined>();
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const html = useMemo(() => createMapHtml(pickup, dropoff, userLocation), [pickup, dropoff, userLocation]);
  const navigationUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${pickup.lat}%2C${pickup.lng}%3B${dropoff.lat}%2C${dropoff.lng}`;

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

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setUserLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error: any) {
      Alert.alert('Không thể lấy vị trí', error.message || 'Vui lòng kiểm tra GPS và thử lại.');
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    if (followUser) {
      requestLocation();
    }
  }, [followUser]);

  return (
    <View style={{ borderRadius: borderRadius.lg, overflow: 'hidden', backgroundColor: colors.surfaceAlt }}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        mixedContentMode="always"
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'route') {
              setRouteInfo({ distance: data.distance, duration: data.duration });
            }
          } catch {
            undefined;
          }
        }}
        style={{ width: '100%', height, backgroundColor: colors.surfaceAlt }}
      />

      <View style={{ padding: spacing.md, gap: spacing.sm }}>
        {[
          { label: 'Đón', value: pickup.label, color: colors.primary },
          { label: 'Đến', value: dropoff.label, color: colors.error },
        ].map((item) => (
          <View key={item.label} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <MapPin size={16} color={item.color} />
            <Text numberOfLines={1} style={{ color: colors.text, flex: 1, fontSize: fontSize.sm }}>
              {item.label}: {item.value}
            </Text>
          </View>
        ))}

        {routeInfo && (
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
            Lộ trình OSRM: {(routeInfo.distance / 1000).toFixed(1)} km - {Math.ceil(routeInfo.duration / 60)} phút
          </Text>
        )}

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            onPress={requestLocation}
            disabled={locating}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              paddingVertical: spacing.sm,
              borderRadius: borderRadius.md,
              backgroundColor: colors.surface,
            }}
          >
            <LocateFixed size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: fontSize.sm }}>
              {locating ? 'Đang lấy GPS...' : 'Bật GPS'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL(navigationUrl)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              paddingVertical: spacing.sm,
              borderRadius: borderRadius.md,
              backgroundColor: colors.primary,
            }}
          >
            <Navigation size={16} color="white" />
            <Text style={{ color: 'white', fontWeight: '700', fontSize: fontSize.sm }}>
              Điều hướng
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
