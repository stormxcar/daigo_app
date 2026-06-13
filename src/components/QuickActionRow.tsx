import React from 'react';
import { FlatList, TouchableOpacity, Text, View } from 'react-native';
import { Card, Button } from '@/components/BaseComponents';
import { useTheme } from '@/theme';
import { spacing, borderRadius, fontSize } from '@/theme/tokens';
import { Car, CalendarClock, Star, ShieldCheck } from 'lucide-react-native';
import { router } from 'expo-router';

interface ActionItem {
  label: string;
  icon: keyof typeof iconsMap;
  route: string;
}

const iconsMap = {
  Car: <Car size={24} />, 
  CalendarClock: <CalendarClock size={24} />, 
  Star: <Star size={24} />, 
  ShieldCheck: <ShieldCheck size={24} />, 
};

export const QuickActionRow: React.FC<{ actions: readonly ActionItem[] }> = ({ actions }) => {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <Text style={{ fontSize: fontSize.base, fontWeight: '800', color: colors.text, marginBottom: spacing.md }}>
        Lối tắt
      </Text>
      <FlatList
      data={actions}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.label}
      contentContainerStyle={{ gap: spacing.md }}
      renderItem={({ item }) => (
        <Card style={{ width: 92, alignItems: 'center', padding: spacing.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
          {iconsMap[item.icon]}
          <Text style={{ fontSize: fontSize.xs, marginTop: spacing.xs, color: colors.text, textAlign: 'center' }}>{item.label}</Text>
          <TouchableOpacity
            onPress={() => router.push(item.route as any)}
            style={{ position: 'absolute', inset: 0 }}
          />
        </Card>
      )}
      />
    </View>
  );
};
