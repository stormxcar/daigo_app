import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';
import { User } from '@/types';

const DEVICE_ID_KEY = 'daigo_installation_device_id';

const createUuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
  const random = Math.floor(Math.random() * 16);
  const value = char === 'x' ? random : (random & 0x3) | 0x8;
  return value.toString(16);
});

export async function getInstallationDeviceId() {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;

  const next = createUuid();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, next);
  return next;
}

const isDriverAccount = (user?: User | null) =>
  user?.role === 'driver' || user?.accountType === 'driver' || user?.accountType === 'both';

export async function touchCurrentDevice(pushToken?: string | null) {
  const deviceId = await getInstallationDeviceId();
  const { error } = await supabase.rpc('touch_user_device', {
    p_device_id: deviceId,
    p_platform: Platform.OS,
    p_push_token: pushToken ?? null,
  });
  if (error) throw error;
  return deviceId;
}

export async function activateDriverOperationalDevice(user?: User | null, pushToken?: string | null) {
  if (!isDriverAccount(user)) return null;

  const deviceId = await getInstallationDeviceId();
  const { error } = await supabase.rpc('activate_driver_device', {
    p_device_id: deviceId,
    p_platform: Platform.OS,
    p_push_token: pushToken ?? null,
    p_force: true,
  });
  if (error) throw error;
  return deviceId;
}
