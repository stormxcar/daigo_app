import React from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/theme';
import { spacing, borderRadius, fontSize } from '@/theme/tokens';
import { Card } from '@/components/BaseComponents';
import { Booking } from '@/types';
import { IllustrationBlock } from '@/components/IllustrationBlocks';
import { Badge } from '@/components/BaseComponents';
import { Car, MapPin, Navigation, Route, User } from 'lucide-react-native';
import { formatCurrency, formatVietnamDate, getBookingStatusInfo } from '@/utils/helpers';
import { buildOptimizedCloudinaryImageUrl } from '@/services/videoOptimizationService';

export const RecentTripsCarousel: React.FC<{
  trips: Booking[];
  onTripPress?: (booking: Booking) => void;
}> = ({ trips, onTripPress }) => {
  const { colors } = useTheme();
  if (trips.length === 0) return null;

  return (
    <View style={{ marginBottom: spacing.xl, paddingHorizontal: spacing.md }}>
      <Text style={{ fontSize: fontSize.base, fontWeight: '800', color: colors.text, marginBottom: spacing.md }}>
        Lịch sử chuyến đi
      </Text>
      <FlatList
        data={trips}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.md }}
        removeClippedSubviews
        initialNumToRender={4}
        maxToRenderPerBatch={6}
        windowSize={7}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.84} onPress={() => onTripPress?.(item)}>
            <Card style={{ width: 286, padding: spacing.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
              {item.vehicle?.image?.startsWith('http') ? (
                <Image
                  source={{ uri: buildOptimizedCloudinaryImageUrl(item.vehicle.image, { width: 480 }) }}
                  style={{ width: '100%', height: 80, borderRadius: borderRadius.sm, marginBottom: spacing.xs }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ marginBottom: spacing.xs }}>
                  <IllustrationBlock height={80} tone="success" icon={<Route size={20} color="white" />} />
                </View>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, alignItems: 'center', marginBottom: spacing.xs }}>
                <Text style={{ fontSize: fontSize.sm, fontWeight: '900', color: colors.text, flex: 1 }}>
                  {item.bookingCode ?? 'Chuyến đi'}
                </Text>
                <Badge label={getBookingStatusInfo(item.status).label} variant={item.status === 'TRIP_COMPLETED' ? 'success' : 'info'} />
              </View>
              <Text style={{ fontSize: fontSize.xs, fontWeight: '700', color: colors.textSecondary, marginBottom: spacing.sm }}>
                {item.time} - {formatVietnamDate(item.date)}
              </Text>
              {[
                { icon: <MapPin size={13} color={colors.primary} />, text: item.pickupLocation },
                { icon: <Navigation size={13} color={colors.error} />, text: item.dropoffLocation },
                { icon: <Car size={13} color={colors.primary} />, text: item.vehicle?.name ?? 'Chưa có xe' },
                { icon: <User size={13} color={colors.info} />, text: item.driverName || 'Đang chờ tài xế' },
              ].map((row, index) => (
                <View key={index} style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center', marginTop: spacing.xs }}>
                  {row.icon}
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: fontSize.xs, color: colors.textSecondary }}>
                    {row.text}
                  </Text>
                </View>
              ))}
              <Text style={{ fontSize: fontSize.sm, color: colors.primary, fontWeight: '900', marginTop: spacing.sm }}>
                {formatCurrency(item.actualPrice ?? item.estimatedPrice)}
              </Text>
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};
