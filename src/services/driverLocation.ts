import * as Location from 'expo-location';
import { DriverLocation, TripPhase } from '@/types';
import { supabase } from './supabase';

interface LocationPoint {
  latitude: number;
  longitude: number;
}

interface UpsertDriverLocationInput extends LocationPoint {
  bookingId: string;
  driverId: string;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  phase?: TripPhase;
}

const mapDriverLocation = (row: any): DriverLocation => ({
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

export const getDistanceMeters = (from: LocationPoint, to: LocationPoint) => {
  const radius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export async function getDriverLocation(bookingId: string): Promise<DriverLocation | null> {
  const { data, error } = await supabase
    .from('driver_locations')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapDriverLocation(data) : null;
}

export async function upsertDriverLocation(input: UpsertDriverLocationInput): Promise<DriverLocation> {
  const { data, error } = await supabase
    .from('driver_locations')
    .upsert(
      {
        booking_id: input.bookingId,
        driver_id: input.driverId,
        latitude: input.latitude,
        longitude: input.longitude,
        heading: input.heading,
        speed: input.speed,
        accuracy: input.accuracy,
        phase: input.phase ?? 'pickup',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'booking_id' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return mapDriverLocation(data);
}

export function subscribeDriverLocation(
  bookingId: string,
  onChange: (location: DriverLocation) => void
) {
  const channel = supabase
    .channel(`driver-location-${bookingId}-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'driver_locations',
        filter: `booking_id=eq.${bookingId}`,
      },
      (payload) => {
        if (payload.new) {
          onChange(mapDriverLocation(payload.new));
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function startDriverLocationWatch(
  bookingId: string,
  driverId: string,
  phase: TripPhase,
  onChange: (location: DriverLocation) => void
) {
  // Check existing permission first to avoid showing the dialog multiple times
  const existing = await Location.getForegroundPermissionsAsync();
  let permStatus = existing.status;
  if (permStatus !== 'granted') {
    const requested = await Location.requestForegroundPermissionsAsync();
    permStatus = requested.status;
  }
  if (permStatus !== 'granted') {
    throw new Error('Bạn cần cấp quyền vị trí để chia sẻ GPS chuyến đi.');
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new Error('GPS đang tắt. Vui lòng bật dịch vụ vị trí trên điện thoại.');
  }

  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 3000,
      distanceInterval: 5,
    },
    async (position) => {
      try {
        const location = await upsertDriverLocation({
          bookingId,
          driverId,
          phase,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
          accuracy: position.coords.accuracy,
        });
        onChange(location);
      } catch (error) {
        if (__DEV__) console.warn('Không thể cập nhật GPS tài xế', error);
      }
    }
  );
}
