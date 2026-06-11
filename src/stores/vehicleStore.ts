import { create } from 'zustand';
import { Vehicle, VehicleStatus } from '@/types';

interface VehicleStore {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setVehicles: (vehicles: Vehicle[]) => void;
  addVehicle: (vehicle: Vehicle) => void;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
  selectVehicle: (vehicle: Vehicle | null) => void;
  updateVehicleStatus: (id: string, status: VehicleStatus) => void;
  getAvailableVehicles: () => Vehicle[];
  getVehicleById: (id: string) => Vehicle | undefined;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useVehicleStore = create<VehicleStore>((set, get) => ({
  vehicles: [],
  selectedVehicle: null,
  isLoading: false,
  error: null,

  setVehicles: (vehicles) => set({ vehicles }),

  addVehicle: (vehicle) => {
    set((state) => ({
      vehicles: [...state.vehicles, vehicle],
    }));
  },

  updateVehicle: (id, updates) => {
    set((state) => ({
      vehicles: state.vehicles.map((v) =>
        v.id === id
          ? {
              ...v,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : v
      ),
      selectedVehicle:
        state.selectedVehicle?.id === id
          ? {
              ...state.selectedVehicle,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : state.selectedVehicle,
    }));
  },

  deleteVehicle: (id) => {
    set((state) => ({
      vehicles: state.vehicles.filter((v) => v.id !== id),
      selectedVehicle:
        state.selectedVehicle?.id === id ? null : state.selectedVehicle,
    }));
  },

  selectVehicle: (vehicle) => set({ selectedVehicle: vehicle }),

  updateVehicleStatus: (id, status) => {
    get().updateVehicle(id, { status });
  },

  getAvailableVehicles: () => {
    return get().vehicles.filter((v) => v.status === 'Sẵn sàng');
  },

  getVehicleById: (id) => {
    return get().vehicles.find((v) => v.id === id);
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
