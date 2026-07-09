import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, AppStateStatus, Linking, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { AlertTriangle, LocateFixed, RefreshCw, Settings, ShieldCheck, WifiOff } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontForWeight, fontSize, shadows, spacing } from '@/theme/tokens';

type LocationGateStatus = 'unknown' | 'granted' | 'denied';

const CHECK_TIMEOUT_MS = 5500;

async function checkInternetAccess() {
  const target = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://www.google.com/generate_204';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

  try {
    await fetch(`${target}${target.includes('?') ? '&' : '?'}daigo_ping=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function AppAccessGate() {
  const { colors, isDark } = useTheme();
  const [online, setOnline] = useState<boolean | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationGateStatus>('unknown');
  const [checking, setChecking] = useState(false);

  const refreshStatus = useCallback(async () => {
    setChecking(true);
    try {
      const [hasInternet, permission] = await Promise.all([
        checkInternetAccess(),
        Location.getForegroundPermissionsAsync().catch(() => null),
      ]);
      setOnline(hasInternet);
      setLocationStatus(
        permission?.status === 'granted'
          ? 'granted'
          : permission?.status === 'denied'
            ? 'denied'
            : 'unknown',
      );
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') refreshStatus();
    });
    return () => subscription.remove();
  }, [refreshStatus]);

  const requestLocation = async () => {
    const result = await Location.requestForegroundPermissionsAsync().catch(() => null);
    setLocationStatus(result?.status === 'granted' ? 'granted' : result ? 'denied' : 'unknown');
  };

  const showGate = online === false || locationStatus === 'denied';
  if (!showGate) return null;

  const offline = online === false;
  const locationDenied = locationStatus === 'denied';

  return (
    <View
      pointerEvents="auto"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 9998,
        elevation: 9998,
        backgroundColor: isDark ? '#020617' : '#eff6ff',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing['2xl'],
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: borderRadius['2xl'],
          padding: spacing.xl,
          borderWidth: 1,
          borderColor: colors.border,
          ...shadows.xl,
        }}
      >
        <View
          style={{
            width: 82,
            height: 82,
            borderRadius: borderRadius.full,
            backgroundColor: offline ? colors.error + '18' : colors.warning + '18',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.lg,
          }}
        >
          {offline ? <WifiOff size={40} color={colors.error} /> : <LocateFixed size={40} color={colors.warning} />}
        </View>

        <Text style={{ color: colors.text, fontSize: 24, lineHeight: 31, ...fontForWeight('900'), marginBottom: spacing.sm }}>
          Kết nối bị gián đoạn
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.base, lineHeight: 24, marginBottom: spacing.lg }}>
          Vui lòng kiểm tra Wi-Fi hoặc dữ liệu di động. Daigo cần internet để tải chuyến đi, bản đồ, thông báo và đồng bộ dữ liệu theo thời gian thực.
        </Text>

        <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
            <AlertTriangle size={18} color={offline ? colors.error : colors.success} />
            <Text style={{ color: colors.text, flex: 1, lineHeight: 21 }}>
              {offline ? 'Chưa thể kết nối đến máy chủ Daigo.' : 'Kết nối internet đã sẵn sàng.'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
            <ShieldCheck size={18} color={locationDenied ? colors.warning : colors.success} />
            <Text style={{ color: colors.text, flex: 1, lineHeight: 21 }}>
              {locationDenied
                ? 'Bạn cũng cần cho phép truy cập vị trí để app lấy điểm đón và tìm tài xế gần nhất.'
                : 'Quyền vị trí sẽ giúp app lấy điểm đón và chỉ đường chính xác hơn.'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.84}
          disabled={checking}
          onPress={refreshStatus}
          style={{
            minHeight: 48,
            borderRadius: borderRadius.lg,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: spacing.sm,
            opacity: checking ? 0.72 : 1,
          }}
        >
          {checking ? <ActivityIndicator size="small" color="white" /> : <RefreshCw size={18} color="white" />}
          <Text style={{ color: 'white', fontSize: fontSize.base, ...fontForWeight('900') }}>
            Kiểm tra lại kết nối
          </Text>
        </TouchableOpacity>

        {locationDenied && (
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={requestLocation}
              style={{
                flex: 1,
                minHeight: 46,
                borderRadius: borderRadius.lg,
                borderWidth: 1,
                borderColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: spacing.xs,
              }}
            >
              <LocateFixed size={17} color={colors.primary} />
              <Text style={{ color: colors.primary, ...fontForWeight('800') }}>Cấp quyền</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => Linking.openSettings()}
              style={{
                flex: 1,
                minHeight: 46,
                borderRadius: borderRadius.lg,
                backgroundColor: colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: spacing.xs,
              }}
            >
              <Settings size={17} color={colors.text} />
              <Text style={{ color: colors.text, ...fontForWeight('800') }}>Cài đặt</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
