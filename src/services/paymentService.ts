import { Booking, Payment, User } from '@/types';
import { supabase } from './supabase';
import { createTransferContent, generateVietQRUrl } from './vietqrService';

type PaymentRow = {
  id: string;
  booking_id: string;
  customer_id: string;
  driver_id: string;
  amount: number | string;
  payment_method: Payment['paymentMethod'];
  payment_status: Payment['paymentStatus'];
  bank_name: string | null;
  bank_code: string | null;
  bank_bin: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  transfer_content: string;
  qr_url: string | null;
  proof_image_url: string | null;
  driver_note: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  verified_at: string | null;
  rejected_at: string | null;
  expires_at: string | null;
};

type DriverBankProfile = Pick<
  User,
  'id' | 'bankName' | 'bankCode' | 'bankBin' | 'bankAccountNumber' | 'bankAccountHolder'
>;

const mapPayment = (row: PaymentRow): Payment => ({
  id: row.id,
  bookingId: row.booking_id,
  customerId: row.customer_id,
  driverId: row.driver_id,
  amount: Number(row.amount),
  paymentMethod: row.payment_method,
  paymentStatus: row.payment_status,
  bankName: row.bank_name ?? undefined,
  bankCode: row.bank_code ?? undefined,
  bankBin: row.bank_bin ?? undefined,
  bankAccountNumber: row.bank_account_number ?? undefined,
  bankAccountHolder: row.bank_account_holder ?? undefined,
  transferContent: row.transfer_content,
  qrUrl: row.qr_url ?? undefined,
  proofImageUrl: row.proof_image_url ?? undefined,
  driverNote: row.driver_note ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  submittedAt: row.submitted_at ?? undefined,
  verifiedAt: row.verified_at ?? undefined,
  rejectedAt: row.rejected_at ?? undefined,
  expiresAt: row.expires_at ?? undefined,
});

const PAYMENT_EXPIRY_MINUTES = 15;

function getPaymentExpiresAt(method: Payment['paymentMethod']) {
  if (method === 'cash') return null;
  return new Date(Date.now() + PAYMENT_EXPIRY_MINUTES * 60 * 1000).toISOString();
}

function isExpired(payment: Payment) {
  return !!payment.expiresAt && Date.now() >= new Date(payment.expiresAt).getTime();
}

async function createPaymentNotification(data: {
  userId: string;
  bookingId: string;
  title: string;
  content: string;
}) {
  const { error } = await supabase.from('notifications').insert({
    user_id: data.userId,
    title: data.title,
    content: data.content,
    type: 'booking_update',
    read: false,
    related_booking_id: data.bookingId,
  });
  if (error) {
    if (__DEV__) console.warn('Không thể tạo thông báo thanh toán', error);
  }
}

async function getDriverBankProfile(driverId: string): Promise<DriverBankProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, bank_name, bank_code, bank_bin, bank_account_number, bank_account_holder')
    .eq('id', driverId)
    .single();
  if (error) throw error;

  return {
    id: data.id,
    bankName: data.bank_name ?? undefined,
    bankCode: data.bank_code ?? undefined,
    bankBin: data.bank_bin ?? undefined,
    bankAccountNumber: data.bank_account_number ?? undefined,
    bankAccountHolder: data.bank_account_holder ?? undefined,
  };
}

function assertDriverBankConfigured(driver: DriverBankProfile) {
  if (!driver.bankName || !driver.bankAccountNumber || !driver.bankAccountHolder || !(driver.bankBin || driver.bankCode)) {
    throw new Error('Tài xế chưa cấu hình đủ tài khoản ngân hàng để nhận thanh toán VietQR.');
  }
}

