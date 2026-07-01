import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Text, TouchableOpacity, View } from 'react-native';
import { Download, RefreshCw } from 'lucide-react-native';
import { appUpdateService, AppUpdateStatus } from '@/services/appUpdateService';
import { useTheme } from '@/theme';
import { fontForWeight, borderRadius, fontSize, spacing } from '@/theme/tokens';
import { showError } from '@/utils/toast';

interface ForceUpdateGateProps {
  children: React.ReactNode;
}

export function ForceUpdateGate({ children }: ForceUpdateGateProps) {
  const { colors } = useTheme();
  const [status, setStatus] = useState<AppUpdateStatus | null>(null);
  const [checking, setChecking] = useState(true);

  const check = useCallback(async () => {
    try {
      setChecking(true);
      setStatus(await appUpdateService.checkUpdatePolicy());
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const openUpdate = async () => {
    const url = status?.policy?.updateUrl;
    if (!url) {
      showError('Chưa có link cập nhật', 'Vui lòng liên hệ đội hỗ trợ để nhận bản cài mới nhất.');
      return;
    }

    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      showError('Không mở được link cập nhật', url);
      return;
    }

    await Linking.openURL(url);
  };

  if (checking && !status) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!status?.required) {
    return <>{children}</>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: spacing.xl }}>
      <View
        style={{
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          paddingVertical: spacing.xl,
          paddingHorizontal: spacing.lg,
        }}
      >
        <View
          style={{
            width: 58,
            height: 58,
            borderRadius: borderRadius.full,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.lg,
          }}
        >
          <Download size={28} color="white" />
        </View>

        <Text style={{ color: colors.text, fontSize: fontSize['2xl'], ...fontForWeight('900'), marginBottom: spacing.sm }}>
          Cần cập nhật ứng dụng
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.base, lineHeight: 23, marginBottom: spacing.md }}>
          Phiên bản Daigo Booking bạn đang dùng đã cũ. Vui lòng cập nhật lên bản mới nhất để tiếp tục đặt xe, nhận chuyến và sử dụng bản đồ ổn định.
        </Text>
        {!!status.policy?.releaseNotes && (
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.lg }}>
            {status.policy.releaseNotes}
          </Text>
        )}
        <Text style={{ color: colors.textTertiary, fontSize: fontSize.sm, marginBottom: spacing.lg }}>
          Bản hiện tại: {status.currentVersion} ({status.currentBuildNumber})
        </Text>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openUpdate}
          style={{
            minHeight: 46,
            borderRadius: borderRadius.md,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: spacing.sm,
            marginBottom: spacing.sm,
          }}
        >
          <Download size={18} color="white" />
          <Text style={{ color: 'white', ...fontForWeight('900')}}>Cập nhật ngay</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={check}
          disabled={checking}
          style={{
            minHeight: 42,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: spacing.sm,
          }}
        >
          <RefreshCw size={16} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, ...fontForWeight('800')}}>
            {checking ? 'Đang kiểm tra...' : 'Tôi đã cập nhật, kiểm tra lại'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
