import React, { useEffect, useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {
  Banknote,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileText,
  LogOut,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Star,
  Trash2,
  UploadCloud,
  UserCircle,
  Wallet,
  XCircle,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { fontForWeight, borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Avatar, Badge, Button, Card, TextInput } from '@/components/BaseComponents';
import { Screen } from '@/components/ScreenComponents';
import { ProfileCompletionCard } from '@/components/ProfileCompletionCard';
import { SubmitOverlay } from '@/components/SubmitOverlay';
import { useSubmitLeaveGuard } from '@/hooks/useSubmitLeaveGuard';
import { apiClient } from '@/services/api';
import { uploadMediaToCloudinary } from '@/services/cloudinary';
import { generateVietQRUrl } from '@/services/vietqrService';
import { useAuthStore } from '@/stores/authStore';
import { showError, showSuccess, showWarning } from '@/utils/toast';
import { Booking, RatingReview } from '@/types';
import { formatVietnamDate } from '@/utils/helpers';

type RatingFilter = 'all' | '5' | '4' | '3' | '2' | '1' | 'commented';
type RatingSort = 'newest' | 'oldest';
type DriverProfileSectionKey = 'account' | 'info' | 'documents' | 'payment' | 'stats' | 'rating';

function ProfileSection({
  title,
  subtitle,
  icon,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const ChevronIcon = expanded ? ChevronUp : ChevronDown;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderBottomWidth: 0,
        borderColor: colors.border,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={onToggle}
        style={{
          minHeight: 58,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
        }}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          {!!icon && (
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: borderRadius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surfaceAlt,
              }}
            >
              {icon}
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 16, ...fontForWeight('900')}}>{title}</Text>
            {!!subtitle && (
              <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 3 }}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        <ChevronIcon size={20} color={colors.textSecondary} />
      </TouchableOpacity>
      {expanded && <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>{children}</View>}
    </View>
  );
}

function StatCell({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        width: '50%',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderColor: colors.border,
        borderBottomWidth: 1,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
        {icon}
        <Text style={{ color: colors.text, fontSize: 22, ...fontForWeight('900')}}>{value}</Text>
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.xs }}>
        {label}
      </Text>
    </View>
  );
}

