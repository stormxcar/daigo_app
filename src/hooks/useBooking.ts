import { useBookingStore } from '@/stores/bookingStore';
import { useCallback } from 'react';
import { apiClient } from '@/services/api';
import { Booking } from '@/types';

export const useBooking = () => {
  const store = useBookingStore();
  const setLoading = useBookingStore((state) => state.setLoading);
  const setBookings = useBookingStore((state) => state.setBookings);
  const addBooking = useBookingStore((state) => state.addBooking);
  const updateBooking = useBookingStore((state) => state.updateBooking);
  const setError = useBookingStore((state) => state.setError);

  const fetchBookings = useCallback(async (filters?: any) => {
    try {
      setLoading(true);
      const bookings = await apiClient.getBookings(filters);
      setBookings(bookings);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, [setBookings, setError, setLoading]);

  const createBooking = useCallback(async (bookingData: Partial<Booking>) => {
    try {
      setLoading(true);
      const booking = await apiClient.createBooking(bookingData);
      addBooking(booking);
      setLoading(false);
      return booking;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [addBooking, setError, setLoading]);

  const updateBookingStatus = useCallback(
    async (bookingId: string, status: string) => {
      try {
        setLoading(true);
        const booking = await apiClient.updateBooking(bookingId, { status: status as any });
        updateBooking(bookingId, { status: status as any });
        setLoading(false);
        return booking;
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
        throw err;
      }
    },
    [setError, setLoading, updateBooking]
  );

  const cancelBooking = useCallback(async (bookingId: string, reason?: string) => {
    try {
      setLoading(true);
      const booking = await apiClient.cancelBooking(bookingId, reason);
      updateBooking(bookingId, {
        status: booking.status,
        cancelReason: booking.cancelReason,
        cancelledAt: booking.cancelledAt,
        cancelledBy: booking.cancelledBy,
      });
      setLoading(false);
      return booking;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [setError, setLoading, updateBooking]);

  return {
    ...store,
    fetchBookings,
    createBooking,
    updateBookingStatus,
    cancelBooking,
  };
};
