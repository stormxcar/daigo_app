import { useBookingStore } from '@/stores/bookingStore';
import { useCallback, useEffect } from 'react';
import { apiClient } from '@/services/api';
import { Booking } from '@/types';
import { supabase } from '@/services/supabase';

export const useBooking = () => {
  const store = useBookingStore();

  const fetchBookings = useCallback(async (filters?: any) => {
    try {
      store.setLoading(true);
      const bookings = await apiClient.getBookings(filters);
      store.setBookings(bookings);
      store.setLoading(false);
    } catch (err: any) {
      store.setError(err.message);
      store.setLoading(false);
    }
  }, []);

  const createBooking = useCallback(async (bookingData: Partial<Booking>) => {
    try {
      store.setLoading(true);
      const booking = await apiClient.createBooking(bookingData);
      store.addBooking(booking);
      store.setLoading(false);
      return booking;
    } catch (err: any) {
      store.setError(err.message);
      store.setLoading(false);
      throw err;
    }
  }, []);

  const updateBookingStatus = useCallback(
    async (bookingId: string, status: string) => {
      try {
        store.setLoading(true);
        const booking = await apiClient.updateBooking(bookingId, { status: status as any });
        store.updateBooking(bookingId, { status: status as any });
        store.setLoading(false);
        return booking;
      } catch (err: any) {
        store.setError(err.message);
        store.setLoading(false);
        throw err;
      }
    },
    []
  );

  const cancelBooking = useCallback(async (bookingId: string, reason?: string) => {
    try {
      store.setLoading(true);
      const booking = await apiClient.cancelBooking(bookingId, reason);
      store.updateBooking(bookingId, {
        status: booking.status,
        cancelReason: booking.cancelReason,
        cancelledAt: booking.cancelledAt,
        cancelledBy: booking.cancelledBy,
      });
      store.setLoading(false);
      return booking;
    } catch (err: any) {
      store.setError(err.message);
      store.setLoading(false);
      throw err;
    }
  }, []);

  useEffect(() => {
    const channelName = `bookings-realtime-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchBookings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBookings]);

  return {
    ...store,
    fetchBookings,
    createBooking,
    updateBookingStatus,
    cancelBooking,
  };
};
