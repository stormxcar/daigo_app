import React, { useEffect, useState } from 'react';
import { Share, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Banknote, CalendarClock, Car, Download, FileText, MapPin, Navigation, Share2, User } from 'lucide-react-native';
import { Button, Card } from '@/components/BaseComponents';
import { PaymentStatusBadge, getPaymentStatusLabel } from '@/components/PaymentStatusBadge';
import { PriceBreakdown } from '@/components/PriceBreakdown';
import { Screen } from '@/components/ScreenComponents';
import { apiClient } from '@/services/api';
import { paymentService } from '@/services/paymentService';
import { useTheme } from '@/theme';
import { fontForWeight, borderRadius, fontSize, spacing } from '@/theme/tokens';
import { Booking, Payment } from '@/types';
import { calculateBookingPrice, formatCurrency, formatVietnamDate } from '@/utils/helpers';
import { showError, showSuccess, showWarning } from '@/utils/toast';

const paymentMethodLabel = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  vietqr: 'VietQR',
};

function ReceiptSection({
  title,
  icon,
  children,
  style,
}: {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  style?: any;
}) {
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
      {!!title && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
          {!!icon && (
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: borderRadius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.background,
              }}
            >
              {icon}
            </View>
          )}
          <Text style={{ color: colors.text, fontSize: fontSize.base, ...fontForWeight('900') }}>{title}</Text>
        </View>
      )}
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
  const pricePerKm = booking.vehicle?.pricePerKm;
  const quote = booking.distance && booking.vehicle?.pricePerKm
    ? calculateBookingPrice(booking.distance, booking.vehicle.pricePerKm, booking.passengers, booking.time)
    : null;
  const priceAdjustment = quote ? total - quote.totalPrice : 0;
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
  const priceRows = quote
    ? [
        ['Cước lộ trình', formatCurrency(quote.basePrice)],
        ['Phí nền tảng', formatCurrency(quote.platformFee)],
        ['Phụ phí cao điểm', quote.peakFee > 0 ? formatCurrency(quote.peakFee) : 'Không áp dụng'],
        ['Phí đêm', quote.nightFee > 0 ? formatCurrency(quote.nightFee) : 'Không áp dụng'],
        ['Tạm tính theo công thức', formatCurrency(quote.totalPrice)],
        ...(Math.abs(priceAdjustment) >= 1
          ? [[priceAdjustment > 0 ? 'Điều chỉnh thêm' : 'Điều chỉnh giảm', formatCurrency(Math.abs(priceAdjustment))]]
          : []),
        ['Tổng ghi nhận', formatCurrency(total)],
      ]
    : [['Tổng ghi nhận', formatCurrency(total)]];

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
          <section class="section">
            <h2 class="section-title">Chi tiết giá</h2>
            ${priceRows.map(([label, value]) => `
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
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ flex: 0.42, color: colors.textSecondary, fontSize: fontSize.sm }}>{label}</Text>
      <Text style={{ flex: 0.58, color: colors.text, ...fontForWeight('800'), textAlign: 'right', lineHeight: 20 }}>
        {value || 'Chưa có'}
      </Text>
    </View>
  );
}

function ReceiptAction({
  label,
  icon,
  onPress,
  primary,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: 1,
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: primary ? colors.primary : colors.surface,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {icon}
      <Text style={{ color: primary ? '#ffffff' : colors.primary, fontSize: fontSize.sm, ...fontForWeight('900') }}>
        {label}
      </Text>
    </TouchableOpacity>
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
      title: `Biên nhận ${receiptCode}`,
      message: [
        `Biên nhận chuyến đi ${receiptCode}`,
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
        dialogTitle: `Lưu biên nhận ${receiptCode}`,
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
          <Text style={{ color: colors.text, ...fontForWeight('900'), marginBottom: spacing.sm }}>Không tìm thấy biên nhận</Text>
          <Text style={{ color: colors.textSecondary, marginBottom: spacing.md }}>Vui lòng quay lại chi tiết chuyến đi và thử lại.</Text>
          <Button label="Quay lại" onPress={() => router.back()} variant="outline" />
        </Card>
      </Screen>
    );
  }

  const total = booking.actualPrice ?? booking.estimatedPrice;
  const pricePerKm = booking.vehicle?.pricePerKm;
  const paymentStatus = payment?.paymentStatus ?? booking.paymentStatus;
  const paymentMethod = payment?.paymentMethod ?? booking.paymentMethod;
  const receiptCode = booking.bookingCode ?? booking.id.slice(0, 8);
  const paymentLabel = paymentMethod ? paymentMethodLabel[paymentMethod] : 'Chưa chọn';

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
            <Text style={{ color: '#ffffff', fontSize: 22, ...fontForWeight('900')}}>Biên nhận chuyến đi</Text>
            <Text style={{ color: 'rgba(255,255,255,0.82)', marginTop: spacing.xs }}>
              {receiptCode}
            </Text>
          </View>
        </View>
        <Text style={{ color: '#ffffff', fontSize: 28, ...fontForWeight('900')}}>
          {formatCurrency(total)}
        </Text>
        <View
          style={{
            alignSelf: 'flex-start',
            marginTop: spacing.sm,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            borderRadius: borderRadius.full,
            backgroundColor: paymentStatus === 'paid' ? 'rgba(16,185,129,0.22)' : 'rgba(255,255,255,0.16)',
            borderWidth: 1,
            borderColor: paymentStatus === 'paid' ? 'rgba(167,243,208,0.7)' : 'rgba(255,255,255,0.26)',
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: fontSize.sm, ...fontForWeight('900') }}>
            {paymentStatus === 'paid' ? 'Tổng đã thanh toán' : 'Chưa thanh toán'}
          </Text>
        </View>
      </ReceiptSection>

      <ReceiptSection title="Lộ trình" icon={<MapPin size={17} color={colors.primary} />}>
        <InfoRow label="Điểm đón" value={booking.pickupLocation} />
        <InfoRow label="Điểm đến" value={booking.dropoffLocation} />
        <InfoRow label="Quãng đường" value={booking.distance ? `${booking.distance} km` : 'Chưa có'} />
      </ReceiptSection>

      <ReceiptSection title="Thời gian" icon={<CalendarClock size={17} color={colors.info} />}>
        <InfoRow label="Lịch đặt" value={`${booking.time} - ${formatVietnamDate(booking.date)}`} />
        <InfoRow label="Bắt đầu chuyến" value={booking.startedAt ? new Date(booking.startedAt).toLocaleString('vi-VN') : undefined} />
        <InfoRow label="Hoàn thành" value={booking.completedAt ? new Date(booking.completedAt).toLocaleString('vi-VN') : undefined} />
      </ReceiptSection>

      <ReceiptSection title="Người đi và tài xế" icon={<User size={17} color={colors.primary} />}>
        <InfoRow label="Customer" value={booking.customerName} />
        <InfoRow label="Số điện thoại customer" value={booking.customerPhone} />
        <InfoRow label="Driver" value={booking.driverName} />
        <InfoRow label="Số điện thoại driver" value={booking.driverPhone} />
      </ReceiptSection>

      <ReceiptSection title="Xe" icon={<Car size={17} color={colors.warning} />}>
        <InfoRow label="Tên xe" value={booking.vehicle?.name} />
        <InfoRow label="Biển số" value={booking.vehicle?.licensePlate} />
        <InfoRow label="Màu xe" value={booking.vehicle?.color} />
        <InfoRow label="Số ghế" value={booking.vehicle?.seats ? `${booking.vehicle.seats} chỗ` : undefined} />
      </ReceiptSection>

      <ReceiptSection title="Thanh toán" icon={<Banknote size={17} color={colors.success} />}>
        <View style={{ marginBottom: spacing.md }}>
          <PaymentStatusBadge status={paymentStatus} size="md" />
        </View>
        <InfoRow label="Phương thức" value={paymentLabel} />
        <InfoRow label="Giá/km" value={pricePerKm ? `${pricePerKm.toLocaleString('vi-VN')} VND/km` : undefined} />
        {!!booking.distance && !!booking.vehicle?.pricePerKm && (
          <View style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
            <PriceBreakdown
              distance={booking.distance}
              pricePerKm={booking.vehicle.pricePerKm}
              passengers={booking.passengers}
              time={booking.time}
              recordedTotal={total}
              totalLabel="Tổng tiền"
              compact
            />
          </View>
        )}
        <InfoRow label="Tổng tiền" value={formatCurrency(total)} />
      </ReceiptSection>

      {!!booking.note && (
        <ReceiptSection title="Ghi chú" icon={<Navigation size={17} color={colors.textSecondary} />}>
          <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>{booking.note}</Text>
        </ReceiptSection>
      )}

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, backgroundColor: colors.background }}>
        <View
          style={{
            flexDirection: 'row',
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
          }}
        >
          <ReceiptAction label="Chia sẻ" onPress={shareReceipt} primary icon={<Share2 size={17} color="#ffffff" />} />
          <View style={{ width: 1, backgroundColor: colors.border }} />
          <ReceiptAction
            label={exportingPdf ? 'Đang tạo...' : 'Lưu PDF'}
            onPress={exportPdf}
            disabled={exportingPdf}
            icon={<Download size={17} color={colors.primary} />}
          />
        </View>
      </View>
    </Screen>
  );
}