export default function DriverProfile() {
  const { colors } = useTheme();
  const { user, logout, setUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [bankName, setBankName] = useState(user?.bankName ?? '');
  const [bankCode, setBankCode] = useState(user?.bankCode ?? '');
  const [bankBin, setBankBin] = useState(user?.bankBin ?? '');
  const [bankAccountNumber, setBankAccountNumber] = useState(user?.bankAccountNumber ?? '');
  const [bankAccountHolder, setBankAccountHolder] = useState(user?.bankAccountHolder ?? '');
  const [cccdNumber, setCccdNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [documentUrlsText, setDocumentUrlsText] = useState('');
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
  const [expandedSections, setExpandedSections] = useState<Record<DriverProfileSectionKey, boolean>>({
    account: true,
    info: true,
    documents: true,
    payment: false,
    stats: true,
    rating: true,
  });
  const ratingSheetRef = React.useRef<BottomSheetModal>(null);
  const ratingSnapPoints = React.useMemo(() => ['72%', '92%'], []);
  const bankQrPreviewUrl = React.useMemo(() => {
    const bank = bankBin.trim() || bankCode.trim();
    if (!bank || !bankAccountNumber.trim() || !bankAccountHolder.trim()) return null;
    try {
      return generateVietQRUrl({
        bankBin: bankBin.trim(),
        bankCode: bankCode.trim(),
        accountNumber: bankAccountNumber.trim(),
        accountName: bankAccountHolder.trim(),
        description: 'DAIGO_PREVIEW',
      });
    } catch {
      return null;
    }
  }, [bankAccountHolder, bankAccountNumber, bankBin, bankCode]);
  const documentUrls = React.useMemo(
    () => documentUrlsText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean),
    [documentUrlsText]
  );

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName);
    setPhone(user.phone);
    setAddress(user.address ?? '');
    setAvatarUrl(user.avatarUrl ?? '');
    setBankName(user.bankName ?? '');
    setBankCode(user.bankCode ?? '');
    setBankBin(user.bankBin ?? '');
    setBankAccountNumber(user.bankAccountNumber ?? '');
    setBankAccountHolder(user.bankAccountHolder ?? '');

    Promise.all([
      apiClient.getDriverVehicles(user.id),
      apiClient.getBookings({ driverId: user.id, page: 1, pageSize: 500 }),
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
        setCccdNumber(driverStatus?.cccdNumber ?? '');
        setLicenseNumber(driverStatus?.licenseNumber ?? '');
        setDocumentUrlsText((driverStatus?.documentUrls ?? []).join('\n'));
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
  }, [user]);

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

  const pickDriverDocuments = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showWarning('Cần quyền truy cập ảnh', 'Vui lòng cho phép ứng dụng chọn ảnh giấy tờ.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 8,
      quality: 0.82,
    });
    if (result.canceled || result.assets.length === 0) return;

    try {
      setSaving(true);
      const uploadedUrls: string[] = [];
      for (const [index, asset] of result.assets.entries()) {
        const uploaded = await uploadMediaToCloudinary({
          uri: asset.uri,
          name: asset.fileName ?? `driver-document-${Date.now()}-${index}.jpg`,
          type: asset.mimeType ?? 'image/jpeg',
        }, 'image');
        uploadedUrls.push(uploaded.secure_url);
      }
      const nextUrls = Array.from(new Set([...documentUrls, ...uploadedUrls]));
      setDocumentUrlsText(nextUrls.join('\n'));
      showSuccess('Đã upload giấy tờ', `${uploadedUrls.length} ảnh đã được thêm vào hồ sơ. Nhấn Lưu để cập nhật.`);
    } catch (error: any) {
      showError('Không thể upload giấy tờ', error.message);
    } finally {
      setSaving(false);
    }
  };

  const removeDriverDocument = (url: string) => {
    setDocumentUrlsText(documentUrls.filter((item) => item !== url).join('\n'));
  };

  useSubmitLeaveGuard(
    saving,
    'Daigo đang lưu hồ sơ tài xế hoặc upload giấy tờ. Thoát lúc này có thể khiến hồ sơ chưa được cập nhật đầy đủ.',
  );

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
        bankName: bankName.trim(),
        bankCode: bankCode.trim(),
        bankBin: bankBin.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountHolder: bankAccountHolder.trim(),
      });
      await apiClient.updateDriverDocuments(user.id, {
        cccdNumber: cccdNumber.trim() || undefined,
        licenseNumber: licenseNumber.trim() || undefined,
        documentUrls,
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
    showSuccess('Đã đăng xuất', 'Bạn đã đăng xuất khỏi tài khoản tài xế.');
    router.replace('/(auth)/login');
  };

  const toggleSection = (section: DriverProfileSectionKey) => {
    setExpandedSections((current) => ({ ...current, [section]: !current[section] }));
  };

  return (
    <Screen scroll>
      <SubmitOverlay
        visible={saving}
        message="Đang xử lý hồ sơ tài xế..."
        description="Daigo đang upload tệp hoặc lưu thông tin hồ sơ vào hệ thống."
      />
      <ProfileCompletionCard
        user={user}
        variant="driver"
        vehicleCount={vehicleCount}
        documentCount={documentUrls.length}
      />
      <ProfileSection
        title="Tài khoản tài xế"
        subtitle={user?.email || 'Hồ sơ cá nhân'}
        icon={<UserCircle size={18} color={colors.primary} />}
        expanded={expandedSections.account}
        onToggle={() => toggleSection('account')}
      >
        <View style={{ alignItems: 'center' }}>
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

          <Text style={{ fontSize: 20, ...fontForWeight('800'), color: colors.text }}>{user?.fullName}</Text>
          <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs }}>{user?.email}</Text>
          <View style={{ marginTop: spacing.md }}>
            <Badge label={user?.emailVerified ? 'Email đã xác thực' : 'Email chưa xác thực'} variant={user?.emailVerified ? 'success' : 'warning'} />
          </View>
          <View style={{ marginTop: spacing.sm }}>
            <Badge label={user?.phoneVerified ? 'SĐT đã xác thực' : 'SĐT chưa xác thực'} variant={user?.phoneVerified ? 'success' : 'warning'} />
          </View>
          {(!user?.emailVerified || !user?.phoneVerified) && (
            <View
              style={{
                alignSelf: 'stretch',
                marginTop: spacing.md,
                backgroundColor: colors.warning + '12',
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: colors.warning + '55',
              }}
            >
              {!user?.emailVerified && (
                <View style={{ padding: spacing.md, borderBottomWidth: !user?.phoneVerified ? 1 : 0, borderBottomColor: colors.warning + '35' }}>
                  <Text style={{ color: colors.text, ...fontForWeight('900')}}>Email chưa được xác thực</Text>
                  <Text style={{ color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 20 }}>
                    Xác thực email để bảo vệ tài khoản tài xế và nhận thông báo vận hành.
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
                  <Text style={{ color: colors.text, ...fontForWeight('900')}}>Số điện thoại chưa được xác thực</Text>
                  <Text style={{ color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 20 }}>
                    Xác thực SĐT để nhận chuyến, chat, gọi khách và xử lý thanh toán ổn định hơn.
                  </Text>
                  <Button
                    label="Xác thực SĐT"
                    onPress={() => router.push({ pathname: '/(auth)/phone-otp' as any, params: { redirectTo: '/(driver)/profile' } })}
                    size="sm"
                    style={{ marginTop: spacing.sm }}
                  />
                </View>
              )}
            </View>
          )}
        </View>
      </ProfileSection>

      <ProfileSection
        title="Thông tin tài xế"
        subtitle={editing ? 'Đang chỉnh sửa hồ sơ' : user?.phone || 'Số điện thoại, địa chỉ, ngân hàng'}
        icon={<Phone size={18} color={colors.primary} />}
        expanded={expandedSections.info}
        onToggle={() => toggleSection('info')}
      >
        {editing ? (
          <>
            <TextInput label="Họ và tên" value={fullName} onChangeText={setFullName} disabled={saving} style={{ marginBottom: spacing.md }} />
            <TextInput label="Số điện thoại" value={phone} onChangeText={setPhone} keyboardType="phone-pad" disabled={saving} style={{ marginBottom: spacing.md }} />
            <TextInput label="Địa chỉ" value={address} onChangeText={setAddress} disabled={saving} multiline numberOfLines={3} style={{ marginBottom: spacing.md }} />
            <Text style={{ color: colors.text, fontSize: 16, ...fontForWeight('900'), marginBottom: spacing.sm }}>
              Tài khoản nhận thanh toán
            </Text>
            <TextInput label="Tên ngân hàng" value={bankName} onChangeText={setBankName} disabled={saving} placeholder="Ví dụ: Vietcombank" style={{ marginBottom: spacing.md }} />
            <TextInput label="Mã ngân hàng" value={bankCode} onChangeText={setBankCode} disabled={saving} placeholder="Ví dụ: VCB" style={{ marginBottom: spacing.md }} />
            <TextInput label="Bank BIN VietQR" value={bankBin} onChangeText={setBankBin} disabled={saving} placeholder="Ví dụ: 970436" keyboardType="numeric" style={{ marginBottom: spacing.md }} />
            <TextInput label="Số tài khoản" value={bankAccountNumber} onChangeText={setBankAccountNumber} disabled={saving} keyboardType="numeric" style={{ marginBottom: spacing.md }} />
            <TextInput label="Chủ tài khoản" value={bankAccountHolder} onChangeText={setBankAccountHolder} disabled={saving} style={{ marginBottom: spacing.md }} />
            {!!bankQrPreviewUrl && (
              <View style={{ alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceAlt, marginBottom: spacing.md }}>
                <Text style={{ color: colors.text, ...fontForWeight('900'), marginBottom: spacing.sm }}>Preview mã QR nhận tiền</Text>
                <Image source={{ uri: bankQrPreviewUrl }} resizeMode="contain" style={{ width: '100%', height: 220, borderRadius: borderRadius.lg, backgroundColor: 'white' }} />
              </View>
            )}
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
              {
                icon: user?.phoneVerified ? <CheckCircle2 size={18} color={colors.success} /> : <XCircle size={18} color={colors.warning} />,
                label: user?.phoneVerified ? 'Số điện thoại đã xác thực' : 'Số điện thoại chưa xác thực',
              },
              {
                icon: <Banknote size={18} color={user?.bankAccountNumber ? colors.success : colors.warning} />,
                label: user?.bankAccountNumber
                  ? `${user.bankName ?? 'Ngân hàng'} - ${user.bankAccountNumber} - ${user.bankAccountHolder ?? 'Chủ tài khoản'}`
                  : 'Chưa cấu hình tài khoản ngân hàng nhận VietQR',
              },
            ].map((item, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingVertical: spacing.sm,
                  borderBottomWidth: index === 5 ? 0 : 1,
                  borderBottomColor: colors.border,
                }}
              >
                {item.icon}
                <Text style={{ color: colors.text, flex: 1 }}>{item.label}</Text>
              </View>
            ))}
            <Button label="Chỉnh sửa hồ sơ" onPress={() => setEditing(true)} size="sm" icon={<UserCircle size={18} color="white" />} style={{ marginTop: spacing.md }} />
          </>
        )}
      </ProfileSection>

      <ProfileSection
        title="Giấy tờ tài xế"
        subtitle={user?.kycStatus === 'approved' ? 'Hồ sơ đã được duyệt' : 'CCCD, GPLX và ảnh giấy tờ'}
        icon={<FileText size={18} color={colors.primary} />}
        expanded={expandedSections.documents}
        onToggle={() => toggleSection('documents')}
      >
        {editing ? (
          <>
            <TextInput
              label="Số CCCD"
              value={cccdNumber}
              onChangeText={setCccdNumber}
              keyboardType="numeric"
              disabled={saving}
              placeholder="Ví dụ: 001234567890"
              style={{ marginBottom: spacing.md }}
            />
            <TextInput
              label="Số GPLX"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              disabled={saving}
              placeholder="Nhập số giấy phép lái xe"
              style={{ marginBottom: spacing.md }}
            />
            <TouchableOpacity
              onPress={pickDriverDocuments}
              disabled={saving}
              activeOpacity={0.84}
              style={{
                minHeight: 118,
                backgroundColor: colors.surfaceAlt,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                padding: spacing.lg,
                marginBottom: spacing.md,
              }}
            >
              <UploadCloud size={26} color={colors.primary} />
              <Text style={{ color: colors.text, ...fontForWeight('900'), marginTop: spacing.sm }}>Upload ảnh giấy tờ</Text>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.xs }}>
                Có thể chọn nhiều ảnh CCCD/GPLX từ thư viện máy
              </Text>
            </TouchableOpacity>
            {documentUrls.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
                {documentUrls.map((url, index) => (
                  <View key={`${url}-${index}`} style={{ width: 82, height: 82, backgroundColor: colors.surfaceAlt }}>
                    <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} />
                    <TouchableOpacity
                      onPress={() => removeDriverDocument(url)}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: 'rgba(0,0,0,0.58)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={13} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            {[
              { label: 'Trạng thái KYC', value: user?.kycStatus ?? 'incomplete' },
              { label: 'Số CCCD', value: cccdNumber || 'Chưa bổ sung' },
              { label: 'Số GPLX', value: licenseNumber || 'Chưa bổ sung' },
              {
                label: 'Ảnh giấy tờ',
                value: documentUrls.length
                  ? `${documentUrls.length} tệp đã lưu`
                  : 'Chưa bổ sung',
              },
            ].map((item, index) => (
              <View
                key={item.label}
                style={{
                  paddingVertical: spacing.sm,
                  borderBottomWidth: index === 3 ? 0 : 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginBottom: 3 }}>{item.label}</Text>
                <Text style={{ color: colors.text, ...fontForWeight('800')}}>{item.value}</Text>
              </View>
            ))}
            {documentUrls.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
                {documentUrls.map((url, index) => (
                  <Image
                    key={`${url}-${index}`}
                    source={{ uri: url }}
                    style={{ width: 82, height: 82, backgroundColor: colors.surfaceAlt }}
                  />
              ))}
              </View>
            )}
          </>
        )}
      </ProfileSection>

      {!editing && !!bankQrPreviewUrl && (
        <ProfileSection
          title="QR nhận thanh toán"
          subtitle="Preview tài khoản nhận tiền của tài xế"
          icon={<Banknote size={18} color={colors.success} />}
          expanded={expandedSections.payment}
          onToggle={() => toggleSection('payment')}
        >
          <Image source={{ uri: bankQrPreviewUrl }} resizeMode="contain" style={{ width: '100%', height: 260, borderRadius: borderRadius.lg, backgroundColor: 'white' }} />
          <Text style={{ color: colors.textSecondary, marginTop: spacing.md, lineHeight: 21 }}>
            Đây là mã QR preview từ tài khoản ngân hàng của bạn. Khi khách thanh toán chuyến cụ thể, app sẽ tự thêm số tiền và nội dung chuyển khoản riêng.
          </Text>
        </ProfileSection>
      )}

      <TouchableOpacity
        activeOpacity={0.84}
        onPress={() => router.push('/(driver)/revenue' as any)}
        style={{
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.border,
          minHeight: 64,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        }}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: borderRadius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceAlt,
          }}
        >
          <Wallet size={18} color={colors.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 16, ...fontForWeight('900')}}>Doanh thu</Text>
          <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 3 }}>
            Biểu đồ, thống kê, thanh toán và chi tiết chuyến
          </Text>
        </View>
        <ChevronRight size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <ProfileSection
        title="Tổng quan hoạt động"
        subtitle={`${bookingCount} chuyến - ${vehicleCount} xe - ${postCount} bài viết`}
        icon={<Star size={18} color={colors.warning} fill={colors.warning} />}
        expanded={expandedSections.stats}
        onToggle={() => toggleSection('stats')}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.sm }}>
          <StatCell label="Xe" value={vehicleCount} />
          <StatCell label="Chuyến" value={bookingCount} />
          <StatCell label="Bài viết" value={postCount} />
          <StatCell label="Điểm" value={driverRating.toFixed(1)} icon={<Star size={16} color={colors.warning} fill={colors.warning} />} />
        </View>
      </ProfileSection>

      <ProfileSection
        title="Đánh giá tài xế"
        subtitle={`${ratingCount} lượt đánh giá từ khách hàng`}
        icon={<MessageSquareText size={18} color={colors.primary} />}
        expanded={expandedSections.rating}
        onToggle={() => toggleSection('rating')}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
          <View>
            <Text style={{ color: colors.text, ...fontForWeight('900')}}>Điểm trung bình</Text>
            <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>Tổng hợp từ các chuyến đã hoàn thành</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Star size={20} color={colors.warning} fill={colors.warning} />
              <Text style={{ color: colors.text, fontSize: 28, ...fontForWeight('900')}}>{driverRating.toFixed(1)}</Text>
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
      </ProfileSection>

      <View style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, padding: spacing.lg }}>
        <Button label="Đăng xuất" onPress={handleLogout} variant="danger" icon={<LogOut size={20} color="white" />} disabled={saving} />
      </View>

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
              <Text style={{ color: colors.text, fontSize: 20, ...fontForWeight('900')}}>Đánh giá của khách hàng</Text>
              <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
                {filteredRatings.length}/{ratings.length} đánh giá đang hiển thị
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Star size={20} color={colors.warning} fill={colors.warning} />
              <Text style={{ color: colors.text, fontSize: 24, ...fontForWeight('900')}}>{driverRating.toFixed(1)}</Text>
            </View>
          </View>

          <Text style={{ color: colors.text, ...fontForWeight('800'), marginBottom: spacing.sm }}>Lọc</Text>
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
                <Text style={{ color: ratingFilter === item.key ? 'white' : colors.text, ...fontForWeight('800'), fontSize: fontSize.sm }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ color: colors.text, ...fontForWeight('800'), marginBottom: spacing.sm }}>Sắp xếp</Text>
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
                <Text style={{ color: ratingSort === item.key ? 'white' : colors.text, ...fontForWeight('800')}}>{item.label}</Text>
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
                      <Text style={{ color: colors.text, ...fontForWeight('900')}}>
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
