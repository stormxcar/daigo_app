import React from 'react';
import { Text, View } from 'react-native';
import { AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontForWeight, fontSize, spacing } from '@/theme/tokens';
import { User } from '@/types';

type ProfileCompletionCardProps = {
  user?: User | null;
  variant: 'customer' | 'driver';
  vehicleCount?: number;
  documentCount?: number;
};

export function ProfileCompletionCard({
  user,
  variant,
  vehicleCount = 0,
  documentCount = 0,
}: ProfileCompletionCardProps) {
  const { colors } = useTheme();
  const checks = [
    { label: 'Họ tên', done: !!user?.fullName?.trim() },
    { label: 'Email', done: !!user?.email?.trim() },
    { label: 'Xác thực email', done: !!user?.emailVerified },
    { label: 'Số điện thoại', done: !!user?.phone?.trim() },
    { label: 'Xác thực SĐT', done: !!user?.phoneVerified },
    { label: 'Địa chỉ', done: !!user?.address?.trim() },
    { label: 'Ảnh đại diện', done: !!user?.avatarUrl },
    ...(variant === 'driver'
      ? [
          { label: 'Tài khoản nhận tiền', done: !!user?.bankAccountNumber && !!user?.bankAccountHolder },
          { label: 'Giấy tờ tài xế', done: documentCount > 0 || user?.kycStatus === 'approved' || user?.kycStatus === 'pending' },
          { label: 'Xe đang quản lý', done: vehicleCount > 0 },
        ]
      : []),
  ];
  const completed = checks.filter((item) => item.done).length;
  const percent = Math.round((completed / checks.length) * 100);
  const missing = checks.filter((item) => !item.done).slice(0, 3);

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 16, ...fontForWeight('900') }}>Hoàn thiện hồ sơ</Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 3 }}>
            {completed}/{checks.length} mục đã hoàn tất
          </Text>
        </View>
        <Text style={{ color: percent >= 80 ? colors.success : colors.warning, fontSize: 24, ...fontForWeight('900') }}>
          {percent}%
        </Text>
      </View>

      <View
        style={{
          height: 8,
          borderRadius: borderRadius.full,
          backgroundColor: colors.surfaceAlt,
          marginTop: spacing.md,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${percent}%`,
            height: '100%',
            borderRadius: borderRadius.full,
            backgroundColor: percent >= 80 ? colors.success : colors.primary,
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
        {(missing.length ? missing : checks.slice(0, 3)).map((item) => {
          const Icon = item.done ? CheckCircle2 : AlertCircle;
          return (
            <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon size={14} color={item.done ? colors.success : colors.warning} />
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, ...fontForWeight('700') }}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
