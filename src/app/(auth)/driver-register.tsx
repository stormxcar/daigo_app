import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Text, TextInput as RNTextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { BadgeCheck, Camera, Car, FileText, Smartphone, User } from 'lucide-react-native';
import { Button, TextInput } from '@/components/BaseComponents';
import { AuthRequired } from '@/components/AuthRequired';
import { OtpCodeInput } from '@/components/OtpCodeInput';
import { Screen } from '@/components/ScreenComponents';
import { useAuth } from '@/hooks/useAuth';
import { isFirebasePhoneAuthEnabled, isTestPhoneOtpEnabled, isValidVietnamPhone, normalizeVietnamPhone, TEST_PHONE_OTP } from '@/services/api';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { toVietnameseAuthError, isValidEmail } from '@/utils/authValidation';
import { showError, showInfo, showSuccess } from '@/utils/toast';
import { uploadMediaToCloudinary } from '@/services/cloudinary';

type DriverStep = 'phone' | 'otp' | 'basic' | 'docs';

export default function DriverRegisterScreen() {
  const { colors } = useTheme();
  const { sendPhoneOtp, verifyPhoneOtp, startDriverOnboarding, isLoading, user } = useAuth();

  const [step, setStep] = useState<DriverStep>(user?.phoneVerified ? 'basic' : 'phone');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [cccdNumber, setCccdNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [documentUrlsText, setDocumentUrlsText] = useState('');
  const [localError, setLocalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    phone?: string;
    fullName?: string;
    email?: string;
    cccdNumber?: string;
    licenseNumber?: string;
  }>({});
  const [avatarUploading, setAvatarUploading] = useState(false);
  const phoneRef = useRef<RNTextInput>(null);
  const fullNameRef = useRef<RNTextInput>(null);
  const emailRef = useRef<RNTextInput>(null);
  const cccdRef = useRef<RNTextInput>(null);
  const licenseRef = useRef<RNTextInput>(null);

  const normalizedPhone = useMemo(() => normalizeVietnamPhone(phone), [phone]);
  const firebasePhoneAuthEnabled = isFirebasePhoneAuthEnabled();
  const testOtpEnabled = isTestPhoneOtpEnabled();

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = setInterval(() => {
      setCountdown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const setError = (message: string) => {
    setLocalError(message);
    showError('Không thể đăng ký tài xế', message);
  };

  const requestOtp = async () => {
    setLocalError('');
    if (!isValidVietnamPhone(phone)) {
      setFieldErrors((current) => ({ ...current, phone: 'Vui lòng nhập số điện thoại Việt Nam hợp lệ.' }));
      phoneRef.current?.focus();
      setError('Vui lòng nhập số điện thoại Việt Nam hợp lệ.');
      return;
    }

    try {
      await sendPhoneOtp(phone);
      setStep('otp');
      setCountdown(60);
      showSuccess(
        testOtpEnabled ? 'OTP test đã sẵn sàng' : 'Đã gửi OTP',
        testOtpEnabled ? `Dùng mã ${TEST_PHONE_OTP} để xác minh số ${normalizedPhone}.` : `Mã xác minh đã được gửi tới ${normalizedPhone}.`
      );
    } catch (error: any) {
      setError(toVietnameseAuthError(error?.message));
    }
  };

  const verifyOtp = async () => {
    setLocalError('');
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Mã OTP phải gồm 6 chữ số.');
      return;
    }

    try {
      const response = await verifyPhoneOtp(phone, otp, { fullName, email });
      setFullName(response.user.fullName);
      setEmail(response.user.email ?? '');
      setPhone(response.user.phone || normalizedPhone);
      setStep('basic');
      showSuccess('Xác minh thành công', 'Bạn có thể tiếp tục tạo hồ sơ tài xế.');
    } catch (error: any) {
      setError(toVietnameseAuthError(error?.message));
    }
  };

  const continueBasic = () => {
    setLocalError('');
    if (fullName.trim().length < 2) {
      setFieldErrors((current) => ({ ...current, fullName: 'Vui lòng nhập họ tên tài xế.' }));
      fullNameRef.current?.focus();
      setError('Vui lòng nhập họ tên tài xế.');
      return;
    }
    if (email.trim() && !isValidEmail(email.trim())) {
      setFieldErrors((current) => ({ ...current, email: 'Email không đúng định dạng.' }));
      emailRef.current?.focus();
      setError('Email không đúng định dạng.');
      return;
    }
    setStep('docs');
  };

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Vui lòng cho phép truy cập thư viện ảnh để chọn avatar.');
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
      setAvatarUploading(true);
      const asset = result.assets[0];
      const uploaded = await uploadMediaToCloudinary(
        {
          uri: asset.uri,
          name: asset.fileName ?? `driver-onboarding-avatar-${Date.now()}.jpg`,
          type: asset.mimeType ?? 'image/jpeg',
        },
        'image'
      );
      setAvatarUrl(uploaded.secure_url);
      showSuccess('Đã upload avatar', 'Ảnh đại diện sẽ được lưu cùng hồ sơ tài xế.');
    } catch (error: any) {
      setError(error?.message ?? 'Không thể upload avatar.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const finishOnboarding = async () => {
    setLocalError('');
    const documentUrls = documentUrlsText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      const nextUser = await startDriverOnboarding({
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        cccdNumber: cccdNumber.trim() || undefined,
        licenseNumber: licenseNumber.trim() || undefined,
        documentUrls,
      });
      if (documentUrls.length || cccdNumber || licenseNumber) {
        showInfo('Hồ sơ đã gửi', 'Giấy tờ của bạn đang ở trạng thái chờ duyệt.');
      } else {
        showInfo('Có thể hoàn tất sau', 'Bạn vẫn có thể vào khu vực tài xế và bổ sung giấy tờ trong hồ sơ.');
      }
      showSuccess('Chào mừng tài xế Daigo', `Xin chào ${nextUser.fullName}.`);
      router.replace('/(driver)/dashboard');
    } catch (error: any) {
      setError(toVietnameseAuthError(error?.message));
    }
  };

  const stepTitle = {
    phone: 'Xác minh số điện thoại',
    otp: 'Nhập mã OTP',
    basic: 'Thông tin cơ bản',
    docs: 'Giấy tờ tài xế',
  }[step];

  if ((firebasePhoneAuthEnabled || testOtpEnabled) && !user) {
    return (
      <AuthRequired
        title="Đăng nhập trước"
        description="Tài xế hãy đăng nhập/đăng ký bằng Email hoặc Google trước. Firebase chỉ dùng để xác minh SĐT và lưu trạng thái vào Supabase."
        actionLabel="Đăng nhập"
        onActionPress={() => router.replace('/(auth)/login')}
      />
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Screen scroll padding>
        <View style={{ paddingTop: spacing.lg, paddingBottom: spacing.lg }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              marginBottom: spacing.md,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {step === 'docs' ? <FileText size={26} color={colors.primary} /> : <Car size={26} color={colors.primary} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900' }}>{stepTitle}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.xs }}>
                {step === 'docs'
                  ? 'MVP cho phép bỏ trống giấy tờ và hoàn tất sau trong hồ sơ tài xế.'
                  : firebasePhoneAuthEnabled
                    ? 'Luồng tài xế dùng Firebase OTP để xác minh SĐT, Supabase vẫn quản lý tài khoản chính.'
                    : testOtpEnabled
                    ? `Luồng tài xế đang dùng OTP test ${TEST_PHONE_OTP}, không gửi SMS thật.`
                    : 'Luồng tài xế tách riêng, xác minh OTP trước khi tạo hồ sơ.'}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {['phone', 'basic', 'docs'].map((item, index) => {
              const active = item === step || (item === 'phone' && step === 'otp');
              return (
                <View
                  key={item}
                  style={{
                    flex: 1,
                    height: 5,
                    borderRadius: 99,
                    backgroundColor: active || index < ['phone', 'basic', 'docs'].indexOf(step === 'otp' ? 'phone' : step) ? colors.primary : colors.border,
                  }}
                />
              );
            })}
          </View>
        </View>

        {!!localError && (
          <View
            style={{
              padding: spacing.md,
              borderRadius: borderRadius.md,
              backgroundColor: colors.error,
              marginBottom: spacing.lg,
            }}
          >
            <Text style={{ color: 'white', fontSize: fontSize.sm }}>{localError}</Text>
          </View>
        )}

        {step === 'phone' && (
          <>
            <TextInput
              ref={phoneRef}
              label="Số điện thoại"
              placeholder="Ví dụ: 0912345678"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                setLocalError('');
                setFieldErrors((current) => ({
                  ...current,
                  phone: isValidVietnamPhone(text) ? undefined : current.phone,
                }));
              }}
              keyboardType="phone-pad"
              returnKeyType="done"
              onSubmitEditing={requestOtp}
              disabled={isLoading}
              error={fieldErrors.phone}
              icon={<Smartphone size={20} color={colors.textSecondary} />}
              style={{ marginBottom: spacing.lg }}
            />
            <Button label="Gửi OTP" onPress={requestOtp} loading={isLoading} disabled={isLoading} />
          </>
        )}

        {step === 'otp' && (
          <>
            <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>
              {testOtpEnabled ? `Nhập mã test ${TEST_PHONE_OTP} cho ${normalizedPhone}.` : `Mã xác minh đã gửi tới ${normalizedPhone}.`}
            </Text>
            <OtpCodeInput
              label="Mã OTP"
              value={otp}
              onChangeText={(text) => {
                setOtp(text.replace(/\D/g, '').slice(0, 6));
                setLocalError('');
              }}
              disabled={isLoading}
              error={localError && !/^\d{6}$/.test(otp.trim()) ? localError : undefined}
            />
            <Button label="Xác minh OTP" onPress={verifyOtp} loading={isLoading} disabled={isLoading} style={{ marginBottom: spacing.md }} />
            <TouchableOpacity
              onPress={requestOtp}
              disabled={isLoading || countdown > 0}
              style={{ alignItems: 'center', opacity: countdown > 0 ? 0.55 : 1 }}
            >
              <Text style={{ color: colors.primary, fontWeight: '800' }}>
                {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại OTP'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'basic' && (
          <>
            <TouchableOpacity
              onPress={pickAvatar}
              disabled={isLoading || avatarUploading}
              activeOpacity={0.84}
              style={{
                alignSelf: 'center',
                width: 112,
                height: 112,
                borderRadius: 56,
                backgroundColor: colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.lg,
                overflow: 'hidden',
              }}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Camera size={30} color={colors.primary} />
              )}
              <View
                style={{
                  position: 'absolute',
                  right: 6,
                  bottom: 6,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Camera size={15} color="white" />
              </View>
            </TouchableOpacity>
            <TextInput
              ref={fullNameRef}
              label="Họ tên"
              placeholder="Tên tài xế"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                setLocalError('');
                setFieldErrors((current) => ({
                  ...current,
                  fullName: text.trim().length >= 2 ? undefined : current.fullName,
                }));
              }}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => emailRef.current?.focus()}
              disabled={isLoading}
              error={fieldErrors.fullName}
              icon={<User size={20} color={colors.textSecondary} />}
              style={{ marginBottom: spacing.lg }}
            />
            <TextInput
              label="Số điện thoại đã xác minh"
              placeholder={normalizedPhone}
              value={normalizedPhone}
              onChangeText={() => undefined}
              disabled
              icon={<BadgeCheck size={20} color={colors.primary} />}
              style={{ marginBottom: spacing.lg }}
            />
            <TextInput
              ref={emailRef}
              label="Email"
              placeholder="Email nếu có"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setLocalError('');
                setFieldErrors((current) => ({
                  ...current,
                  email: !text.trim() || isValidEmail(text) ? undefined : current.email,
                }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="done"
              onSubmitEditing={continueBasic}
              disabled={isLoading}
              error={fieldErrors.email}
              style={{ marginBottom: spacing.lg }}
            />
            <TextInput
              label="Avatar URL"
              placeholder="Tự điền sau khi chọn ảnh, hoặc dán URL"
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              disabled={isLoading || avatarUploading}
              style={{ marginBottom: spacing.lg }}
            />
            <Button label="Tiếp tục" onPress={continueBasic} disabled={isLoading} />
          </>
        )}

        {step === 'docs' && (
          <>
            <TextInput
              ref={cccdRef}
              label="Số CCCD"
              placeholder="Có thể bỏ trống"
              value={cccdNumber}
              onChangeText={(text) => {
                setCccdNumber(text);
                setFieldErrors((current) => ({ ...current, cccdNumber: undefined }));
              }}
              keyboardType="numeric"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => licenseRef.current?.focus()}
              disabled={isLoading}
              error={fieldErrors.cccdNumber}
              style={{ marginBottom: spacing.lg }}
            />
            <TextInput
              ref={licenseRef}
              label="Số GPLX"
              placeholder="Có thể bỏ trống"
              value={licenseNumber}
              onChangeText={(text) => {
                setLicenseNumber(text);
                setFieldErrors((current) => ({ ...current, licenseNumber: undefined }));
              }}
              returnKeyType="next"
              blurOnSubmit={false}
              disabled={isLoading}
              error={fieldErrors.licenseNumber}
              style={{ marginBottom: spacing.lg }}
            />
            <TextInput
              label="Ảnh giấy tờ"
              placeholder="Dán mỗi URL ảnh trên một dòng. Upload file có thể hoàn thiện sau trong hồ sơ."
              value={documentUrlsText}
              onChangeText={setDocumentUrlsText}
              multiline
              numberOfLines={4}
              disabled={isLoading}
              style={{ marginBottom: spacing.lg }}
            />
            <Button label="Hoàn tất đăng ký tài xế" onPress={finishOnboarding} loading={isLoading} disabled={isLoading} style={{ marginBottom: spacing.md }} />
            <Button label="Quay lại thông tin cơ bản" onPress={() => setStep('basic')} variant="outline" disabled={isLoading} />
          </>
        )}
        <View style={{ height: spacing['4xl'] }} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
