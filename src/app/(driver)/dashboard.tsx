import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { BarChart3, Briefcase, Car, Newspaper, Wallet } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Card, CardSkeleton } from '@/components/BaseComponents';
import { EmptyState, Screen } from '@/components/ScreenComponents';
import { apiClient } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { BlogPost, Booking, Vehicle } from '@/types';

type RangeMode = 'day' | 'month' | 'year';

const money = (value: number) => `${value.toLocaleString('vi-VN')}đ`;

function getBucketLabel(date: Date, mode: RangeMode) {
  if (mode === 'day') return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  if (mode === 'month') return date.toLocaleDateString('vi-VN', { month: '2-digit', year: '2-digit' });
  return String(date.getFullYear());
}

function buildBuckets(mode: RangeMode) {
  const count = mode === 'day' ? 7 : mode === 'month' ? 6 : 3;
  return Array.from({ length: count }).map((_, index) => {
    const date = new Date();
    const offset = count - index - 1;
    if (mode === 'day') date.setDate(date.getDate() - offset);
    if (mode === 'month') date.setMonth(date.getMonth() - offset);
    if (mode === 'year') date.setFullYear(date.getFullYear() - offset);
    return { key: getBucketLabel(date, mode), label: getBucketLabel(date, mode), trips: 0, revenue: 0 };
  });
}

export default function DriverDashboard() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [mode, setMode] = useState<RangeMode>('day');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [allBookings, driverVehicles, driverPosts] = await Promise.all([
        apiClient.getBookings({ driverId: user.id }),
        apiClient.getDriverVehicles(user.id),
        apiClient.getBlogPosts(1, 20, { driverId: user.id }),
      ]);
      setBookings(allBookings);
      setVehicles(driverVehicles);
      setPosts(driverPosts);
    } catch (error: any) {
      Alert.alert('Không thể tải thống kê', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const stats = useMemo(() => {
    const completed = bookings.filter((booking) => booking.status === 'Hoàn thành');
    const active = bookings.filter((booking) => booking.status === 'Chờ xác nhận' || booking.status === 'Đã xác nhận');
    const revenue = completed.reduce((sum, booking) => sum + (booking.actualPrice ?? booking.estimatedPrice ?? 0), 0);
    return { completed: completed.length, active: active.length, revenue };
  }, [bookings]);

  const chart = useMemo(() => {
    const buckets = buildBuckets(mode);
    bookings.forEach((booking) => {
      const date = new Date(booking.date || booking.createdAt);
      const label = getBucketLabel(date, mode);
      const bucket = buckets.find((item) => item.key === label);
      if (!bucket) return;
      bucket.trips += 1;
      bucket.revenue += booking.actualPrice ?? booking.estimatedPrice ?? 0;
    });
    const maxValue = Math.max(...buckets.map((item) => item.revenue), 1);
    return buckets.map((bucket) => ({ ...bucket, height: Math.max(8, Math.round((bucket.revenue / maxValue) * 132)) }));
  }, [bookings, mode]);

  const summaryCards = [
    { label: 'Doanh thu', value: money(stats.revenue), icon: <Wallet size={20} color={colors.primary} /> },
    { label: 'Hoàn thành', value: String(stats.completed), icon: <Briefcase size={20} color={colors.success} /> },
    { label: 'Đang xử lý', value: String(stats.active), icon: <BarChart3 size={20} color={colors.info} /> },
    { label: 'Xe', value: String(vehicles.length), icon: <Car size={20} color={colors.warning} /> },
  ];

  return (
    <Screen scroll padding>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: spacing.xs }}>
        Thống kê tài xế
      </Text>
      <Text style={{ color: colors.textSecondary, marginBottom: spacing.lg }}>
        Dữ liệu lấy trực tiếp từ booking, xe và bài viết trong database.
      </Text>

      {loading && (
        <>
          <CardSkeleton style={{ marginBottom: spacing.lg }} />
          <CardSkeleton style={{ marginBottom: spacing.lg }} />
        </>
      )}

      {!loading && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg }}>
        {summaryCards.map((item) => (
          <Card key={item.label} style={{ width: '47%', minHeight: 104 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{item.label}</Text>
              {item.icon}
            </View>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>{item.value}</Text>
          </Card>
        ))}
      </View>}

      {!loading && <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Biểu đồ doanh thu</Text>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            {[
              { key: 'day', label: 'Ngày' },
              { key: 'month', label: 'Tháng' },
              { key: 'year', label: 'Năm' },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => setMode(item.key as RangeMode)}
                style={{
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  borderRadius: borderRadius.full,
                  backgroundColor: mode === item.key ? colors.primary : colors.surfaceAlt,
                }}
              >
                <Text style={{ color: mode === item.key ? 'white' : colors.text, fontSize: fontSize.xs, fontWeight: '700' }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 168, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
          {chart.map((bucket) => (
            <View key={bucket.key} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 10, marginBottom: spacing.xs }}>
                {bucket.trips} chuyến
              </Text>
              <View
                style={{
                  width: '76%',
                  height: bucket.height,
                  borderRadius: borderRadius.md,
                  backgroundColor: bucket.revenue > 0 ? colors.primary : colors.surfaceAlt,
                }}
              />
              <Text numberOfLines={1} style={{ color: colors.textTertiary, fontSize: 10, marginTop: spacing.xs }}>
                {bucket.label}
              </Text>
            </View>
          ))}
        </View>
      </Card>}

      {!loading && <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Hoạt động nội dung</Text>
          <Newspaper size={20} color={colors.primary} />
        </View>
        <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>
          Bạn có {posts.length} bài viết, {posts.reduce((sum, post) => sum + post.likes, 0)} lượt thích và {posts.reduce((sum, post) => sum + post.comments, 0)} bình luận.
        </Text>
      </Card>}

      {!loading && bookings.length === 0 && vehicles.length === 0 && posts.length === 0 && (
        <EmptyState
          icon={<BarChart3 size={48} color={colors.primary} />}
          title="Chưa có dữ liệu"
          description="Khi có xe, bài viết hoặc chuyến đi, thống kê sẽ tự cập nhật từ database."
        />
      )}
    </Screen>
  );
}