class PaymentService {
  async getPaymentByBooking(bookingId: string): Promise<Payment | null> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? mapPayment(data as PaymentRow) : null;
  }

  async getPaymentById(paymentId: string): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();
    if (error) throw error;
    return mapPayment(data as PaymentRow);
  }

  async createOrGetPayment(booking: Booking, customer: User, method: Payment['paymentMethod'] = 'vietqr'): Promise<Payment> {
    if (booking.customerId !== customer.id) {
      throw new Error('Bạn không có quyền thanh toán chuyến đi này.');
    }
    if (!booking.driverId) {
      throw new Error('Chuyến đi chưa có tài xế nhận nên chưa thể tạo VietQR.');
    }

    const existing = await this.getPaymentByBooking(booking.id);
    if (existing && existing.paymentStatus !== 'expired') {
      if (existing.paymentMethod !== 'cash' && ['pending', 'rejected'].includes(existing.paymentStatus) && isExpired(existing)) {
        await this.expirePayment(existing);
      } else {
        return existing;
      }
    }

    const amount = booking.actualPrice ?? booking.estimatedPrice;
    const transferContent = createTransferContent(booking.id, customer.id);
    const driverBank = method === 'cash' ? null : await getDriverBankProfile(booking.driverId);
    if (driverBank) assertDriverBankConfigured(driverBank);
    const qrUrl = driverBank
      ? generateVietQRUrl({
          bankBin: driverBank.bankBin,
          bankCode: driverBank.bankCode,
          accountNumber: driverBank.bankAccountNumber ?? '',
          accountName: driverBank.bankAccountHolder ?? '',
          amount,
          description: transferContent,
        })
      : null;

    const { data, error } = await supabase
      .from('payments')
      .insert({
        booking_id: booking.id,
        customer_id: customer.id,
        driver_id: booking.driverId,
        amount,
        payment_method: method,
        payment_status: 'pending',
        bank_name: driverBank?.bankName ?? null,
        bank_code: driverBank?.bankCode ?? null,
        bank_bin: driverBank?.bankBin ?? null,
        bank_account_number: driverBank?.bankAccountNumber ?? null,
        bank_account_holder: driverBank?.bankAccountHolder ?? null,
        transfer_content: transferContent,
        qr_url: qrUrl,
        expires_at: getPaymentExpiresAt(method),
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapPayment(data as PaymentRow);
  }

  async markTransferSubmitted(payment: Payment): Promise<Payment> {
    if (payment.paymentStatus === 'driver_verified') {
      throw new Error('Thanh toán này đã được tài xế xác nhận.');
    }
    if (payment.paymentMethod !== 'cash' && isExpired(payment)) {
      await this.expirePayment(payment);
      throw new Error('Mã thanh toán đã hết hạn. Vui lòng tạo lại mã mới.');
    }

    const { data, error } = await supabase
      .from('payments')
      .update({
        payment_status: 'submitted',
        submitted_at: new Date().toISOString(),
        driver_note: null,
      })
      .eq('id', payment.id)
      .select('*')
      .single();
    if (error) throw error;

    await createPaymentNotification({
      userId: payment.driverId,
      bookingId: payment.bookingId,
      title: 'Khách đã báo đã chuyển khoản',
      content: `Vui lòng kiểm tra giao dịch cho chuyến ${payment.transferContent}.`,
    });

    return mapPayment(data as PaymentRow);
  }

  async expirePayment(payment: Payment): Promise<Payment> {
    if (payment.paymentStatus === 'expired') return payment;
    if (!['pending', 'rejected'].includes(payment.paymentStatus)) {
      throw new Error('Thanh toán này không thể chuyển sang hết hạn.');
    }

    const { data, error } = await supabase
      .from('payments')
      .update({ payment_status: 'expired' })
      .eq('id', payment.id)
      .select('*')
      .single();
    if (error) throw error;
    return mapPayment(data as PaymentRow);
  }

  async verifyPayment(payment: Payment): Promise<Payment> {
    if (!['pending', 'submitted'].includes(payment.paymentStatus)) {
      throw new Error('Thanh toán này không còn ở trạng thái chờ xác nhận.');
    }

    const { data, error } = await supabase
      .from('payments')
      .update({
        payment_status: 'driver_verified',
        verified_at: new Date().toISOString(),
        driver_note: null,
      })
      .eq('id', payment.id)
      .select('*')
      .single();
    if (error) throw error;

    await createPaymentNotification({
      userId: payment.customerId,
      bookingId: payment.bookingId,
      title: 'Tài xế đã xác nhận thanh toán',
      content: 'Thanh toán của bạn đã được tài xế xác nhận.',
    });

    return mapPayment(data as PaymentRow);
  }

  async rejectPayment(payment: Payment, note: string): Promise<Payment> {
    if (!['pending', 'submitted'].includes(payment.paymentStatus)) {
      throw new Error('Thanh toán này không còn ở trạng thái chờ xử lý.');
    }
    if (!note.trim()) {
      throw new Error('Vui lòng nhập lý do từ chối để khách hàng biết cần xử lý gì.');
    }

    const { data, error } = await supabase
      .from('payments')
      .update({
        payment_status: 'rejected',
        rejected_at: new Date().toISOString(),
        driver_note: note.trim(),
      })
      .eq('id', payment.id)
      .select('*')
      .single();
    if (error) throw error;

    await createPaymentNotification({
      userId: payment.customerId,
      bookingId: payment.bookingId,
      title: 'Thanh toán bị từ chối',
      content: `Lý do: ${note.trim()}`,
    });

    return mapPayment(data as PaymentRow);
  }

  subscribePayment(bookingId: string, onChange: (payment: Payment) => void) {
    const channel = supabase
      .channel(`payment-${bookingId}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: `booking_id=eq.${bookingId}` },
        (payload) => {
          if (payload.new) onChange(mapPayment(payload.new as PaymentRow));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const paymentService = new PaymentService();
