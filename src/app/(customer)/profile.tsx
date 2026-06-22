import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import {
  Bell,
  Camera,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  DollarSign,
  Info,
  LayoutGrid,
  LayoutList,
  LogOut,
  Mail,
  MapPin,
  Moon,
  Phone,
  Shield,
  User,
  Users,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Avatar, Button, TextInput } from '@/components/BaseComponents';
import { AuthRequired } from '@/components/AuthRequired';
import { Screen } from '@/components/ScreenComponents';
import { BookingCard } from '@/components/FeatureCards';
import {
  BookingListControls,
  BookingSortMode,
  BookingStatusFilter,
  filterAndSortBookings,
} from '@/components/BookingListControls';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { useBooking } from '@/hooks/useBooking';
import { apiClient } from '@/services/api';
import { uploadMediaToCloudinary } from '@/services/cloudinary';
import { DAIGO_LOGO_URL, APP_NAME, APP_TAGLINE } from '@/constants/branding';
import { showError, showInfo, showSuccess, showWarning } from '@/utils/toast';
import { Booking } from '@/types';
import { formatCurrency, formatVietnamDate, getBookingStatusInfo } from '@/utils/helpers';
import { registerPushNotifications } from '@/services/pushNotifications';
import { getCurrentDeviceLocation } from '@/services/deviceLocation';

type HistoryLayoutMode = 'card' | 'list';

// ─── Layout toggle ──────────────────────────────────────────────────────────
function HistoryLayoutToggle({
  mode,
  onChange,
}: {
  mode: HistoryLayoutMode;
  onChange: (mode: HistoryLayoutMode) => void;
}) {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(mode === 'card' ? 0 : 1)).current;

  const selectMode = (next: HistoryLayoutMode) => {
    Animated.spring(slideAnim, {
      toValue: next === 'card' ? 0 : 1,
      useNativeDriver: false,
      tension: 120,
      friction: 8,
    }).start();
    onChange(next);
  };

  const translateX = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [2, 34] });

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surfaceAlt,
        borderRadius: borderRadius.full,
        padding: 2,
        width: 72,
        height: 34,
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 2,
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: colors.primary,
          transform: [{ translateX }],
        }}
      />
      <TouchableOpacity
        onPress={() => selectMode('card')}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
      >
        <LayoutGrid size={15} color={mode === 'card' ? 'white' : colors.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => selectMode('list')}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
      >
        <LayoutList size={15} color={mode === 'list' ? 'white' : colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Booking list row ────────────────────────────────────────────────────────
function CustomerBookingListRow({ booking, onPress }: { booking: Booking; onPress: () => void }) {
  const { colors } = useTheme();
  const statusInfo = getBookingStatusInfo(booking.status);
  const price = booking.actualPrice ?? booking.estimatedPrice ?? 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.84}
      style={{
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: `${statusInfo.color}18`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: statusInfo.color }} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.xs,
            marginBottom: spacing.xs,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '900', flex: 1 }} numberOfLines={1}>
            {booking.bookingCode ?? 'Chuyến đi'}
          </Text>
          <View
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: 3,
              borderRadius: borderRadius.full,
              backgroundColor: statusInfo.color,
            }}
          >
            <Text style={{ color: 'white', fontSize: 10, fontWeight: '800' }}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <View style={{ gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <MapPin size={12} color={colors.primary} />
            <Text
              style={{ color: colors.textSecondary, fontSize: fontSize.xs, flex: 1 }}
              numberOfLines={1}
            >
              {booking.pickupLocation}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <MapPin size={12} color={colors.error} />
            <Text
              style={{ color: colors.textSecondary, fontSize: fontSize.xs, flex: 1 }}
              numberOfLines={1}
            >
              {booking.dropoffLocation}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Clock size={11} color={colors.textTertiary} />
            <Text style={{ color: colors.textTertiary, fontSize: 10 }}>
              {formatVietnamDate(booking.date)} - {booking.time}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Users size={11} color={colors.textTertiary} />
            <Text style={{ color: colors.textTertiary, fontSize: 10 }}>{booking.passengers}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <DollarSign size={11} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '900' }}>
              {formatCurrency(price)}
            </Text>
          </View>
        </View>
      </View>

      <ChevronRight size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

