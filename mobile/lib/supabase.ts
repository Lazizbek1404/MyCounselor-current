import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Guard against missing env vars — app will still render, auth calls will fail gracefully
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Supabase is not configured. Create mobile/.env with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
      );
    }
    _client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getClient()[prop as keyof SupabaseClient];
  },
});
