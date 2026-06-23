import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Banknote, CheckCircle2, Clock, CreditCard, RotateCcw, ShieldAlert } from 'lucide-react-native';
import { Button, Card } from '@/components/BaseComponents';
import { PaymentStatusBadge } from '@/components/PaymentStatusBadge';
import { AuthRequired } from '@/components/AuthRequired';
import { Screen } from '@/components/ScreenComponents';
import { VietQRCard } from '@/components/VietQRCard';
import { usePayment } from '@/hooks/usePayment';
import { apiClient } from '@/services/api';
import { paymentService } from '@/services/paymentService';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme';
import { borderRadius, spacing } from '@/theme/tokens';
import { Booking, PaymentMethod } from '@/types';
import { showError, showSuccess, showWarning } from '@/utils/toast';

const formatRemainingTime = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

function PaymentSection({ children, style }: { children: React.ReactNode; style?: any }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export default function CustomerPaymentScreen() {
  const { colors } = useTheme();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const { isAuthenticated, user } = useAuthStore();
  const { payment, setPayment, loading, error, createOrGetPayment } = usePayment(bookingId);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [booting, setBooting] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());

  const paymentExpiresAt = payment?.expiresAt ? new Date(payment.expiresAt).getTime() : null;
  const paymentRemainingMs = paymentExpiresAt ? paymentExpiresAt - now : null;
  const vietQrExpired =
    !!payment &&
    payment.paymentMethod !== 'cash' &&
    payment.paymentStatus !== 'expired' &&
    payment.paymentStatus !== 'submitted' &&
    payment.paymentStatus !== 'driver_verified' &&
    paymentRemainingMs !== null &&
    paymentRemainingMs <= 0;

  useEffect(() => {
    if (!bookingId) return;
    apiClient
      .getBookingById(bookingId)
      .then(setBooking)
      .catch((loadError) => showError('Không thể tải chuyến đi', loadError.message))
      .finally(() => setBooting(false));
  }, [bookingId]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!payment || !vietQrExpired) return;
    paymentService
      .expirePayment(payment)
      .then((updated) => {
        setPayment(updated);
        showWarning('Mã VietQR đã hết hạn', 'Vui lòng tạo lại mã thanh toán mới nếu bạn muốn chuyển khoản.');
      })
      .catch(() => undefined);
  }, [payment, setPayment, vietQrExpired]);

  if (!isAuthenticated) {
    return <AuthRequired description="Bạn cần đăng nhập để thanh toán chuyến đi." />;
  }

  if (!user?.phoneVerified) {
    return (
      <AuthRequired
        title="Xác minh số điện thoại"
        description="Bạn cần xác minh SĐT bằng OTP trước khi thanh toán."
        actionLabel="Xác minh SĐT"
        onActionPress={() =>
          router.push({
            pathname: '/(auth)/phone-otp' as any,
            params: { redirectTo: bookingId ? `/(customer)/payment?bookingId=${bookingId}` : '/(customer)/payment' },
          })
        }
      />
    );
  }

  const ensurePayment = async (method: PaymentMethod) => {
    if (!booking || !user) return;
    try {
      await createOrGetPayment(booking, user, method);
      showSuccess('Đã chọn phương thức thanh toán', method === 'cash' ? 'Bạn sẽ thanh toán tiền mặt cho tài xế.' : 'Mã VietQR đã sẵn sàng.');
    } catch (paymentError: any) {
      showError('Không thể tạo thanh toán', paymentError.message);
    }
  };

  const markTransferred = async () => {
    if (!payment) return;
    if (vietQrExpired || payment.paymentStatus === 'expired') {
      showError('Mã đã hết hạn', 'Vui lòng tạo lại mã thanh toán mới trước khi báo đã chuyển khoản.');
      return;
    }
    try {
      setSubmitting(true);
      const updated = await paymentService.markTransferSubmitted(payment);
      setPayment(updated);
      showSuccess('Đã báo chuyển khoản', 'Tài xế sẽ kiểm tra giao dịch và xác nhận.');
    } catch (submitError: any) {
      showError('Không thể cập nhật thanh toán', submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (booting || loading) {
    return (
      <Screen padding>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Đang tải thanh toán...</Text>
      </Screen>
    );
  }

  if (!booking) {
    return (
      <Screen padding>
        <Card>
          <Text style={{ color: colors.text, fontWeight: '900', marginBottom: spacing.sm }}>Không tìm thấy chuyến đi</Text>
          <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>{error || 'Vui lòng quay lại và thử lại.'}</Text>
          <Button label="Quay lại" onPress={() => router.back()} variant="outline" />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <PaymentSection>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>
              Thanh toán chuyến đi
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
              {booking.bookingCode ?? booking.id.slice(0, 8)}
            </Text>
          </View>
          <PaymentStatusBadge status={payment?.paymentStatus ?? booking.paymentStatus} size="md" />
        </View>
      </PaymentSection>

      {!payment ? (
        <PaymentSection>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: spacing.sm }}>
            Chọn phương thức thanh toán
          </Text>
          <Text style={{ color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.md }}>
            Bạn có thể trả tiền mặt trực tiếp cho tài xế hoặc chuyển khoản bằng VietQR nếu tài xế đã cấu hình tài khoản ngân hàng.
          </Text>
          <View style={{ gap: spacing.md }}>
            <TouchableOpacity
              onPress={() => ensurePayment('cash')}
              activeOpacity={0.82}
              style={{ padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceAlt, flexDirection: 'row', gap: spacing.md }}
            >
              <Banknote size={24} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '900' }}>Tiền mặt</Text>
                <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>Thanh toán trực tiếp, tài xế xác nhận khi nhận tiền.</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => ensurePayment('vietqr')}
              activeOpacity={0.82}
              style={{ padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceAlt, flexDirection: 'row', gap: spacing.md }}
            >
              <CreditCard size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '900' }}>VietQR / chuyển khoản</Text>
                <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>Quét QR hoặc copy thông tin chuyển khoản của tài xế.</Text>
              </View>
            </TouchableOpacity>
          </View>
        </PaymentSection>
      ) : (
        <>
          {(payment.paymentStatus === 'pending' || payment.paymentStatus === 'rejected') && (
            <>
              {payment.paymentStatus === 'rejected' && (
                <PaymentSection style={{ backgroundColor: colors.surfaceAlt }}>
                  <View style={{ flexDirection: 'row', gap: spacing.md }}>
                    <ShieldAlert size={22} color={colors.error} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '900', marginBottom: spacing.xs }}>Thanh toán bị từ chối</Text>
                      <Text style={{ color: colors.textSecondary, lineHeight: 21 }}>
                        {payment.driverNote || 'Tài xế chưa xác nhận được khoản thanh toán. Vui lòng kiểm tra lại với tài xế.'}
                      </Text>
                    </View>
                  </View>
                </PaymentSection>
              )}
              {payment.paymentMethod === 'cash' ? (
                <PaymentSection>
                  <Banknote size={34} color={colors.success} />
                  <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', marginTop: spacing.md, marginBottom: spacing.sm }}>
                    Thanh toán tiền mặt
                  </Text>
                  <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>
                    Bạn thanh toán trực tiếp cho tài xế. Tài xế sẽ xác nhận đã nhận tiền trong app.
                  </Text>
                </PaymentSection>
              ) : (
                <>
                  <VietQRCard payment={payment} />
                  <PaymentSection style={{ backgroundColor: colors.surfaceAlt }}>
                    <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                      <Clock size={22} color={vietQrExpired ? colors.error : colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: '900' }}>
                          {vietQrExpired ? 'Mã QR đã hết hạn' : `Mã QR còn hiệu lực trong ${formatRemainingTime(paymentRemainingMs ?? 0)}`}
                        </Text>
                        <Text style={{ color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 20 }}>
                          Sau khi hết hạn, bạn cần tạo lại mã mới trước khi báo đã chuyển khoản.
                        </Text>
                      </View>
                    </View>
                  </PaymentSection>
                  <Button
                    label={vietQrExpired ? 'Mã đã hết hạn' : 'Tôi đã chuyển khoản'}
                    onPress={markTransferred}
                    loading={submitting}
                    disabled={submitting || vietQrExpired}
                  />
                </>
              )}
            </>
          )}

          {payment.paymentStatus === 'submitted' && (
            <PaymentSection>
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: borderRadius.full,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.surfaceAlt,
                  marginBottom: spacing.md,
                }}
              >
                <Clock size={26} color={colors.warning} />
              </View>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: spacing.sm }}>
                Đang chờ tài xế xác nhận
              </Text>
              <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>
                Tài xế sẽ kiểm tra giao dịch và xác nhận đã nhận tiền. Trạng thái sẽ tự cập nhật realtime.
              </Text>
            </PaymentSection>
          )}

          {payment.paymentStatus === 'driver_verified' && (
            <PaymentSection>
              <CheckCircle2 size={42} color={colors.success} />
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', marginTop: spacing.md, marginBottom: spacing.sm }}>
                Thanh toán thành công
              </Text>
              <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>
                Tài xế đã xác nhận nhận tiền cho chuyến đi này.
              </Text>
            </PaymentSection>
          )}

          {payment.paymentStatus === 'expired' && (
            <PaymentSection>
              <RotateCcw size={32} color={colors.error} />
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', marginTop: spacing.md }}>
                Phiên thanh toán đã hết hạn
              </Text>
              <Text style={{ color: colors.textSecondary, lineHeight: 22, marginTop: spacing.sm, marginBottom: spacing.md }}>
                Mã QR cũ không còn dùng để báo chuyển khoản. Bạn có thể tạo lại mã mới cho chuyến đi này.
              </Text>
              <Button
                label="Tạo lại mã thanh toán"
                onPress={() => ensurePayment('vietqr')}
                loading={loading}
                icon={<RotateCcw size={18} color="white" />}
              />
            </PaymentSection>
          )}
        </>
      )}
    </Screen>
  );
}
