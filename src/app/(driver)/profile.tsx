import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Camera, CheckCircle2, LogOut, Mail, MapPin, MessageSquareText, Phone, Star, UserCircle, XCircle } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Avatar, Badge, Button, Card, TextInput } from '@/components/BaseComponents';
import { Screen } from '@/components/ScreenComponents';
import { apiClient } from '@/services/api';
import { uploadMediaToCloudinary } from '@/services/cloudinary';
import { useAuthStore } from '@/stores/authStore';
import { showError, showSuccess, showWarning } from '@/utils/toast';
import { Booking, RatingReview } from '@/types';
import { formatVietnamDate } from '@/utils/helpers';

type RatingFilter = 'all' | '5' | '4' | '3' | '2' | '1' | 'commented';
type RatingSort = 'newest' | 'oldest';

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
  const [driverRating, setDriverRating] = useState(5);
  const [ratingCount, setRatingCount] = useState(0);
  const [ratingBuckets, setRatingBuckets] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [ratings, setRatings] = useState<RatingReview[]>([]);
  const [driverBookings, setDriverBookings] = useState<Booking[]>([]);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [ratingSort, setRatingSort] = useState<RatingSort>('newest');
  const ratingSheetRef = React.useRef<BottomSheetModal>(null);
  const ratingSnapPoints = React.useMemo(() => ['72%', '92%'], []);

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
      apiClient.getDriverStatus(user.id),
      apiClient.getRatingsForUser(user.id),
    ])
      .then(([vehicles, bookings, posts, driverStatus, ratings]) => {
        setVehicleCount(vehicles.length);
        setBookingCount(bookings.length);
        setPostCount(posts.length);
        setDriverBookings(bookings);
        setRatings(ratings);
        const averageRating = ratings.length
          ? ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length
          : Number(driverStatus?.rating ?? 5);
        setDriverRating(averageRating);
        setRatingCount(ratings.length);
        setRatingBuckets(
          ratings.reduce(
            (result, item) => ({ ...result, [item.rating]: (result[item.rating] ?? 0) + 1 }),
            { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>
          )
        );
      })
      .catch(() => undefined);
  }, [user?.id]);

  const filteredRatings = React.useMemo(() => {
    return ratings
      .filter((rating) => {
        if (ratingFilter === 'all') return true;
        if (ratingFilter === 'commented') return !!rating.comment?.trim();
        return rating.rating === Number(ratingFilter);
      })
      .sort((a, b) => {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return ratingSort === 'oldest' ? diff : -diff;
      });
  }, [ratings, ratingFilter, ratingSort]);

  const getBookingForRating = (rating: RatingReview) =>
    driverBookings.find((booking) => booking.id === rating.bookingId);

  const initials = user?.fullName
    ?.split(' ')
    .map((name) => name[0])
    .join('')
    .toUpperCase() || 'TX';

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showWarning('Cần quyền truy cập ảnh', 'Vui lòng cho phép ứng dụng chọn ảnh đại diện.');
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
      showSuccess('Đã upload avatar', 'Nhấn Lưu để cập nhật hồ sơ tài xế.');
    } catch (error: any) {
      showError('Không thể upload avatar', error.message);
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      showError('Thông tin chưa hợp lệ', 'Vui lòng nhập họ và tên.');
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
      showSuccess('Đã lưu hồ sơ', 'Thông tin tài xế đã được cập nhật.');
    } catch (error: any) {
      showError('Không thể lưu hồ sơ', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <Screen scroll>
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
          { label: 'Điểm', value: driverRating.toFixed(1), icon: <Star size={16} color={colors.warning} fill={colors.warning} /> },
        ].map((item) => (
          <Card key={item.label} style={{ flex: 1, alignItems: 'center', minHeight: 88 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {'icon' in item ? item.icon : null}
              <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>{item.value}</Text>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.xs }}>{item.label}</Text>
          </Card>
        ))}
      </View>

      <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
          <View>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Đánh giá tài xế</Text>
            <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>{ratingCount} lượt đánh giá từ khách hàng</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Star size={20} color={colors.warning} fill={colors.warning} />
              <Text style={{ color: colors.text, fontSize: 28, fontWeight: '900' }}>{driverRating.toFixed(1)}</Text>
            </View>
            <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs }}>trên 5.0</Text>
          </View>
        </View>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = ratingBuckets[star] ?? 0;
          const percent = ratingCount ? Math.round((count / ratingCount) * 100) : 0;
          return (
            <View key={star} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
              <Text style={{ color: colors.textSecondary, width: 38 }}>{star} sao</Text>
              <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
                <View style={{ width: `${percent}%`, height: '100%', backgroundColor: colors.warning }} />
              </View>
              <Text style={{ color: colors.textTertiary, width: 34, textAlign: 'right' }}>{count}</Text>
            </View>
          );
        })}
        <Button
          label="Xem tất cả đánh giá"
          onPress={() => ratingSheetRef.current?.present()}
          variant="outline"
          size="sm"
          icon={<MessageSquareText size={16} color={colors.primary} />}
          style={{ marginTop: spacing.lg }}
        />
      </Card>

      <Button label="Đăng xuất" onPress={handleLogout} variant="danger" icon={<LogOut size={20} color="white" />} disabled={saving} />

      <BottomSheetModal
        ref={ratingSheetRef}
        index={0}
        snapPoints={ratingSnapPoints}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.lg }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>Đánh giá của khách hàng</Text>
              <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
                {filteredRatings.length}/{ratings.length} đánh giá đang hiển thị
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Star size={20} color={colors.warning} fill={colors.warning} />
              <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900' }}>{driverRating.toFixed(1)}</Text>
            </View>
          </View>

          <Text style={{ color: colors.text, fontWeight: '800', marginBottom: spacing.sm }}>Lọc</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
            {[
              { key: 'all', label: 'Tất cả' },
              { key: '5', label: '5 sao' },
              { key: '4', label: '4 sao' },
              { key: '3', label: '3 sao' },
              { key: '2', label: '2 sao' },
              { key: '1', label: '1 sao' },
              { key: 'commented', label: 'Có nhận xét' },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => setRatingFilter(item.key as RatingFilter)}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: borderRadius.full,
                  backgroundColor: ratingFilter === item.key ? colors.primary : colors.surfaceAlt,
                }}
              >
                <Text style={{ color: ratingFilter === item.key ? 'white' : colors.text, fontWeight: '800', fontSize: fontSize.sm }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ color: colors.text, fontWeight: '800', marginBottom: spacing.sm }}>Sắp xếp</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
            {[
              { key: 'newest', label: 'Mới nhất' },
              { key: 'oldest', label: 'Cũ nhất' },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => setRatingSort(item.key as RatingSort)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: spacing.sm,
                  borderRadius: borderRadius.lg,
                  backgroundColor: ratingSort === item.key ? colors.primary : colors.surfaceAlt,
                }}
              >
                <Text style={{ color: ratingSort === item.key ? 'white' : colors.text, fontWeight: '800' }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredRatings.length === 0 ? (
            <Card style={{ backgroundColor: colors.surfaceAlt }}>
              <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Chưa có đánh giá phù hợp bộ lọc.</Text>
            </Card>
          ) : (
            filteredRatings.map((rating) => {
              const booking = getBookingForRating(rating);
              return (
                <Card key={rating.id} style={{ marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '900' }}>
                        {booking?.customerName || 'Khách hàng'}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.xs }}>
                        {booking?.bookingCode ?? 'Chuyến đi'} - {formatVietnamDate(rating.createdAt)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          size={14}
                          color={colors.warning}
                          fill={index < rating.rating ? colors.warning : 'transparent'}
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={{ color: rating.comment ? colors.text : colors.textTertiary, lineHeight: 20 }}>
                    {rating.comment || 'Khách hàng không để lại nhận xét.'}
                  </Text>
                  {!!booking && (
                    <View style={{ marginTop: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceAlt, gap: spacing.xs }}>
                      <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>
                        Đón: {booking.pickupLocation}
                      </Text>
                      <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>
                        Đến: {booking.dropoffLocation}
                      </Text>
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </Screen>
  );
}
