import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { MapPin, Navigation } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { DriverLocation } from '@/types';
import { getDistanceMeters } from '@/services/driverLocation';

interface MapPoint {
  label: string;
  latitude: number;
  longitude: number;
}

interface RealtimeTripMapProps {
  pickup: MapPoint;
  dropoff: MapPoint;
  driverLocation?: DriverLocation | null;
  height?: number;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const createMapHtml = (pickup: MapPoint, dropoff: MapPoint, driverLocation?: DriverLocation | null) => {
  const driverMarker = driverLocation
    ? `
      const driverEl = document.createElement('div');
      driverEl.className = 'driver-marker';
      driverEl.innerHTML = '<span>TX</span>';
      new maplibregl.Marker({ element: driverEl })
        .setLngLat([${driverLocation.longitude}, ${driverLocation.latitude}])
        .setPopup(new maplibregl.Popup({ offset: 18 }).setText('Tài xế đang di chuyển'))
        .addTo(map);
    `
    : '';
  const coordinates = [
    ...(driverLocation ? [[driverLocation.longitude, driverLocation.latitude]] : []),
    [pickup.longitude, pickup.latitude],
    [dropoff.longitude, dropoff.latitude],
  ];

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
    <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
    <style>
      html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #eef2f7; touch-action: none; }
      .maplibregl-ctrl-attrib { font-size: 10px; }
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
      .driver-marker {
        width: 38px;
        height: 38px;
        border-radius: 19px;
        display: grid;
        place-items: center;
        background: #16a34a;
        border: 3px solid white;
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.28);
      }
      .driver-marker span { color: white; font: 900 11px system-ui; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const pickup = [${pickup.longitude}, ${pickup.latitude}];
      const dropoff = [${dropoff.longitude}, ${dropoff.latitude}];
      const map = new maplibregl.Map({
        container: 'map',
        center: pickup,
        zoom: 12,
        dragPan: true,
        scrollZoom: true,
        touchZoomRotate: true,
        doubleClickZoom: true,
        attributionControl: true,
        style: {
          version: 8,
          sources: {
            carto: {
              type: 'raster',
              tiles: [
                'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              attribution: '&copy; OpenStreetMap &copy; CARTO'
            }
          },
          layers: [{ id: 'carto', type: 'raster', source: 'carto' }]
        }
      });
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

      function makePin(className, label) {
        const el = document.createElement('div');
        el.className = 'pin ' + className;
        el.innerHTML = '<span>' + label + '</span>';
        return el;
      }

      new maplibregl.Marker({ element: makePin('pickup', 'A') })
        .setLngLat(pickup)
        .setPopup(new maplibregl.Popup({ offset: 18 }).setText('${escapeHtml(pickup.label)}'))
        .addTo(map);

      new maplibregl.Marker({ element: makePin('dropoff', 'B') })
        .setLngLat(dropoff)
        .setPopup(new maplibregl.Popup({ offset: 18 }).setText('${escapeHtml(dropoff.label)}'))
        .addTo(map);

      ${driverMarker}

      map.on('load', () => {
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: ${JSON.stringify(coordinates)} }
          }
        });
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          paint: {
            'line-color': '#2563eb',
            'line-width': 5,
            'line-opacity': 0.88
          },
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          }
        });
        const bounds = coordinates.reduce((box, coord) => box.extend(coord), new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
        map.fitBounds(bounds, { padding: 44, maxZoom: 16 });
      });
    </script>
  </body>
</html>`;
};

export function RealtimeTripMap({
  pickup,
  dropoff,
  driverLocation,
  height = 540,
}: RealtimeTripMapProps) {
  const { colors } = useTheme();
  const driverPoint = driverLocation
    ? { latitude: driverLocation.latitude, longitude: driverLocation.longitude }
    : null;
  const html = useMemo(() => createMapHtml(pickup, dropoff, driverLocation), [pickup, dropoff, driverLocation]);
  const distanceToPickup = driverPoint ? getDistanceMeters(driverPoint, pickup) : null;
  const distanceToDropoff = driverPoint ? getDistanceMeters(driverPoint, dropoff) : null;

  return (
    <View style={{ borderRadius: borderRadius.lg, overflow: 'hidden', backgroundColor: colors.surfaceAlt }}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        nestedScrollEnabled
        scrollEnabled
        mixedContentMode="always"
        style={{ width: '100%', height, backgroundColor: colors.surfaceAlt }}
      />

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
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
          {driverPoint
            ? `Tài xế cách điểm đón ${Math.round(distanceToPickup ?? 0)}m, cách điểm đến ${Math.round(distanceToDropoff ?? 0)}m.`
            : 'Đang chờ tài xế bật chia sẻ GPS.'}
        </Text>
      </View>
    </View>
  );
}
