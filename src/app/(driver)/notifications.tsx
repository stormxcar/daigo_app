import React, { useEffect, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Bell, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { fontSize, spacing } from '@/theme/tokens';
import { Button, Skeleton } from '@/components/BaseComponents';
import { EmptyState, Screen } from '@/components/ScreenComponents';
import { SearchFilterBar } from '@/components/SearchFilterBar';
import { useAuthStore } from '@/stores/authStore';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from '@/types';
import { showInfo } from '@/utils/toast';

const NOTIF_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'unread', label: '🔵 Chưa đọc' },
  { key: 'read', label: '✅ Đã đọc' },
];

const NOTIF_SORTS = [
  { key: 'newest', label: 'Mới nhất' },
  { key: 'oldest', label: 'Cũ nhất' },
];

const isCallNotification = (notification: NotificationItem) =>
  notification.title?.toLowerCase().includes('cuộc gọi') ||
  notification.content?.toLowerCase().includes('đang gọi cho bạn');

export default function DriverNotifications() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { notifications, fetchNotifications, loadMoreNotifications, markAsRead, isLoading, isLoadingMore, hasMore, error } = useNotifications(user?.id);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeSort, setActiveSort] = useState('newest');

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filteredNotifications = useMemo(() => {
    let result = [...notifications];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.content?.toLowerCase().includes(q)
      );
    }

    if (activeFilter === 'unread') result = result.filter((n) => !n.read);
    if (activeFilter === 'read') result = result.filter((n) => n.read);
    if (activeSort === 'oldest') result = [...result].reverse();

    return result;
  }, [notifications, search, activeFilter, activeSort]);

  const openNotification = (notification: NotificationItem) => {
    if (!notification.read) markAsRead(notification.id);
    if (isCallNotification(notification)) {
      showInfo('Cuộc gọi đến', 'Nếu cuộc gọi vẫn đang chờ, app sẽ hiện popup nhận cuộc gọi. Thông báo này chỉ là lịch sử cuộc gọi.');
      return;
    }
    if (notification.type === 'payment_update' && notification.relatedBookingId) {
      router.push({ pathname: '/(driver)/payment-review' as any, params: { bookingId: notification.relatedBookingId } });
      return;
    }
    if (notification.relatedBookingId) {
      router.push({ pathname: '/(driver)/booking-detail' as any, params: { id: notification.relatedBookingId } });
      return;
    }
    if (notification.relatedPostId) {
      router.push({ pathname: '/(driver)/blog-detail' as any, params: { id: notification.relatedPostId } });
    }
  };

  return (
    <Screen scroll refreshing={isLoading} onRefresh={fetchNotifications}>
      {/* Search bar — với padding ngang */}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <SearchFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          placeholder="Tìm tiêu đề, nội dung thông báo..."
          filters={NOTIF_FILTERS}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sortOptions={NOTIF_SORTS}
          activeSort={activeSort}
          onSortChange={(key) => setActiveSort(key || 'newest')}
          resultCount={isLoading ? undefined : filteredNotifications.length}
          resultLabel="thông báo"
        />
      </View>

      {!!error && !isLoading && (
        <View
          style={{
            marginHorizontal: spacing.lg,
            marginBottom: spacing.md,
            padding: spacing.md,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.error,
            backgroundColor: colors.error + '12',
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '900', marginBottom: spacing.xs }}>
            Không thể tải thông báo
          </Text>
          <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>
            {error}
          </Text>
          <Button label="Thử lại" onPress={fetchNotifications} variant="outline" size="sm" style={{ marginTop: spacing.sm }} />
        </View>
      )}

      {/* Loading skeletons */}
      {isLoading ? (
        <View>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Skeleton width={44} height={44} borderRadius={22} />
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Skeleton width="70%" height={14} />
                <Skeleton width="90%" height={12} />
                <Skeleton width="40%" height={10} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        /* List ngăn cách bởi border — không có card, sát 2 bên */
        <View>
          {filteredNotifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              activeOpacity={0.7}
              onPress={() => openNotification(notification)}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: spacing.md,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md + 2,
                backgroundColor: notification.read
                  ? colors.background
                  : colors.primary + '08',
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              {/* Icon */}
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: notification.read
                    ? colors.surfaceAlt
                    : colors.primary + '20',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  borderWidth: notification.read ? 0 : 1.5,
                  borderColor: notification.read ? 'transparent' : colors.primary + '40',
                }}
              >
                {notification.read
                  ? <CheckCircle2 size={20} color={colors.textSecondary} />
                  : <Bell size={20} color={colors.primary} />
                }
              </View>

              {/* Content */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: fontSize.base,
                      fontWeight: notification.read ? '600' : '700',
                      flex: 1,
                      lineHeight: 22,
                    }}
                    numberOfLines={2}
                  >
                    {notification.title}
                  </Text>
                  {/* Unread dot */}
                  {!notification.read && (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: colors.primary,
                        marginTop: 7,
                        flexShrink: 0,
                      }}
                    />
                  )}
                </View>
                <Text
                  numberOfLines={2}
                  style={{
                    color: colors.textSecondary,
                    fontSize: fontSize.sm,
                    marginTop: 3,
                    lineHeight: 20,
                  }}
                >
                  {notification.content}
                </Text>
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: fontSize.xs,
                    marginTop: spacing.xs,
                  }}
                >
                  {notification.time}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Empty state */}
      {!isLoading && filteredNotifications.length === 0 && (
        search || activeFilter !== 'all' ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg }}>
            Không tìm thấy thông báo phù hợp.
          </Text>
        ) : (
          <EmptyState
            icon={<Bell size={48} color={colors.primary} />}
            title="Chưa có thông báo"
            description="Thông báo đặt xe, chat và hệ thống sẽ hiển thị tại đây."
          />
        )
      )}

      {/* Load more */}
      {!isLoading && !search.trim() && activeFilter === 'all' && hasMore && (
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
          <Button
            label={isLoadingMore ? 'Đang tải thêm...' : 'Tải thêm thông báo'}
            onPress={loadMoreNotifications}
            variant="outline"
            loading={isLoadingMore}
            disabled={isLoadingMore}
          />
        </View>
      )}
    </Screen>
  );
}
