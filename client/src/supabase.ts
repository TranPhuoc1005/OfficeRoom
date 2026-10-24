import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.trim().length > 0 && supabaseAnonKey.trim().length > 0);
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;

export interface RunnerInfo {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'busy';
  last_heartbeat_at: string | null;
  metadata?: any;
  isOnline: boolean;
}

export interface ProjectInfo {
  id: string;
  runner_id: string;
  name: string;
  path: string;
}

export async function getOrCreateOfficeId(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('get_or_create_user_office');
    if (error) {
      console.error('[Supabase] Error getting office ID:', error);
      return null;
    }
    return data as string;
  } catch (err) {
    console.error('[Supabase] Exception getting office ID:', err);
    return null;
  }
}
