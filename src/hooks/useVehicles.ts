import { useVehicleStore } from '@/stores/vehicleStore';
import { useCallback } from 'react';
import { apiClient } from '@/services/api';
import { Vehicle } from '@/types';

export const useVehicles = () => {
  const store = useVehicleStore();
  const setLoading = useVehicleStore((state) => state.setLoading);
  const setVehicles = useVehicleStore((state) => state.setVehicles);
  const addVehicle = useVehicleStore((state) => state.addVehicle);
  const updateVehicleInStore = useVehicleStore((state) => state.updateVehicle);
  const deleteVehicleFromStore = useVehicleStore((state) => state.deleteVehicle);
  const setError = useVehicleStore((state) => state.setError);

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      const vehicles = await apiClient.getVehicles();
      setVehicles(vehicles);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, [setError, setLoading, setVehicles]);

  const createVehicle = useCallback(async (vehicleData: Partial<Vehicle>) => {
    try {
      setLoading(true);
      const vehicle = await apiClient.createVehicle(vehicleData);
      addVehicle(vehicle);
      setLoading(false);
      return vehicle;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [addVehicle, setError, setLoading]);

  const updateVehicle = useCallback(async (vehicleId: string, vehicleData: Partial<Vehicle>) => {
    try {
      setLoading(true);
      const vehicle = await apiClient.updateVehicle(vehicleId, vehicleData);
      updateVehicleInStore(vehicleId, vehicleData);
      setLoading(false);
      return vehicle;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [setError, setLoading, updateVehicleInStore]);

  const deleteVehicle = useCallback(async (vehicleId: string) => {
    try {
      setLoading(true);
      await apiClient.deleteVehicle(vehicleId);
      deleteVehicleFromStore(vehicleId);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [deleteVehicleFromStore, setError, setLoading]);

  return {
    ...store,
    fetchVehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle,
  };
};
