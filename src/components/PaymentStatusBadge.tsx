import React from 'react';
import { Badge } from '@/components/BaseComponents';
import { BookingPaymentStatus, PaymentMethod, PaymentStatus } from '@/types';

type Props = {
  status?: PaymentStatus | BookingPaymentStatus | null;
  size?: 'sm' | 'md';
};

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: 'Chưa thanh toán',
  pending: 'Chờ chuyển khoản',
  submitted: 'Chờ tài xế xác nhận',
  driver_verified: 'Đã thanh toán',
  paid: 'Đã thanh toán',
  rejected: 'Bị từ chối',
  expired: 'Hết hạn',
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  vietqr: 'VietQR',
};

export function getPaymentStatusLabel(status?: PaymentStatus | BookingPaymentStatus | null) {
  return PAYMENT_LABELS[status || 'unpaid'] ?? 'Chưa thanh toán';
}

export function getPaymentMethodLabel(method?: PaymentMethod | null) {
  return method ? PAYMENT_METHOD_LABELS[method] : 'Chưa chọn';
}

export function PaymentStatusBadge({ status, size = 'sm' }: Props) {
  const variant =
    status === 'driver_verified' || status === 'paid'
      ? 'success'
      : status === 'rejected' || status === 'expired'
        ? 'error'
        : status === 'submitted'
          ? 'warning'
          : status === 'pending'
            ? 'info'
            : 'primary';

  return <Badge label={getPaymentStatusLabel(status)} variant={variant} size={size} />;
}
