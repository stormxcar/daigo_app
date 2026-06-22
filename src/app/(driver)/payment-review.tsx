import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { CheckCircle2, XCircle } from 'lucide-react-native';
import { Button, Card, TextInput } from '@/components/BaseComponents';
import { PaymentStatusBadge } from '@/components/PaymentStatusBadge';
import { Screen } from '@/components/ScreenComponents';
import { apiClient } from '@/services/api';
import { paymentService } from '@/services/paymentService';
import { useTheme } from '@/theme';
import { spacing } from '@/theme/tokens';
import { Booking, Payment } from '@/types';
import { showError, showSuccess } from '@/utils/toast';

function PaymentReviewSection({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
      }}
    >
      {children}
    </View>
  );
}

export default function DriverPaymentReviewScreen() {
  const { colors } = useTheme();
  const { bookingId, paymentId } = useLocalSearchParams<{ bookingId?: string; paymentId?: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [driverNote, setDriverNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const nextPayment = paymentId
        ? await paymentService.getPaymentById(paymentId)
        : bookingId
          ? await paymentService.getPaymentByBooking(bookingId)
          : null;
      setPayment(nextPayment);
      if (nextPayment?.driverNote) setDriverNote(nextPayment.driverNote);
      if (bookingId) {
        setBooking(await apiClient.getBookingById(bookingId));
      } else if (nextPayment?.bookingId) {
        setBooking(await apiClient.getBookingById(nextPayment.bookingId));
      }
    } catch (error: any) {
      showError('Không thể tải thanh toán', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [bookingId, paymentId]);

  useEffect(() => {
    if (!payment?.bookingId) return undefined;
    return paymentService.subscribePayment(payment.bookingId, setPayment);
  }, [payment?.bookingId]);

  const verify = async () => {
    if (!payment) return;
    try {
      setActionLoading(true);
      const updated = await paymentService.verifyPayment(payment);
      setPayment(updated);
      showSuccess('Đã xác nhận thanh toán', 'Khách hàng sẽ nhận được thông báo.');
    } catch (error: any) {
      showError('Không thể xác nhận', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const reject = async () => {
    if (!payment) return;
    try {
      setActionLoading(true);
      const updated = await paymentService.rejectPayment(payment, driverNote);
      setPayment(updated);
      showSuccess('Đã từ chối thanh toán', 'Lý do từ chối đã được gửi cho khách hàng.');
    } catch (error: any) {
      showError('Không thể từ chối', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Screen padding>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Đang tải thanh toán...</Text>
      </Screen>
    );
  }

  if (!payment) {
    return (
      <Screen padding>
        <Card>
          <Text style={{ color: colors.text, fontWeight: '900', marginBottom: spacing.sm }}>Chưa có thanh toán</Text>
          <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>
            Khách hàng chưa chọn phương thức thanh toán cho chuyến này.
          </Text>
          <Button label="Quay lại" onPress={() => router.back()} variant="outline" />
        </Card>
      </Screen>
    );
  }

  const canReview = ['pending', 'submitted'].includes(payment.paymentStatus);
  const methodLabel =
    payment.paymentMethod === 'cash'
      ? 'Tiền mặt'
      : payment.paymentMethod === 'vietqr'
        ? 'VietQR / chuyển khoản'
        : 'Chuyển khoản ngân hàng';

  return (
    <Screen scroll>
      <PaymentReviewSection>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>Xác nhận thanh toán</Text>
            <Text style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
              {booking?.bookingCode ?? payment.transferContent}
            </Text>
          </View>
          <PaymentStatusBadge status={payment.paymentStatus} size="md" />
        </View>
      </PaymentReviewSection>

      <PaymentReviewSection>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: spacing.md }}>
          Thông tin thanh toán
        </Text>
        {[
          ['Khách hàng', booking?.customerName || payment.customerId],
          ['Phương thức', methodLabel],
          ['Số tiền', `${payment.amount.toLocaleString('vi-VN')} VND`],
          ...(payment.paymentMethod === 'cash'
            ? []
            : [
                ['Nội dung CK', payment.transferContent],
                ['Ngân hàng', payment.bankName || 'Chưa có'],
                ['Tài khoản nhận', `${payment.bankAccountNumber || 'Chưa có'} - ${payment.bankAccountHolder || 'Chưa có'}`],
              ]),
        ].map(([label, value]) => (
          <View key={label} style={{ marginBottom: spacing.md }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{label}</Text>
            <Text style={{ color: colors.text, fontWeight: '800', marginTop: spacing.xs }}>{value}</Text>
          </View>
        ))}
      </PaymentReviewSection>

      <PaymentReviewSection>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: spacing.md }}>
          Ghi chú khi từ chối
        </Text>
        <TextInput
          value={driverNote}
          onChangeText={setDriverNote}
          placeholder="Ví dụ: Chưa thấy giao dịch, sai nội dung chuyển khoản..."
          multiline
          numberOfLines={3}
          disabled={actionLoading || payment.paymentStatus === 'driver_verified'}
          style={{ marginBottom: spacing.md }}
        />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            label="Từ chối"
            onPress={reject}
            variant="danger"
            loading={actionLoading}
            disabled={!canReview || actionLoading}
            icon={<XCircle size={18} color="white" />}
            style={{ flex: 1 }}
          />
          <Button
            label="Xác nhận"
            onPress={verify}
            loading={actionLoading}
            disabled={!canReview || actionLoading}
            icon={<CheckCircle2 size={18} color="white" />}
            style={{ flex: 1 }}
          />
        </View>
      </PaymentReviewSection>
    </Screen>
  );
}