// ─── Section header (collapsible) ────────────────────────────────────────────
function SectionHeader({
  title,
  expanded,
  onToggle,
  noBorderTop,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  noBorderTop?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: 14,
        backgroundColor: colors.background,
        borderTopWidth: noBorderTop ? 0 : 8,
        borderTopColor: colors.surfaceAlt,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', letterSpacing: 0.3 }}>
        {title}
      </Text>
      {expanded ? (
        <ChevronUp size={18} color={colors.textSecondary} />
      ) : (
        <ChevronDown size={18} color={colors.textSecondary} />
      )}
    </TouchableOpacity>
  );
}

// ─── Flat row item ────────────────────────────────────────────────────────────
function FlatRow({
  icon,
  label,
  value,
  rightNode,
  onPress,
  isLast,
  destructive,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string;
  rightNode?: React.ReactNode;
  onPress?: () => void;
  isLast?: boolean;
  destructive?: boolean;
}) {
  const { colors } = useTheme();
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: 15,
        backgroundColor: colors.surface,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border,
        gap: spacing.md,
      }}
    >
      {icon && (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </View>
      )}
      <Text
        style={{
          flex: 1,
          color: destructive ? colors.error : colors.text,
          fontSize: fontSize.base,
          fontWeight: '500',
        }}
      >
        {label}
      </Text>
      {value ? (
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{value}</Text>
      ) : null}
      {rightNode ?? (onPress ? <ChevronRight size={16} color={colors.textTertiary} /> : null)}
    </Wrapper>
  );
}

