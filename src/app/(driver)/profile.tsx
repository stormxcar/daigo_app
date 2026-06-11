import React, { useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Camera, CheckCircle2, LogOut, Mail, MapPin, Phone, UserCircle, XCircle } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Avatar, Badge, Button, Card, TextInput } from '@/components/BaseComponents';
import { Screen } from '@/components/ScreenComponents';
import { apiClient } from '@/services/api';
import { uploadMediaToCloudinary } from '@/services/cloudinary';
import { useAuthStore } from '@/stores/authStore';

export default function DriverProfile() {
  const { colors } = useTheme();
  const { user, logout, setUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [vehicleCount, setVehicleCount] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
  const [postCount, setPostCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName);
    setPhone(user.phone);
    setAddress(user.address ?? '');
    setAvatarUrl(user.avatarUrl ?? '');

    Promise.all([
      apiClient.getDriverVehicles(user.id),
      apiClient.getBookings({ driverId: user.id }),
      apiClient.getBlogPosts(1, 50, { driverId: user.id }),
    ])
      .then(([vehicles, bookings, posts]) => {
        setVehicleCount(vehicles.length);
        setBookingCount(bookings.length);
        setPostCount(posts.length);
      })
      .catch(() => undefined);
  }, [user?.id]);

  const initials = user?.fullName
    ?.split(' ')
    .map((name) => name[0])
    .join('')
    .toUpperCase() || 'TX';

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập ảnh', 'Vui lòng cho phép ứng dụng chọn ảnh đại diện.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
    });
    if (result.canceled || !result.assets[0]) return;

    try {
      setSaving(true);
      const asset = result.assets[0];
      const uploaded = await uploadMediaToCloudinary({
        uri: asset.uri,
        name: asset.fileName ?? `driver-avatar-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      }, 'image');
      setAvatarUrl(uploaded.secure_url);
    } catch (error: any) {
      Alert.alert('Không thể upload avatar', error.message);
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      Alert.alert('Thông tin chưa hợp lệ', 'Vui lòng nhập họ và tên.');
      return;
    }

    try {
      setSaving(true);
      const updated = await apiClient.updateProfile(user.id, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        avatarUrl,
      });
      setUser(updated);
      setEditing(false);
      Alert.alert('Đã lưu hồ sơ', 'Thông tin tài xế đã được cập nhật.');
    } catch (error: any) {
      Alert.alert('Không thể lưu hồ sơ', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <Screen scroll padding>
      <Card style={{ marginBottom: spacing.lg, alignItems: 'center' }}>
        <TouchableOpacity activeOpacity={0.84} onPress={editing ? pickAvatar : undefined} disabled={!editing || saving}>
          <View>
            <Avatar source={avatarUrl ? { uri: avatarUrl } : undefined} initials={initials} size="lg" style={{ marginBottom: spacing.md }} />
            {editing && (
              <View
                style={{
                  position: 'absolute',
                  right: -4,
                  bottom: spacing.md,
                  width: 28,
                  height: 28,
                  borderRadius: borderRadius.full,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Camera size={15} color="white" />
              </View>
            )}
          </View>
        </TouchableOpacity>

        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{user?.fullName}</Text>
        <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs }}>{user?.email}</Text>
        <View style={{ marginTop: spacing.md }}>
          <Badge label={user?.emailVerified ? 'Email đã xác thực' : 'Email chưa xác thực'} variant={user?.emailVerified ? 'success' : 'warning'} />
        </View>
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.md }}>Thông tin tài xế</Text>
        {editing ? (
          <>
            <TextInput label="Họ và tên" value={fullName} onChangeText={setFullName} disabled={saving} style={{ marginBottom: spacing.md }} />
            <TextInput label="Số điện thoại" value={phone} onChangeText={setPhone} keyboardType="phone-pad" disabled={saving} style={{ marginBottom: spacing.md }} />
            <TextInput label="Địa chỉ" value={address} onChangeText={setAddress} disabled={saving} multiline numberOfLines={3} style={{ marginBottom: spacing.md }} />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button label="Hủy" onPress={() => setEditing(false)} variant="secondary" style={{ flex: 1 }} disabled={saving} />
              <Button label="Lưu" onPress={saveProfile} loading={saving} disabled={saving} style={{ flex: 1 }} />
            </View>
          </>
        ) : (
          <>
            {[
              { icon: <Mail size={18} color={colors.primary} />, label: user?.email || 'Chưa có email' },
              { icon: <Phone size={18} color={colors.primary} />, label: user?.phone || 'Chưa có số điện thoại' },
              { icon: <MapPin size={18} color={colors.primary} />, label: user?.address || 'Chưa có địa chỉ' },
              {
                icon: user?.emailVerified ? <CheckCircle2 size={18} color={colors.success} /> : <XCircle size={18} color={colors.warning} />,
                label: user?.emailVerified ? 'Tài khoản đã xác thực email' : 'Tài khoản chưa xác thực email',
              },
            ].map((item, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
                {item.icon}
                <Text style={{ color: colors.text, flex: 1 }}>{item.label}</Text>
              </View>
            ))}
            <Button label="Chỉnh sửa hồ sơ" onPress={() => setEditing(true)} size="sm" icon={<UserCircle size={18} color="white" />} />
          </>
        )}
      </Card>

      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
        {[
          { label: 'Xe', value: vehicleCount },
          { label: 'Chuyến', value: bookingCount },
          { label: 'Bài viết', value: postCount },
        ].map((item) => (
          <Card key={item.label} style={{ flex: 1, alignItems: 'center', minHeight: 88 }}>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>{item.value}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.xs }}>{item.label}</Text>
          </Card>
        ))}
      </View>

      <Button label="Đăng xuất" onPress={handleLogout} variant="danger" icon={<LogOut size={20} color="white" />} disabled={saving} />
    </Screen>
  );
}
