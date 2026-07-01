import React from 'react';
import { Image, Share, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Copy, Share2 } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { fontForWeight, borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Payment } from '@/types';
import { showSuccess } from '@/utils/toast';

type Props = {
  payment: Payment;
};

export function VietQRCard({ payment }: Props) {
  const { colors } = useTheme();

  const copy = async (label: string, value: string) => {
    await Clipboard.setStringAsync(value);
    showSuccess(`Đã copy ${label}`);
  };

  const shareQr = async () => {
    if (!payment.qrUrl) return;
    await Share.share({
      title: 'VietQR thanh toán chuyến đi',
      message: `${payment.qrUrl}\nNội dung: ${payment.transferContent}`,
    });
  };

  const rows = [
    { label: 'Ngân hàng', value: payment.bankName ?? 'Chưa có' },
    { label: 'Số tài khoản', value: payment.bankAccountNumber ?? 'Chưa có', copyLabel: payment.bankAccountNumber ? 'số tài khoản' : undefined },
    { label: 'Chủ tài khoản', value: payment.bankAccountHolder ?? 'Chưa có' },
    { label: 'Nội dung CK', value: payment.transferContent, copyLabel: 'nội dung chuyển khoản' },
  ];

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
      <Text style={{ color: colors.text, fontSize: 18, ...fontForWeight('900'), marginBottom: spacing.md }}>
        Quét VietQR để chuyển khoản
      </Text>
      {!!payment.qrUrl && (
        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
          <Image
            source={{ uri: payment.qrUrl }}
            resizeMode="contain"
            style={{
              width: '100%',
              height: 280,
              borderRadius: borderRadius.lg,
              backgroundColor: 'white',
            }}
          />
        </View>
      )}
      <Text style={{ color: colors.primary, fontSize: 26, ...fontForWeight('900'), marginBottom: spacing.md }}>
        {payment.amount.toLocaleString('vi-VN')} VND
      </Text>
      <View style={{ gap: spacing.sm }}>
        {rows.map((row) => (
          <View
            key={row.label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.md,
              borderRadius: borderRadius.lg,
              backgroundColor: colors.surfaceAlt,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>{row.label}</Text>
              <Text style={{ color: colors.text, ...fontForWeight('800'), marginTop: spacing.xs }}>{row.value}</Text>
            </View>
            {!!row.copyLabel && (
              <TouchableOpacity
                onPress={() => copy(row.copyLabel!, row.value)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: borderRadius.full,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.surface,
                }}
              >
                <Copy size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
      {!!payment.qrUrl && (
        <TouchableOpacity
          onPress={shareQr}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            marginTop: spacing.md,
            padding: spacing.md,
            borderRadius: borderRadius.lg,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Share2 size={18} color={colors.primary} />
          <Text style={{ color: colors.primary, ...fontForWeight('800')}}>Chia sẻ QR</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