// ─── Toggle row ────────────────────────────────────────────────────────────────
function ToggleRow({
  icon,
  label,
  description,
  value,
  onValueChange,
  isLast,
}: {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isLast?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: 14,
        backgroundColor: colors.surface,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border,
        gap: spacing.md,
      }}
    >
      {icon && (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: fontSize.base, fontWeight: '500' }}>
          {label}
        </Text>
        {description ? (
          <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 2 }}>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor="white"
        trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
      />
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const { colors, isDark, toggleTheme } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();
  const { setUser } = useAuthStore();
  const { bookings, fetchBookings } = useBooking();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  const [visibleBookingCount, setVisibleBookingCount] = useState(6);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<BookingStatusFilter>('all');
  const [historySortMode, setHistorySortMode] = useState<BookingSortMode>('newest');
  const [historyFiltersExpanded, setHistoryFiltersExpanded] = useState(false);
  const [historyLayoutMode, setHistoryLayoutMode] = useState<HistoryLayoutMode>('card');

  // Collapsible section states
  const [editExpanded, setEditExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [settingsExpanded, setSettingsExpanded] = useState(true);
  const [aboutExpanded, setAboutExpanded] = useState(false);

  const filteredBookings = React.useMemo(
    () => filterAndSortBookings(bookings, historyQuery, historyStatusFilter, historySortMode),
    [bookings, historyQuery, historyStatusFilter, historySortMode],
  );

  const activeHistoryFilterCount = [
    historyQuery,
    historyStatusFilter !== 'all' ? historyStatusFilter : '',
    historySortMode !== 'newest' ? historySortMode : '',
  ].filter(Boolean).length;

  useEffect(() => {
    if (user?.id) fetchBookings({ customerId: user.id });
  }, [user?.id, fetchBookings]);

  useEffect(() => {
    let mounted = true;
    if (!user?.id) return;
    apiClient
      .getProfileSettings(user.id)
      .then((settings) => {
        if (!mounted) return;
        setPushEnabled(settings.pushEnabled);
        setSmsEnabled(settings.smsEnabled);
        setLocationEnabled(settings.locationSharingEnabled);
      })
      .catch((error) => {
        if (__DEV__) console.warn('Không thể tải cài đặt hồ sơ', error);
      });
    return () => { mounted = false; };
  }, [user?.id]);

  useEffect(() => {
    setFullName(user?.fullName ?? '');
    setEmail(user?.email ?? '');
    setPhone(user?.phone ?? '');
    setAddress(user?.address ?? '');
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    router.replace('/(customer)/home');
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      setSaving(true);
      const updated = await apiClient.updateProfile(user.id, {
        fullName,
        phone,
        address,
        avatarUrl: user.avatarUrl,
      });
      setUser(updated);
      showSuccess('Đã lưu hồ sơ', 'Thông tin hồ sơ của bạn đã được cập nhật.');
    } catch (error: any) {
      showError('Không thể lưu hồ sơ', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAvatar = async () => {
    if (!user) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showWarning('Cần quyền truy cập ảnh', 'Vui lòng cho phép ứng dụng truy cập thư viện ảnh.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.82,
      });
      if (result.canceled || !result.assets[0]) return;
      setUploadingAvatar(true);
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() || 'jpg';
      const uploaded = await uploadMediaToCloudinary(
        { uri: asset.uri, name: `avatar-${user.id}.${ext}`, type: asset.mimeType || 'image/jpeg' },
        'image',
      );
      const updated = await apiClient.updateProfile(user.id, { avatarUrl: uploaded.secure_url });
      setUser(updated);
      showSuccess('Đã cập nhật avatar', 'Ảnh đại diện mới đã được lưu.');
    } catch (error: any) {
      showError('Không thể upload avatar', error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePushToggle = async (next: boolean) => {
    if (!user) return;
    if (!next) {
      try {
        await apiClient.disablePushTokens(user.id);
        await apiClient.updateProfileSettings(user.id, { pushEnabled: false });
        setPushEnabled(false);
      } catch (error: any) {
        showError('Không thể tắt thông báo', error.message);
      }
      return;
    }
    try {
      const token = await registerPushNotifications(user.id);
      if (!token) { setPushEnabled(false); return; }
      setPushEnabled(true);
      await apiClient.updateProfileSettings(user.id, { pushEnabled: true });
    } catch (error: any) {
      setPushEnabled(false);
      showError('Không thể bật thông báo', error.message);
    }
  };

  const handleLocationToggle = async (next: boolean) => {
    if (!user) return;
    if (!next) {
      try {
        await apiClient.updateProfileSettings(user.id, { locationSharingEnabled: false });
        setLocationEnabled(false);
      } catch (error: any) {
        showError('Không thể lưu cài đặt', error.message);
      }
      return;
    }
    try {
      const location = await getCurrentDeviceLocation();
      await apiClient.updateProfileSettings(user.id, { locationSharingEnabled: true });
      setLocationEnabled(true);
      showSuccess('Đã bật chia sẻ vị trí', location.label);
    } catch (error: any) {
      setLocationEnabled(false);
      showError('Không thể bật vị trí', error.message);
    }
  };

  const handleSmsToggle = async (next: boolean) => {
    if (!user) return;
    try {
      await apiClient.updateProfileSettings(user.id, { smsEnabled: next });
      setSmsEnabled(next);
    } catch (error: any) {
      showError('Không thể lưu cài đặt', error.message);
    }
  };

  if (!isAuthenticated) {
    return <AuthRequired description="Bạn cần đăng nhập để xem và chỉnh sửa hồ sơ." />;
  }

  const initials =
    user?.fullName
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'KH';

  return (
    <Screen scroll onRefresh={() => { if (user?.id) fetchBookings({ customerId: user.id }); }}>

      {/* ── AVATAR HEADER ─────────────────────────────────────────────── */}
      <View
        style={{
          alignItems: 'center',
          paddingTop: spacing.xl,
          paddingBottom: spacing.lg,
          backgroundColor: colors.surface,
          borderBottomWidth: 8,
          borderBottomColor: colors.surfaceAlt,
        }}
      >
        <View style={{ position: 'relative', marginBottom: spacing.md }}>
          <Avatar
            source={user?.avatarUrl ? { uri: user.avatarUrl } : undefined}
            initials={initials}
            size="lg"
          />
          <TouchableOpacity
            onPress={handleUploadAvatar}
            disabled={uploadingAvatar}
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: colors.surface,
            }}
          >
            <Camera size={14} color="white" />
          </TouchableOpacity>
        </View>

        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
          {user?.fullName}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 }}>
          {user?.email}
        </Text>
        <View
          style={{
            marginTop: spacing.sm,
            paddingHorizontal: spacing.md,
            paddingVertical: 4,
            borderRadius: borderRadius.full,
            backgroundColor: user?.emailVerified ? colors.success + '18' : colors.warning + '18',
          }}
        >
          <Text
            style={{
              fontSize: fontSize.xs,
              fontWeight: '700',
              color: user?.emailVerified ? colors.success : colors.warning,
            }}
          >
            {user?.emailVerified ? '✓ Email đã xác thực' : '⚠ Email chưa xác thực'}
          </Text>
        </View>
        {(!user?.emailVerified || !user?.phoneVerified) && (
        <View
          style={{
            marginTop: spacing.md,
            alignSelf: 'stretch',
            backgroundColor: colors.warning + '12',
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.warning + '55',
          }}
        >
          {!user?.emailVerified && (
            <View style={{ padding: spacing.md, borderBottomWidth: !user?.phoneVerified ? 1 : 0, borderBottomColor: colors.warning + '35' }}>
              <Text style={{ color: colors.text, fontWeight: '900' }}>Email chưa được xác thực</Text>
              <Text style={{ color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 20 }}>
                Xác thực email để bảo vệ tài khoản và nhận thông báo quan trọng.
              </Text>
              <Button
                label="Xác thực email"
                onPress={() => router.push({ pathname: '/(auth)/verify-email' as any, params: { email: user?.email } })}
                variant="outline"
                size="sm"
                style={{ marginTop: spacing.sm }}
              />
            </View>
          )}
          {!user?.phoneVerified && (
            <View style={{ padding: spacing.md }}>
              <Text style={{ color: colors.text, fontWeight: '900' }}>Số điện thoại chưa được xác thực</Text>
              <Text style={{ color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 20 }}>
                Xác thực SĐT để đặt xe, chat, gọi tài xế và thanh toán an toàn hơn.
              </Text>
              <Button
                label="Xác thực SĐT"
                onPress={() => router.push({ pathname: '/(auth)/phone-otp' as any, params: { redirectTo: '/(customer)/profile' } })}
                size="sm"
                style={{ marginTop: spacing.sm }}
              />
            </View>
          )}
        </View>
        )}
      </View>

      {/* ── CHỈNH SỬA HỒ SƠ (collapsible) ──────────────────────────── */}
      <SectionHeader
        title="CHỈNH SỬA HỒ SƠ"
        expanded={editExpanded}
        onToggle={() => setEditExpanded((v) => !v)}
        noBorderTop
      />
      {editExpanded && (
        <View style={{ backgroundColor: colors.surface, borderBottomWidth: 8, borderBottomColor: colors.surfaceAlt }}>
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.md }}>
            <TextInput
              label="Họ và tên"
              value={fullName}
              onChangeText={setFullName}
              icon={<User size={18} color={colors.textSecondary} />}
            />
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              icon={<Mail size={18} color={colors.textSecondary} />}
              disabled
            />
            <TextInput
              label="Số điện thoại"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              icon={<Phone size={18} color={colors.textSecondary} />}
            />
            <TextInput
              label="Địa chỉ thường dùng"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={2}
            />
            <Button label="Lưu hồ sơ" onPress={handleSave} loading={saving} />
          </View>
        </View>
      )}

      {/* ── LỊCH SỬ CHUYẾN ĐI (collapsible) ─────────────────────────── */}
      <SectionHeader
        title={`LỊCH SỬ CHUYẾN ĐI  ${filteredBookings.length > 0 ? `(${filteredBookings.length})` : ''}`}
        expanded={historyExpanded}
        onToggle={() => setHistoryExpanded((v) => !v)}
      />
      {historyExpanded && (
        <View style={{ backgroundColor: colors.background, borderBottomWidth: 8, borderBottomColor: colors.surfaceAlt }}>
          {/* Controls bar */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm,
              backgroundColor: colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>
              {filteredBookings.length} chuyến
              {activeHistoryFilterCount > 0 ? ' (đã lọc)' : ''}
            </Text>
            <HistoryLayoutToggle mode={historyLayoutMode} onChange={setHistoryLayoutMode} />
          </View>

          <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <BookingListControls
              query={historyQuery}
              onQueryChange={setHistoryQuery}
              statusFilter={historyStatusFilter}
              onStatusFilterChange={setHistoryStatusFilter}
              sortMode={historySortMode}
              onSortModeChange={setHistorySortMode}
              expanded={historyFiltersExpanded}
              onExpandedChange={setHistoryFiltersExpanded}
              activeCount={activeHistoryFilterCount}
              onReset={() => {
                setHistoryQuery('');
                setHistoryStatusFilter('all');
                setHistorySortMode('newest');
              }}
            />
          </View>

          {filteredBookings.length === 0 ? (
            <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                Không tìm thấy chuyến đi phù hợp.
              </Text>
            </View>
          ) : (
            <>
              {filteredBookings.slice(0, visibleBookingCount).map((booking) => {
                const openDetail = () =>
                  router.push({
                    pathname: '/(customer)/booking-detail' as any,
                    params: { id: booking.id },
                  });
                return historyLayoutMode === 'card' ? (
                  <View key={booking.id} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
                    <BookingCard {...booking} onPress={openDetail} />
                  </View>
                ) : (
                  <CustomerBookingListRow key={booking.id} booking={booking} onPress={openDetail} />
                );
              })}
              {filteredBookings.length > visibleBookingCount && (
                <TouchableOpacity
                  onPress={() => setVisibleBookingCount((c) => c + 6)}
                  style={{
                    paddingVertical: spacing.md,
                    alignItems: 'center',
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    backgroundColor: colors.surface,
                  }}
                >
                  <Text style={{ color: colors.primary, fontWeight: '700', fontSize: fontSize.sm }}>
                    Xem thêm {filteredBookings.length - visibleBookingCount} chuyến
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}

      {/* ── CÀI ĐẶT (collapsible) ────────────────────────────────────── */}
      <SectionHeader
        title="CÀI ĐẶT"
        expanded={settingsExpanded}
        onToggle={() => setSettingsExpanded((v) => !v)}
      />
      {settingsExpanded && (
        <View style={{ borderBottomWidth: 8, borderBottomColor: colors.surfaceAlt }}>
          <ToggleRow
            icon={<Bell size={18} color={colors.primary} />}
            label="Nhận thông báo"
            description="Push notification chuyến đi, tài xế"
            value={pushEnabled}
            onValueChange={handlePushToggle}
          />
          <ToggleRow
            icon={<Phone size={18} color={colors.info} />}
            label="Nhắc lịch chuyến đi"
            description="Thông báo trong app / push"
            value={smsEnabled}
            onValueChange={handleSmsToggle}
          />
          <ToggleRow
            icon={<Shield size={18} color={colors.success} />}
            label="Chia sẻ vị trí khi đặt xe"
            description="Giúp tài xế đón bạn chính xác hơn"
            value={locationEnabled}
            onValueChange={handleLocationToggle}
          />
          <ToggleRow
            icon={<Moon size={18} color={colors.warning} />}
            label="Giao diện tối"
            description="Dark / Light mode"
            value={isDark}
            onValueChange={toggleTheme}
            isLast
          />
        </View>
      )}

      {/* ── VỀ ỨNG DỤNG (collapsible) ────────────────────────────────── */}
      <SectionHeader
        title="VỀ ỨNG DỤNG"
        expanded={aboutExpanded}
        onToggle={() => setAboutExpanded((v) => !v)}
      />
      {aboutExpanded && (
        <View style={{ borderBottomWidth: 8, borderBottomColor: colors.surfaceAlt }}>
          {/* Logo mini */}
          <View
            style={{
              alignItems: 'center',
              paddingVertical: spacing.lg,
              backgroundColor: colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Image
              source={{ uri: DAIGO_LOGO_URL }}
              style={{ width: 120, height: 48, resizeMode: 'contain', marginBottom: spacing.sm }}
            />
            <Text style={{ color: colors.text, fontWeight: '700' }}>{APP_NAME}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>
              {APP_TAGLINE}
            </Text>
          </View>

          {[
            { label: 'Phiên bản', value: '1.0.0' },
            { label: 'Hỗ trợ', value: 'support@daigobooking.vn' },
            { label: 'Hotline', value: '1900 8888' },
            { label: 'Website', value: 'daigobooking.vn' },
          ].map((item, index, arr) => (
            <FlatRow
              key={item.label}
              label={item.label}
              value={item.value}
              isLast={index === arr.length - 1}
            />
          ))}

          {[
            { label: 'Chính sách bảo mật', key: 'Chính sách bảo mật' },
            { label: 'Điều khoản dịch vụ', key: 'Điều khoản dịch vụ' },
          ].map((item) => (
            <FlatRow
              key={item.key}
              label={item.label}
              onPress={() => { setSelectedItem(item.key); setModalVisible(true); }}
            />
          ))}
        </View>
      )}

      {/* ── ĐĂNG XUẤT ───────────────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={handleLogout}
        activeOpacity={0.8}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          paddingVertical: 17,
          backgroundColor: colors.surface,
          borderTopWidth: 8,
          borderTopColor: colors.surfaceAlt,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          marginBottom: spacing.xl,
        }}
      >
        <LogOut size={18} color={colors.error} />
        <Text style={{ color: colors.error, fontWeight: '800', fontSize: fontSize.base }}>
          Đăng xuất
        </Text>
      </TouchableOpacity>

      {/* ── MODAL About ─────────────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={{
              width: '85%',
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              padding: spacing.lg,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing.md,
              }}
            >
              <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}>
                {selectedItem}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20 }}>
                {selectedItem === 'Chính sách bảo mật' &&
                  'Xem chi tiết Chính sách bảo mật trong phần Cài đặt hoặc trên website daigobooking.vn'}
                {selectedItem === 'Điều khoản dịch vụ' &&
                  'Xem chi tiết Điều khoản dịch vụ trong phần Cài đặt hoặc trên website daigobooking.vn'}
              </Text>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}
