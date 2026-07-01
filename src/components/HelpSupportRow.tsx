import React from 'react';
import { Linking, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import { fontForWeight, spacing, fontSize, borderRadius } from '@/theme/tokens';
import { Card } from '@/components/BaseComponents';
import { HelpCircle, MessageSquare, Phone } from 'lucide-react-native';
import { router } from 'expo-router';

export const HelpSupportRow: React.FC = () => {
  const { colors } = useTheme();
  const items = [
    {
      label: 'Hồ sơ',
      icon: <HelpCircle size={24} color={colors.text} />,
      onPress: () => router.push('/(customer)/profile'),
    },
    {
      label: 'Chat',
      icon: <MessageSquare size={24} color={colors.text} />,
      onPress: () => router.push('/(customer)/chat'),
    },
    {
      label: 'Hotline',
      icon: <Phone size={24} color={colors.error} />,
      onPress: () => Linking.openURL('tel:19008888'),
    },
  ];

  return (
    <Card style={{ padding: spacing.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl }}>
      <Text
        style={{
          fontSize: fontSize.base,
          ...fontForWeight('800'),
          color: colors.text,
          marginBottom: spacing.sm,
        }}
      >
        Hỗ trợ
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.label}
            onPress={item.onPress}
            style={{
              flex: 1,
              alignItems: 'center',
              padding: spacing.md,
              borderRadius: borderRadius.md,
              backgroundColor: colors.surface,
            }}
          >
            {item.icon}
            <Text
              style={{
                marginTop: spacing.xs,
                fontSize: fontSize.sm,
                color: colors.text,
                ...fontForWeight('700'),
              }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );
};
