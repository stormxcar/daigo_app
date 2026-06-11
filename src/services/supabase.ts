import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const CHUNK_SIZE = 1900;
const sanitizeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');
const metaKey = (key: string) => `${sanitizeKey(key)}_meta`;
const chunkKey = (key: string, index: number) => `${sanitizeKey(key)}_${index}`;

const secureStorage = {
  async getItem(key: string) {
    const meta = await SecureStore.getItemAsync(metaKey(key));
    const chunkCount = meta ? Number(meta) : 0;

    if (!chunkCount) {
      return SecureStore.getItemAsync(sanitizeKey(key));
    }

    const chunks = await Promise.all(
      Array.from({ length: chunkCount }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index)))
    );

    return chunks.filter(Boolean).join('');
  },

  async setItem(key: string, value: string) {
    const safeKey = sanitizeKey(key);
    const oldMeta = await SecureStore.getItemAsync(metaKey(key));
    const oldChunkCount = oldMeta ? Number(oldMeta) : 0;

    await SecureStore.deleteItemAsync(safeKey);
    for (let index = 0; index < oldChunkCount; index += 1) {
      await SecureStore.deleteItemAsync(chunkKey(key, index));
    }

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.deleteItemAsync(metaKey(key));
      await SecureStore.setItemAsync(safeKey, value);
      return;
    }

    const chunks = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'g')) ?? [];
    await SecureStore.setItemAsync(metaKey(key), String(chunks.length));
    await Promise.all(
      chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk))
    );
  },

  async removeItem(key: string) {
    const safeKey = sanitizeKey(key);
    const meta = await SecureStore.getItemAsync(metaKey(key));
    const chunkCount = meta ? Number(meta) : 0;

    await SecureStore.deleteItemAsync(safeKey);
    await SecureStore.deleteItemAsync(metaKey(key));
    await Promise.all(
      Array.from({ length: chunkCount }, (_, index) => SecureStore.deleteItemAsync(chunkKey(key, index)))
    );
  },
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
