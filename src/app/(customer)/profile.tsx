import React, { useEffect, useState } from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Bell, Camera, ChevronRight, Clock, DollarSign, Info, LayoutGrid, LayoutList, LogOut, Mail, MapPin, Phone, Shield, User, Users, X } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Avatar, Button, Card, TextInput } from '@/components/BaseComponents';
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

function HistoryLayoutToggle({ mode, onChange }: { mode: HistoryLayoutMode; onChange: (mode: HistoryLayoutMode) => void }) {
  const { colors } = useTheme();
  const slideAnim = React.useRef(new Animated.Value(mode === 'card' ? 0 : 1)).current;

  const selectMode = (next: HistoryLayoutMode) => {
    Animated.spring(slideAnim, {
      toValue: next === 'card' ? 0 : 1,
      useNativeDriver: false,
      tension: 120,
      friction: 8,
    }).start();
    onChange(next);
  };

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 34],
  });

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
      <TouchableOpacity onPress={() => selectMode('card')} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <LayoutGrid size={15} color={mode === 'card' ? 'white' : colors.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => selectMode('list')} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        <LayoutList size={15} color={mode === 'list' ? 'white' : colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

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
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: `${statusInfo.color}22`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: statusInfo.color }} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs, marginBottom: spacing.xs }}>
          <Text style={{ color: colors.text, fontWeight: '900', flex: 1 }} numberOfLines={1}>
            {booking.bookingCode ?? 'Chuyến đi'}
          </Text>
          <View style={{ paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.full, backgroundColor: statusInfo.color }}>
            <Text style={{ color: 'white', fontSize: 10, fontWeight: '800' }}>{statusInfo.label}</Text>
          </View>
        </View>

        <View style={{ gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <MapPin size={12} color={colors.primary} />
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, flex: 1 }} numberOfLines={1}>
              {booking.pickupLocation}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <MapPin size={12} color={colors.error} />
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, flex: 1 }} numberOfLines={1}>
              {booking.dropoffLocation}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm }}>
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
            <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '900' }}>{formatCurrency(price)}</Text>
          </View>
        </View>
      </View>

      <ChevronRight size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

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
  const filteredBookings = React.useMemo(
    () => filterAndSortBookings(bookings, historyQuery, historyStatusFilter, historySortMode),
    [bookings, historyQuery, historyStatusFilter, historySortMode]
  );
  const activeHistoryFilterCount = [
    historyQuery,
    historyStatusFilter !== 'all' ? historyStatusFilter : '',
    historySortMode !== 'newest' ? historySortMode : '',
  ].filter(Boolean).length;

  const refreshProfile = () => {
    if (user?.id) fetchBookings({ customerId: user.id });
  };

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

    return () => {
      mounted = false;
    };
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
      const uploaded = await uploadMediaToCloudinary({
        uri: asset.uri,
        name: `avatar-${user.id}.${ext}`,
        type: asset.mimeType || 'image/jpeg',
      }, 'image');
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
        showSuccess('Đã tắt thông báo', 'Bạn sẽ không nhận push notification trên thiết bị này.');
      } catch (error: any) {
        showError('Không thể tắt thông báo', error.message || 'Vui lòng thử lại sau.');
      }
      return;
    }

    try {
      const token = await registerPushNotifications(user.id);
      if (!token) {
        setPushEnabled(false);
        showWarning('Chưa bật được thông báo', 'Push notification thật cần chạy trên APK hoặc development build, không phải Expo Go.');
        return;
      }
      setPushEnabled(true);
      await apiClient.updateProfileSettings(user.id, { pushEnabled: true });
      showSuccess('Đã bật thông báo', 'Thiết bị này sẽ nhận thông báo booking/chat.');
    } catch (error: any) {
      setPushEnabled(false);
      showError('Không thể bật thông báo', error.message || 'Vui lòng kiểm tra quyền thông báo trên thiết bị.');
    }
  };

  const handleLocationToggle = async (next: boolean) => {
    if (!user) return;

    if (!next) {
      try {
        await apiClient.updateProfileSettings(user.id, { locationSharingEnabled: false });
        setLocationEnabled(false);
        showInfo('Đã tắt chia sẻ vị trí', 'App sẽ không tự lấy GPS làm điểm đón cho đến khi bạn bật lại.');
      } catch (error: any) {
        showError('Không thể lưu cài đặt', error.message || 'Vui lòng thử lại sau.');
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
      showError('Không thể bật vị trí', error.message || 'Vui lòng cấp quyền GPS trong cài đặt thiết bị.');
    }
  };

  const handleSmsToggle = async (next: boolean) => {
    if (!user) return;
    try {
      await apiClient.updateProfileSettings(user.id, { smsEnabled: next });
      setSmsEnabled(next);
      if (next) {
        showInfo('Đã bật nhắc lịch trong app', 'SMS thật cần tích hợp nhà cung cấp SMS riêng, hiện app sẽ ưu tiên thông báo trong app/push.');
      } else {
        showInfo('Đã tắt nhắc lịch', 'Bạn có thể bật lại bất cứ lúc nào.');
      }
    } catch (error: any) {
      showError('Không thể lưu cài đặt', error.message || 'Vui lòng thử lại sau.');
    }
  };

  if (!isAuthenticated) {
    return <AuthRequired description="Bạn cần đăng nhập để xem và chỉnh sửa hồ sơ." />;
  }

  return (
    <Screen scroll onRefresh={refreshProfile}>
      <Card style={{ marginBottom: spacing.lg, alignItems: 'center' }}>
        <Avatar
          source={user?.avatarUrl ? { uri: user.avatarUrl } : undefined}
          initials={
            user?.fullName
              ?.split(' ')
              .map((name) => name[0])
              .join('')
              .toUpperCase() || 'KH'
          }
          size="lg"
          style={{ marginBottom: spacing.md }}
        />
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>
          {user?.fullName}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs }}>
          {user?.email}
        </Text>
        <Text style={{ color: user?.emailVerified ? colors.success : colors.warning, fontSize: fontSize.xs, marginTop: spacing.xs, fontWeight: '700' }}>
          {user?.emailVerified ? 'Email đã xác thực' : 'Email chưa xác thực'}
        </Text>
        <Button
          label="Upload avatar"
          onPress={handleUploadAvatar}
          loading={uploadingAvatar}
          variant="outline"
          size="sm"
          icon={<Camera size={16} color={colors.primary} />}
          style={{ marginTop: spacing.md }}
        />
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.md }}>
          Chỉnh sửa hồ sơ
        </Text>
        <TextInput
          label="Họ và tên"
          value={fullName}
          onChangeText={setFullName}
          icon={<User size={20} color={colors.textSecondary} />}
          style={{ marginBottom: spacing.md }}
        />
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          icon={<Mail size={20} color={colors.textSecondary} />}
          disabled
          style={{ marginBottom: spacing.md }}
        />
        <TextInput
          label="Số điện thoại"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          icon={<Phone size={20} color={colors.textSecondary} />}
          style={{ marginBottom: spacing.md }}
        />
        <TextInput
          label="Địa chỉ thường dùng"
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={3}
          style={{ marginBottom: spacing.lg }}
        />
        <Button label="Lưu hồ sơ" onPress={handleSave} loading={saving} />
      </Card>

      <View style={{ marginBottom: spacing.lg, paddingHorizontal: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
              Lịch sử chuyến đi
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>
              {filteredBookings.length} chuyến {activeHistoryFilterCount > 0 ? '(đã lọc)' : ''}
            </Text>
          </View>
          <HistoryLayoutToggle mode={historyLayoutMode} onChange={setHistoryLayoutMode} />
        </View>
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
        {filteredBookings.slice(0, visibleBookingCount).map((booking) => {
          const openDetail = () =>
            router.push({ pathname: '/(customer)/booking-detail' as any, params: { id: booking.id } });
          return historyLayoutMode === 'card' ? (
            <BookingCard key={booking.id} {...booking} onPress={openDetail} />
          ) : (
            <CustomerBookingListRow key={booking.id} booking={booking} onPress={openDetail} />
          );
        })}
        {filteredBookings.length > visibleBookingCount && (
          <Button
            label="Tải thêm chuyến đi"
            onPress={() => setVisibleBookingCount((current) => current + 6)}
            variant="outline"
          />
        )}
        {filteredBookings.length === 0 && (
          <Card>
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
              Không tìm thấy chuyến đi phù hợp.
            </Text>
          </Card>
        )}
      </View>

      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.md }}>
          Cài đặt
        </Text>
        {[
          {
            label: 'Nhận thông báo chuyến đi',
            description: 'Cập nhật trạng thái đặt xe và tài xế',
            value: pushEnabled,
            onValueChange: handlePushToggle,
            icon: <Bell size={20} color={colors.primary} />,
          },
          {
            label: 'Nhắc lịch chuyến đi',
            description: 'Ưu tiên thông báo trong app/push, SMS cần nhà cung cấp riêng',
            value: smsEnabled,
            onValueChange: handleSmsToggle,
            icon: <Phone size={20} color={colors.info} />,
          },
          {
            label: 'Chia sẻ vị trí khi đặt xe',
            description: 'Giúp tài xế đón bạn chính xác hơn',
            value: locationEnabled,
            onValueChange: handleLocationToggle,
            icon: <Shield size={20} color={colors.success} />,
          },
          {
            label: 'Giao diện tối',
            description: 'Chuyển dark/light theme toàn ứng dụng',
            value: isDark,
            onValueChange: toggleTheme,
            icon: <Info size={20} color={colors.warning} />,
          },
        ].map((item) => (
          <View
            key={item.label}
            style={{
              paddingVertical: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: borderRadius.full,
                backgroundColor: colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {item.icon}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{item.label}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.xs }}>
                {item.description}
              </Text>
            </View>
            <Switch
              value={item.value}
              onValueChange={item.onValueChange}
              thumbColor="white"
              trackColor={{ false: colors.surfaceAlt, true: colors.primary }}
            />
          </View>
        ))}
      </Card>

      <View style={{ marginBottom: spacing.lg }}>
        {/* About logo header */}
        <View
          style={{
            alignItems: 'center',
            paddingVertical: spacing.xl,
            backgroundColor: colors.surface,
            borderRadius: borderRadius.lg,
            marginBottom: spacing.md,
          }}
        >
          <Image
            source={{ uri: DAIGO_LOGO_URL }}
            style={{
              width: 160,
              height: 70,
              resizeMode: 'contain',
              marginBottom: spacing.md,
            }}
          />
          <View
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: borderRadius.full,
              marginBottom: spacing.sm,
            }}
          >
            <Text style={{ color: 'white', fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>
              VỀ ỨNG DỤNG
            </Text>
          </View>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
            {APP_NAME}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: spacing.xs }}>
            {APP_TAGLINE}
          </Text>
        </View>
        <Card>
          <Text style={{ color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.md }}>
            Ứng dụng đặt xe điện cao cấp giúp khách hàng tìm xe theo ngày, giờ, số người,
            quản lý chuyến đi, trò chuyện với tài xế và nhận thông báo trạng thái chuyến đi.
          </Text>
          <View style={{ gap: spacing.sm }}>
            {['Phiên bản 1.0.0', 'Hỗ trợ: support@daigobooking.vn', 'Hotline: 1900 8888', 'Website: https://daigobooking.vn', 'Chính sách bảo mật', 'Điều khoản dịch vụ', 'Công nghệ: React Native, Expo, Supabase'].map((text) => (
              <TouchableOpacity key={text} onPress={() => { setSelectedItem(text); setModalVisible(true); }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <ChevronRight size={16} color={colors.primary} />
                  <Text style={{ color: colors.text, fontSize: fontSize.sm }}>{text}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      </View>

{/* Modal for About App details */}
<Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
  <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setModalVisible(false)}>
    <View style={{ width: '85%', backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: '700' }}>{selectedItem}</Text>
        <TouchableOpacity onPress={() => setModalVisible(false)}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      <ScrollView>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20 }}>
          {selectedItem === 'Phiên bản 1.0.0' && 'Phiên bản hiện tại: 1.0.0'}
          {selectedItem === 'Hỗ trợ: support@daigobooking.vn' && 'Liên hệ hỗ trợ qua email: support@daigobooking.vn'}
          {selectedItem === 'Hotline: 1900 8888' && 'Gọi hotline: 1900 8888 (24/7)'}
          {selectedItem === 'Website: https://daigobooking.vn' && 'Truy cập website: https://daigobooking.vn'}
          {selectedItem === 'Chính sách bảo mật' && 'Xem chi tiết Chính sách bảo mật trong phần Cài đặt hoặc trên website.'}
          {selectedItem === 'Điều khoản dịch vụ' && 'Xem chi tiết Điều khoản dịch vụ trong phần Cài đặt hoặc trên website.'}
          {selectedItem === 'Công nghệ: React Native, Expo, Supabase' && 'Ứng dụng được xây dựng bằng React Native, Expo và Supabase.'}
        </Text>
      </ScrollView>
    </View>
  </Pressable>
</Modal>

      <TouchableOpacity
        onPress={handleLogout}
        activeOpacity={0.8}
        style={{
          backgroundColor: colors.error,
          borderRadius: borderRadius.lg,
          padding: spacing.lg,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: spacing.xl,
        }}
      >
        <LogOut size={20} color="white" />
        <Text style={{ color: 'white', fontWeight: '700' }}>Đăng xuất</Text>
      </TouchableOpacity>
    </Screen>
  );
}
