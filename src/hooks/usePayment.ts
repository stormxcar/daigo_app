import { useCallback, useEffect, useState } from 'react';
import { Booking, Payment, PaymentMethod, User } from '@/types';
import { paymentService } from '@/services/paymentService';

export function usePayment(bookingId?: string) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPayment = useCallback(async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      setError(null);
      setPayment(await paymentService.getPaymentByBooking(bookingId));
    } catch (paymentError: any) {
      setError(paymentError.message || 'Không thể tải thanh toán.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  const createOrGetPayment = useCallback(async (booking: Booking, user: User, method?: PaymentMethod) => {
    setLoading(true);
    setError(null);
    try {
      const nextPayment = await paymentService.createOrGetPayment(booking, user, method);
      setPayment(nextPayment);
      return nextPayment;
    } catch (paymentError: any) {
      setError(paymentError.message || 'Không thể tạo thanh toán.');
      throw paymentError;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayment();
  }, [loadPayment]);

  useEffect(() => {
    if (!bookingId) return undefined;
    return paymentService.subscribePayment(bookingId, setPayment);
  }, [bookingId]);

  return {
    payment,
    setPayment,
    loading,
    error,
    reload: loadPayment,
    createOrGetPayment,
  };
}
