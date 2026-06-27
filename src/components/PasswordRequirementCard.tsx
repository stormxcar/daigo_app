import React from 'react';
import { Text, View } from 'react-native';
import { CheckCircle2, Circle } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';

const getPasswordRules = (password: string) => [
  { label: 'Ít nhất 8 ký tự', valid: password.length >= 8 },
  { label: 'Có ít nhất 1 chữ hoa', valid: /[A-Z]/.test(password) },
  { label: 'Có ít nhất 1 chữ thường', valid: /[a-z]/.test(password) },
  { label: 'Có ít nhất 1 chữ số', valid: /[0-9]/.test(password) },
];

export function PasswordRequirementCard({ password }: { password: string }) {
  const { colors } = useTheme();
  const rules = getPasswordRules(password);

  return (
    <View
      style={{
        padding: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: colors.surfaceAlt,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.xs,
      }}
    >
      <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: '900', marginBottom: spacing.xs }}>
        Mật khẩu cần có
      </Text>
      {rules.map((rule) => (
        <View key={rule.label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {rule.valid ? (
            <CheckCircle2 size={15} color={colors.success} />
          ) : (
            <Circle size={15} color={colors.textTertiary} />
          )}
          <Text
            style={{
              color: rule.valid ? colors.success : colors.textSecondary,
              fontSize: fontSize.xs,
              fontWeight: rule.valid ? '800' : '600',
            }}
          >
            {rule.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
