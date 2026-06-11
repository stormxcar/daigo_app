import { useVehicleStore } from '@/stores/vehicleStore';
import { useCallback } from 'react';
import { apiClient } from '@/services/api';
import { Vehicle } from '@/types';

export const useVehicles = () => {
  const store = useVehicleStore();

  const fetchVehicles = useCallback(async () => {
    try {
      store.setLoading(true);
      const vehicles = await apiClient.getVehicles();
      store.setVehicles(vehicles);
      store.setLoading(false);
    } catch (err: any) {
      store.setError(err.message);
      store.setLoading(false);
    }
  }, []);

  const createVehicle = useCallback(async (vehicleData: Partial<Vehicle>) => {
    try {
      store.setLoading(true);
      const vehicle = await apiClient.createVehicle(vehicleData);
      store.addVehicle(vehicle);
      store.setLoading(false);
      return vehicle;
    } catch (err: any) {
      store.setError(err.message);
      store.setLoading(false);
      throw err;
    }
  }, []);

  const updateVehicle = useCallback(async (vehicleId: string, vehicleData: Partial<Vehicle>) => {
    try {
      store.setLoading(true);
      const vehicle = await apiClient.updateVehicle(vehicleId, vehicleData);
      store.updateVehicle(vehicleId, vehicleData);
      store.setLoading(false);
      return vehicle;
    } catch (err: any) {
      store.setError(err.message);
      store.setLoading(false);
      throw err;
    }
  }, []);

  const deleteVehicle = useCallback(async (vehicleId: string) => {
    try {
      store.setLoading(true);
      await apiClient.deleteVehicle(vehicleId);
      store.deleteVehicle(vehicleId);
      store.setLoading(false);
    } catch (err: any) {
      store.setError(err.message);
      store.setLoading(false);
      throw err;
    }
  }, []);

  return {
    ...store,
    fetchVehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle,
  };
};
