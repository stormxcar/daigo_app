import { Booking, DriverLocation } from '@/types';
import { supabase } from './supabase';

type Unsubscribe = () => void;
type BookingListener = (booking: Partial<Booking>) => void;
type DriverLocationListener = (location: DriverLocation) => void;

type SubscriptionEntry<T> = {
  channel: ReturnType<typeof supabase.channel>;
  listeners: Set<T>;
};

const bookingStatusSubscriptions = new Map<string, SubscriptionEntry<BookingListener>>();
const driverLocationSubscriptions = new Map<string, SubscriptionEntry<DriverLocationListener>>();

export function subscribeBookingStatus(
  bookingId: string,
  onChange: (booking: Partial<Booking>) => void
): Unsubscribe {
  const existing = bookingStatusSubscriptions.get(bookingId);
  if (existing) {
    existing.listeners.add(onChange);
    return () => unsubscribeBookingStatus(bookingId, onChange);
  }

  const listeners = new Set<BookingListener>([onChange]);
  const channel = supabase
    .channel(`booking-status-${bookingId}`)
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
        const bookingUpdate = {
          id: row.id,
          status: row.status,
          driverId: row.driver_id ?? '',
          updatedAt: row.updated_at,
        };
        listeners.forEach((listener) => listener(bookingUpdate));
      }
    )
    .subscribe();

  bookingStatusSubscriptions.set(bookingId, { channel, listeners });
  return () => unsubscribeBookingStatus(bookingId, onChange);
}

export function unsubscribeBookingStatus(bookingId: string, listener?: BookingListener) {
  const entry = bookingStatusSubscriptions.get(bookingId);
  if (!entry) return;

  if (listener) entry.listeners.delete(listener);
  if (!listener || entry.listeners.size === 0) {
    supabase.removeChannel(entry.channel);
    bookingStatusSubscriptions.delete(bookingId);
  }
}

export function cleanupBookingStatusSubscriptions() {
  bookingStatusSubscriptions.forEach((entry) => supabase.removeChannel(entry.channel));
  bookingStatusSubscriptions.clear();
}

export function subscribeRealtimeDriverLocation(
  bookingId: string,
  onChange: (location: DriverLocation) => void
): Unsubscribe {
  const existing = driverLocationSubscriptions.get(bookingId);
  if (existing) {
    existing.listeners.add(onChange);
    return () => unsubscribeRealtimeDriverLocation(bookingId, onChange);
  }

  const listeners = new Set<DriverLocationListener>([onChange]);
  const channel = supabase
    .channel(`booking-driver-location-${bookingId}`)
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
        const location = {
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
        };
        listeners.forEach((listener) => listener(location));
      }
    )
    .subscribe();

  driverLocationSubscriptions.set(bookingId, { channel, listeners });
  return () => unsubscribeRealtimeDriverLocation(bookingId, onChange);
}

export function unsubscribeRealtimeDriverLocation(bookingId: string, listener?: DriverLocationListener) {
  const entry = driverLocationSubscriptions.get(bookingId);
  if (!entry) return;

  if (listener) entry.listeners.delete(listener);
  if (!listener || entry.listeners.size === 0) {
    supabase.removeChannel(entry.channel);
    driverLocationSubscriptions.delete(bookingId);
  }
}

export function cleanupRealtimeDriverLocationSubscriptions() {
  driverLocationSubscriptions.forEach((entry) => supabase.removeChannel(entry.channel));
  driverLocationSubscriptions.clear();
}
