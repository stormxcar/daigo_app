import React from 'react';
import { NativeModules, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { fontForWeight, borderRadius, fontSize, spacing } from '@/theme/tokens';

type MapLibreModule = {
  Camera: any;
  GeoJSONSource: any;
  Layer: any;
  Map: any;
  Marker: any;
};

let moduleCache: MapLibreModule | null | undefined;

export function getNativeMapLibre(): MapLibreModule | null {
  if (moduleCache !== undefined) return moduleCache;

  try {
    if (Constants.appOwnership === 'expo') {
      moduleCache = null;
      return moduleCache;
    }

    const hasCameraModule = Boolean(NativeModules.MLRNCameraModule);
    const hasMapModule = Boolean(NativeModules.MLRNMapViewModule);
    if (!hasCameraModule || !hasMapModule) {
      moduleCache = null;
      return moduleCache;
    }

    // Keep this dynamic. Static imports crash Expo Go / old APKs before routes can export.
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const maplibre = require('@maplibre/maplibre-react-native');
    moduleCache = {
      Camera: maplibre.Camera,
      GeoJSONSource: maplibre.GeoJSONSource,
      Layer: maplibre.Layer,
      Map: maplibre.Map,
      Marker: maplibre.Marker,
    };
  } catch {
    moduleCache = null;
  }

  return moduleCache;
}

export function NativeMapUnavailable({ height = 340 }: { height?: number | string }) {
  return (
    <View
      style={{
        minHeight: typeof height === 'number' ? height : 340,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        backgroundColor: '#dbeafe',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#1e293b', fontSize: fontSize.base, ...fontForWeight('900'), marginBottom: spacing.sm }}>
        Bản đồ native chưa có trong bản app hiện tại
      </Text>
      <Text style={{ color: '#475569', fontSize: fontSize.sm, lineHeight: 20 }}>
        Hãy cài APK/development build mới sau khi thêm @maplibre/maplibre-react-native. Expo Go hoặc APK cũ sẽ thiếu module MLRNCameraModule.
      </Text>
    </View>
  );
}
