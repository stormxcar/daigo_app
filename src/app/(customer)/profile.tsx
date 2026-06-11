import React, { useMemo, useState } from 'react';
import { Alert, Switch, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Bell, ChevronRight, Info, LogOut, Mail, Phone, Shield, User } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Avatar, Button, Card, TextInput } from '@/components/BaseComponents';
import { AuthRequired } from '@/components/AuthRequired';
import { Screen } from '@/components/ScreenComponents';
import { BookingCard } from '@/components/FeatureCards';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { MOCK_BOOKINGS } from '@/services/mockData';

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();
  const { setUser } = useAuthStore();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [address, setAddress] = useState('Vinhomes Ocean Park, Gia Lâm, Hà Nội');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  const customerBookings = useMemo(
    () =>
      MOCK_BOOKINGS.filter(
        (booking) => booking.customerId === user?.id || booking.customerEmail === user?.email
      ),
    [user?.email, user?.id]
  );

  const handleLogout = () => {
    logout();
    router.replace('/(customer)/home');
  };

  const handleSave = () => {
    if (!user) return;

    setUser({
      ...user,
      fullName,
      email,
      phone,
      updatedAt: new Date().toISOString(),
    });
    Alert.alert('Đã lưu', 'Thông tin hồ sơ của bạn đã được cập nhật.');
  };

  if (!isAuthenticated) {
    return <AuthRequired description="Bạn cần đăng nhập để xem và chỉnh sửa hồ sơ." />;
  }

  return (
    <Screen scroll padding>
      <Card style={{ marginBottom: spacing.lg, alignItems: 'center' }}>
        <Avatar
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
        <Button label="Lưu hồ sơ" onPress={handleSave} />
      </Card>

      <View style={{ marginBottom: spacing.lg }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm }}>
          Lịch sử chuyến đi
        </Text>
        {customerBookings.map((booking) => (
          <BookingCard key={booking.id} {...booking} />
        ))}
        {customerBookings.length === 0 && (
          <Card>
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
              Bạn chưa có chuyến đi nào.
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
            onValueChange: setPushEnabled,
            icon: <Bell size={20} color={colors.primary} />,
          },
          {
            label: 'Nhận SMS nhắc lịch',
            description: 'Gửi tin nhắn trước giờ khởi hành',
            value: smsEnabled,
            onValueChange: setSmsEnabled,
            icon: <Phone size={20} color={colors.info} />,
          },
          {
            label: 'Chia sẻ vị trí khi đặt xe',
            description: 'Giúp tài xế đón bạn chính xác hơn',
            value: locationEnabled,
            onValueChange: setLocationEnabled,
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

      <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: borderRadius.full,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Info size={22} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>
              Về ứng dụng
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              VF7 Booking Mobile
            </Text>
          </View>
        </View>
        <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>
          Ứng dụng đặt xe điện cao cấp giúp khách hàng tìm xe theo ngày, giờ, số người,
          quản lý chuyến đi, trò chuyện với tài xế và nhận thông báo trạng thái chuyến đi.
        </Text>
        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          {['Phiên bản 1.0.0', 'Hỗ trợ: support@vf7booking.vn', 'Hotline: 1900 8888'].map((text) => (
            <View key={text} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <ChevronRight size={16} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: fontSize.sm }}>{text}</Text>
            </View>
          ))}
        </View>
      </Card>

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
