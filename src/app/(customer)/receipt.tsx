import React, { useEffect, useState } from 'react';
import { Share, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Banknote, CalendarClock, Car, Download, FileText, MapPin, Navigation, Share2, User } from 'lucide-react-native';
import { Button, Card } from '@/components/BaseComponents';
import { PaymentStatusBadge, getPaymentStatusLabel } from '@/components/PaymentStatusBadge';
import { Screen } from '@/components/ScreenComponents';
import { apiClient } from '@/services/api';
import { paymentService } from '@/services/paymentService';
import { useTheme } from '@/theme';
import { borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Booking, Payment } from '@/types';
import { formatCurrency, formatVietnamDate } from '@/utils/helpers';
import { showError, showSuccess, showWarning } from '@/utils/toast';

const paymentMethodLabel = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  vietqr: 'VietQR',
};

function ReceiptSection({ children, style }: { children: React.ReactNode; style?: any }) {
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

const escapeHtml = (value?: string | number | null) =>
  String(value ?? 'Chưa có')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildReceiptHtml = (booking: Booking, payment: Payment | null) => {
  const total = booking.actualPrice ?? booking.estimatedPrice;
  const pricePerKm = booking.distance ? Math.round(total / Math.max(booking.distance, 1)) : booking.vehicle?.pricePerKm;
  const paymentStatus = payment?.paymentStatus ?? booking.paymentStatus;
  const paymentMethod = payment?.paymentMethod ?? booking.paymentMethod;
  const receiptCode = booking.bookingCode ?? booking.id.slice(0, 8);
  const generatedAt = new Date().toLocaleString('vi-VN');
  const rows = [
    ['Mã chuyến', receiptCode],
    ['Customer', booking.customerName],
    ['Số điện thoại customer', booking.customerPhone],
    ['Driver', booking.driverName],
    ['Số điện thoại driver', booking.driverPhone],
    ['Xe', booking.vehicle?.name],
    ['Biển số', booking.vehicle?.licensePlate],
    ['Màu xe', booking.vehicle?.color],
    ['Điểm đón', booking.pickupLocation],
    ['Điểm đến', booking.dropoffLocation],
    ['Lịch đặt', `${booking.time} - ${formatVietnamDate(booking.date)}`],
    ['Bắt đầu chuyến', booking.startedAt ? new Date(booking.startedAt).toLocaleString('vi-VN') : 'Chưa có'],
    ['Hoàn thành', booking.completedAt ? new Date(booking.completedAt).toLocaleString('vi-VN') : 'Chưa có'],
    ['Quãng đường', booking.distance ? `${booking.distance} km` : 'Chưa có'],
    ['Giá/km', pricePerKm ? `${pricePerKm.toLocaleString('vi-VN')} VND/km` : 'Chưa có'],
    ['Phương thức thanh toán', paymentMethod ? paymentMethodLabel[paymentMethod] : 'Chưa chọn'],
    ['Trạng thái thanh toán', getPaymentStatusLabel(paymentStatus)],
    ['Ghi chú', booking.note || 'Không có'],
  ];

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 32px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
            color: #111827;
            background: #f8fafc;
          }
          .page {
            background: #ffffff;
            border-radius: 18px;
            overflow: hidden;
            border: 1px solid #e5e7eb;
          }
          .hero {
            background: #1d4ed8;
            color: #ffffff;
            padding: 28px;
          }
          .title { font-size: 28px; font-weight: 800; margin: 0 0 8px; }
          .code { opacity: 0.86; font-size: 14px; margin: 0 0 22px; }
          .total { font-size: 34px; font-weight: 900; margin: 0; }
          .section { padding: 24px 28px; border-bottom: 1px solid #eef2f7; }
          .section-title { font-size: 18px; font-weight: 800; margin: 0 0 16px; color: #0f172a; }
          .row { display: flex; padding: 10px 0; border-bottom: 1px solid #f1f5f9; gap: 16px; }
          .row:last-child { border-bottom: 0; }
          .label { width: 34%; color: #64748b; font-size: 13px; }
          .value { flex: 1; color: #111827; font-size: 14px; font-weight: 650; line-height: 1.45; }
          .footer { padding: 18px 28px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <main class="page">
          <section class="hero">
            <h1 class="title">Biên nhận chuyến đi</h1>
            <p class="code">${escapeHtml(receiptCode)}</p>
            <p class="total">${escapeHtml(formatCurrency(total))}</p>
          </section>
          <section class="section">
            <h2 class="section-title">Thông tin chuyến đi</h2>
            ${rows.map(([label, value]) => `
              <div class="row">
                <div class="label">${escapeHtml(label)}</div>
                <div class="value">${escapeHtml(value)}</div>
              </div>
            `).join('')}
          </section>
          <div class="footer">Xuất lúc ${escapeHtml(generatedAt)} từ Daigo Booking.</div>
        </main>
      </body>
    </html>
  `;
};

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: '800', marginTop: spacing.xs }}>
        {value || 'Chưa có'}
      </Text>
    </View>
  );
}

export default function CustomerReceiptScreen() {
  const { colors } = useTheme();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    if (!bookingId) return;

    Promise.all([
      apiClient.getBookingById(bookingId),
      paymentService.getPaymentByBooking(bookingId).catch(() => null),
    ])
      .then(([nextBooking, nextPayment]) => {
        setBooking(nextBooking);
        setPayment(nextPayment);
      })
      .catch((error) => showError('Không thể tải biên nhận', error.message))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const shareReceipt = async () => {
    if (!booking) return;
    const total = booking.actualPrice ?? booking.estimatedPrice;
    await Share.share({
      title: `Biên nhận ${booking.bookingCode ?? booking.id.slice(0, 8)}`,
      message: [
        `Biên nhận chuyến đi ${booking.bookingCode ?? booking.id.slice(0, 8)}`,
        `Điểm đón: ${booking.pickupLocation}`,
        `Điểm đến: ${booking.dropoffLocation}`,
        `Tài xế: ${booking.driverName}`,
        `Xe: ${booking.vehicle?.name ?? booking.vehicleId}`,
        `Tổng tiền: ${formatCurrency(total)}`,
        `Thanh toán: ${getPaymentStatusLabel(payment?.paymentStatus ?? booking.paymentStatus)}`,
      ].join('\n'),
    });
  };

  const exportPdf = async () => {
    if (!booking || exportingPdf) return;

    try {
      setExportingPdf(true);
      const html = buildReceiptHtml(booking, payment);
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        showWarning('Không thể mở share sheet', `File PDF đã được tạo tại: ${uri}`);
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Lưu biên nhận ${booking.bookingCode ?? booking.id.slice(0, 8)}`,
        UTI: 'com.adobe.pdf',
      });
      showSuccess('Đã tạo PDF', 'Bạn có thể lưu hoặc chia sẻ biên nhận từ share sheet.');
    } catch (error: any) {
      showError('Không thể xuất PDF', error.message || 'Vui lòng thử lại sau.');
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) {
    return (
      <Screen padding>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Đang tải biên nhận...</Text>
      </Screen>
    );
  }

  if (!booking) {
    return (
      <Screen padding>
        <Card>
          <Text style={{ color: colors.text, fontWeight: '900', marginBottom: spacing.sm }}>Không tìm thấy biên nhận</Text>
          <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>Vui lòng quay lại chi tiết chuyến đi và thử lại.</Text>
          <Button label="Quay lại" onPress={() => router.back()} variant="outline" />
        </Card>
      </Screen>
    );
  }

  const total = booking.actualPrice ?? booking.estimatedPrice;
  const pricePerKm = booking.distance ? Math.round(total / Math.max(booking.distance, 1)) : booking.vehicle?.pricePerKm;
  const paymentStatus = payment?.paymentStatus ?? booking.paymentStatus;
  const paymentMethod = payment?.paymentMethod ?? booking.paymentMethod;

  return (
    <Screen scroll>
      <ReceiptSection style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: borderRadius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.16)',
            }}
          >
            <FileText size={26} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '900' }}>Biên nhận chuyến đi</Text>
            <Text style={{ color: 'rgba(255,255,255,0.82)', marginTop: spacing.xs }}>
              {booking.bookingCode ?? booking.id.slice(0, 8)}
            </Text>
          </View>
        </View>
        <Text style={{ color: '#ffffff', fontSize: 28, fontWeight: '900' }}>
          {formatCurrency(total)}
        </Text>
      </ReceiptSection>

      <ReceiptSection>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
          <MapPin size={20} color={colors.primary} />
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Lộ trình</Text>
        </View>
        <InfoRow label="Điểm đón" value={booking.pickupLocation} />
        <InfoRow label="Điểm đến" value={booking.dropoffLocation} />
        <InfoRow label="Quãng đường" value={booking.distance ? `${booking.distance} km` : 'Chưa có'} />
      </ReceiptSection>

      <ReceiptSection>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
          <CalendarClock size={20} color={colors.info} />
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Thời gian</Text>
        </View>
        <InfoRow label="Lịch đặt" value={`${booking.time} - ${formatVietnamDate(booking.date)}`} />
        <InfoRow label="Bắt đầu chuyến" value={booking.startedAt ? new Date(booking.startedAt).toLocaleString('vi-VN') : undefined} />
        <InfoRow label="Hoàn thành" value={booking.completedAt ? new Date(booking.completedAt).toLocaleString('vi-VN') : undefined} />
      </ReceiptSection>

      <ReceiptSection>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
          <User size={20} color={colors.primary} />
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Người đi và tài xế</Text>
        </View>
        <InfoRow label="Customer" value={booking.customerName} />
        <InfoRow label="Số điện thoại customer" value={booking.customerPhone} />
        <InfoRow label="Driver" value={booking.driverName} />
        <InfoRow label="Số điện thoại driver" value={booking.driverPhone} />
      </ReceiptSection>

      <ReceiptSection>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
          <Car size={20} color={colors.warning} />
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Xe</Text>
        </View>
        <InfoRow label="Tên xe" value={booking.vehicle?.name} />
        <InfoRow label="Biển số" value={booking.vehicle?.licensePlate} />
        <InfoRow label="Màu xe" value={booking.vehicle?.color} />
        <InfoRow label="Số ghế" value={booking.vehicle?.seats ? `${booking.vehicle.seats} chỗ` : undefined} />
      </ReceiptSection>

      <ReceiptSection>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
          <Banknote size={20} color={colors.success} />
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Thanh toán</Text>
        </View>
        <View style={{ marginBottom: spacing.md }}>
          <PaymentStatusBadge status={paymentStatus} size="md" />
        </View>
        <InfoRow label="Phương thức" value={paymentMethod ? paymentMethodLabel[paymentMethod] : 'Chưa chọn'} />
        <InfoRow label="Giá/km" value={pricePerKm ? `${pricePerKm.toLocaleString('vi-VN')} VND/km` : undefined} />
        <InfoRow label="Tổng tiền" value={formatCurrency(total)} />
      </ReceiptSection>

      {!!booking.note && (
        <ReceiptSection>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <Navigation size={20} color={colors.textSecondary} />
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Ghi chú</Text>
          </View>
          <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>{booking.note}</Text>
        </ReceiptSection>
      )}

      <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
        <Button label="Chia sẻ biên nhận" onPress={shareReceipt} icon={<Share2 size={18} color="#ffffff" />} />
        <Button
          label="Lưu PDF"
          onPress={exportPdf}
          loading={exportingPdf}
          disabled={exportingPdf}
          variant="outline"
          icon={<Download size={18} color={colors.primary} />}
        />
      </View>
    </Screen>
  );
}
