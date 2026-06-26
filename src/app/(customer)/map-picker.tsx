import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Crosshair, LocateFixed, MapPin } from 'lucide-react-native';
import { Button } from '@/components/BaseComponents';
import { NativeMapUnavailable, getNativeMapLibre } from '@/components/NativeMapLibre';
import { getCurrentDeviceLocation } from '@/services/deviceLocation';
import { LocationSuggestion, reverseVietnamLocation } from '@/services/locations';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, shadows, spacing } from '@/theme/tokens';
import { showError, showSuccess, showWarning } from '@/utils/toast';

const DEFAULT_CENTER = {
  lat: 10.7769,
  lng: 106.7009,
  label: 'Trung tâm TP. Hồ Chí Minh',
};

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

const stringParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const numberParam = (value: string | string[] | undefined) => {
  const parsed = Number(stringParam(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const extractLngLat = (event: any): [number, number] | null => {
  const candidates = [
    event?.nativeEvent?.lngLat,
    event?.geometry?.coordinates,
    event?.coordinates,
    event?.lngLat,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length >= 2) {
      const lng = Number(candidate[0]);
      const lat = Number(candidate[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return [lng, lat];
    }
  }

  return null;
};

function PinMarker({ color }: { color: string }) {
  return (
    <View style={[styles.pin, { backgroundColor: color }]}>
      <MapPin size={18} color="#ffffff" fill="#ffffff" />
    </View>
  );
}

export default function CustomerMapPickerScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<Record<string, string>>();
  const nativeMap = getNativeMapLibre();
  const cameraRef = useRef<any>(null);
  const target = stringParam(params.target) === 'dropoff' ? 'dropoff' : 'pickup';
  const initialLat = numberParam(params.initialLat) ?? (target === 'pickup' ? numberParam(params.pickupLat) : numberParam(params.dropoffLat)) ?? DEFAULT_CENTER.lat;
  const initialLng = numberParam(params.initialLng) ?? (target === 'pickup' ? numberParam(params.pickupLng) : numberParam(params.dropoffLng)) ?? DEFAULT_CENTER.lng;
  const initialLabel = stringParam(params.initialLabel) || DEFAULT_CENTER.label;
  const [point, setPoint] = useState<LocationSuggestion>({
    id: `map-${target}`,
    label: initialLabel,
    lat: initialLat,
    lng: initialLng,
    provider: 'goong',
  });
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [locating, setLocating] = useState(false);

  const styleUrl = goongStyleUrl();
  const Camera = nativeMap?.Camera;
  const Map = nativeMap?.Map;
  const Marker = nativeMap?.Marker;
  const mapTitle = target === 'pickup' ? 'Chọn điểm đón' : 'Chọn điểm đến';
  const mapSubtitle = target === 'pickup'
    ? 'Chạm vào bản đồ để đặt vị trí tài xế đến đón.'
    : 'Chạm vào bản đồ để đặt vị trí trả khách.';
  const center = useMemo<[number, number]>(() => [point.lng, point.lat], [point.lat, point.lng]);
  const liquidTabClearance = Math.max(insets.bottom, spacing.md) + 92;

  const updatePoint = async (lat: number, lng: number, fallbackLabel = 'Vị trí đã chọn') => {
    try {
      setResolvingAddress(true);
      const resolved = await reverseVietnamLocation(lat, lng).catch(() => ({
        id: `map-${target}-${lat}-${lng}`,
        label: fallbackLabel,
        lat,
        lng,
        provider: 'goong' as const,
      }));
      setPoint(resolved);
      cameraRef.current?.flyTo?.({ center: [resolved.lng, resolved.lat], zoom: 16, duration: 450, easing: 'ease' });
    } finally {
      setResolvingAddress(false);
    }
  };

  const handleMapPress = async (event: any) => {
    const lngLat = extractLngLat(event);
    if (!lngLat) {
      showWarning('Chưa đọc được tọa độ', 'Vui lòng chạm lại vào vị trí cần chọn trên bản đồ.');
      return;
    }

    await updatePoint(lngLat[1], lngLat[0]);
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLocating(true);
      const currentLocation = await getCurrentDeviceLocation();
      await updatePoint(currentLocation.lat, currentLocation.lng, currentLocation.label);
      showSuccess('Đã lấy vị trí hiện tại', currentLocation.label);
    } catch (error: any) {
      showError('Không thể lấy GPS', error.message || 'Vui lòng kiểm tra quyền vị trí.');
    } finally {
      setLocating(false);
    }
  };

  const handleConfirm = () => {
    const nextParams = {
      pickupLocation: stringParam(params.pickupLocation) ?? '',
      dropoffLocation: stringParam(params.dropoffLocation) ?? '',
      dateInput: stringParam(params.dateInput) ?? '',
      time: stringParam(params.time) ?? '',
      bookingMode: stringParam(params.bookingMode) ?? '',
      passengers: stringParam(params.passengers) ?? '',
      note: stringParam(params.note) ?? '',
      pickupLat: stringParam(params.pickupLat) ?? '',
      pickupLng: stringParam(params.pickupLng) ?? '',
      dropoffLat: stringParam(params.dropoffLat) ?? '',
      dropoffLng: stringParam(params.dropoffLng) ?? '',
      mapTarget: target,
      mapLat: String(point.lat),
      mapLng: String(point.lng),
      mapAddress: point.label,
    };

    router.replace({
      pathname: '/(customer)/booking' as any,
      params: nextParams,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {nativeMap && Camera && Map && Marker ? (
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
              centerCoordinate: center,
              zoom: 15,
              pitch: 0,
              heading: 0,
            }}
          />
          <Marker id="selected-location" lngLat={center} anchor="bottom">
            <PinMarker color={target === 'pickup' ? colors.primary : colors.error} />
          </Marker>
        </Map>
      ) : (
        <NativeMapUnavailable height="100%" />
      )}

      <View
        style={[
          styles.header,
          {
            top: insets.top + spacing.sm,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '900' }}>{mapTitle}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs }}>{mapSubtitle}</Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleUseCurrentLocation}
        disabled={locating}
        style={[styles.locateButton, { right: spacing.lg, bottom: liquidTabClearance + 172, backgroundColor: colors.surface }]}
      >
        {locating ? <ActivityIndicator color={colors.primary} /> : <LocateFixed size={22} color={colors.primary} />}
      </TouchableOpacity>

      <View
        style={[
          styles.confirmPanel,
          {
            bottom: liquidTabClearance,
            paddingBottom: spacing.md,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
          <Crosshair size={20} color={target === 'pickup' ? colors.primary : colors.error} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: fontSize.base, fontWeight: '800' }} numberOfLines={3}>
              {point.label}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.xs }}>
              {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
            </Text>
            {resolvingAddress && (
              <Text style={{ color: colors.primary, fontSize: fontSize.xs, marginTop: spacing.xs }}>
                Đang lấy tên địa điểm...
              </Text>
            )}
          </View>
        </View>

        <Button
          label={target === 'pickup' ? 'Xác nhận điểm đón' : 'Xác nhận điểm đến'}
          onPress={handleConfirm}
          style={{ marginTop: spacing.md }}
          disabled={resolvingAddress}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.md,
  },
  locateButton: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  confirmPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    ...shadows.lg,
  },
  pin: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    ...shadows.md,
  },
});
