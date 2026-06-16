import { Booking, DriverLocation } from '@/types';
import { supabase } from './supabase';

export function subscribeBookingStatus(
  bookingId: string,
  onChange: (booking: Partial<Booking>) => void
) {
  const channel = supabase
    .channel(`booking-status-${bookingId}-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `id=eq.${bookingId}`,
      },
      (payload) => {
        if (!payload.new) return;
        const row: any = payload.new;
        onChange({
          id: row.id,
          status: row.status,
          driverId: row.driver_id ?? '',
          updatedAt: row.updated_at,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeRealtimeDriverLocation(
  bookingId: string,
  onChange: (location: DriverLocation) => void
) {
  const channel = supabase
    .channel(`booking-driver-location-${bookingId}-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'driver_locations',
        filter: `booking_id=eq.${bookingId}`,
      },
      (payload) => {
        if (!payload.new) return;
        const row: any = payload.new;
        onChange({
          bookingId: row.booking_id,
          driverId: row.driver_id,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          heading: row.heading ?? undefined,
          speed: row.speed ?? undefined,
          accuracy: row.accuracy ?? undefined,
          phase: row.phase ?? 'pickup',
          updatedAt: row.updated_at,
          createdAt: row.created_at ?? undefined,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

