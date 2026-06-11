import { create } from 'zustand';
import { Booking, BookingStatus } from '@/types';

interface BookingStore {
  bookings: Booking[];
  selectedBooking: Booking | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setBookings: (bookings: Booking[]) => void;
  addBooking: (booking: Booking) => void;
  updateBooking: (id: string, booking: Partial<Booking>) => void;
  deleteBooking: (id: string) => void;
  selectBooking: (booking: Booking | null) => void;
  updateBookingStatus: (id: string, status: BookingStatus) => void;
  getBookingsByCustomer: (customerId: string) => Booking[];
  getBookingsByDriver: (driverId: string) => Booking[];
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useBookingStore = create<BookingStore>((set, get) => ({
  bookings: [],
  selectedBooking: null,
  isLoading: false,
  error: null,

  setBookings: (bookings) => set({ bookings }),

  addBooking: (booking) => {
    set((state) => ({
      bookings: [booking, ...state.bookings],
    }));
  },

  updateBooking: (id, updates) => {
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === id
          ? {
              ...b,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : b
      ),
      selectedBooking:
        state.selectedBooking?.id === id
          ? {
              ...state.selectedBooking,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : state.selectedBooking,
    }));
  },

  deleteBooking: (id) => {
    set((state) => ({
      bookings: state.bookings.filter((b) => b.id !== id),
      selectedBooking:
        state.selectedBooking?.id === id ? null : state.selectedBooking,
    }));
  },

  selectBooking: (booking) => set({ selectedBooking: booking }),

  updateBookingStatus: (id, status) => {
    get().updateBooking(id, { status });
  },

  getBookingsByCustomer: (customerId) => {
    return get().bookings.filter((b) => b.customerId === customerId);
  },

  getBookingsByDriver: (driverId) => {
    return get().bookings.filter((b) => b.driverId === driverId);
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
