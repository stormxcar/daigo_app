import React from 'react';
import { Badge } from '@/components/BaseComponents';
import { CallStatus } from '@/types';

const LABELS: Record<CallStatus, string> = {
  ringing: 'Đang gọi',
  accepted: 'Đang nói chuyện',
  rejected: 'Đã từ chối',
  missed: 'Cuộc gọi nhỡ',
  ended: 'Đã kết thúc',
  failed: 'Lỗi cuộc gọi',
};

export function CallStatusBadge({ status }: { status: CallStatus }) {
  const variant =
    status === 'accepted'
      ? 'success'
      : status === 'ringing'
        ? 'info'
        : status === 'ended'
          ? 'primary'
          : 'error';

  return <Badge label={LABELS[status]} variant={variant} size="md" />;
}
