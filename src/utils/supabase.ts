import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FamilyTreeDataset } from '../types/family';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  autoSync: boolean;
  table: string;
}

const SUPABASE_CONFIG_KEY = 'kintree_supabase_config_v1';

export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  url:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
    'https://ewxdnroywzaxoxqbinbn.supabase.co',
  anonKey:
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3eGRucm95d3pheG94cWJpbmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzMjc4ODAsImV4cCI6MjEwODkwMzg4MH0.xLa5hT0G2ZNf97sKnbsMkBUlwi5V7Xg1V8UWDPJDsdg',
  autoSync: false,
  table: 'family_trees',
};

export function loadSupabaseConfig(): SupabaseConfig {
  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SUPABASE_CONFIG,
        ...parsed,
      };
    }
  } catch (e) {
    console.error('Failed to parse supabase config:', e);
  }
  return DEFAULT_SUPABASE_CONFIG;
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  try {
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save supabase config:', e);
  }
}

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

export function getSupabaseClient(config?: SupabaseConfig): SupabaseClient | null {
  const activeConfig = config || loadSupabaseConfig();
  if (!activeConfig.url || !activeConfig.anonKey) {
    return null;
  }

  const key = `${activeConfig.url}_${activeConfig.anonKey}`;
  if (cachedClient && cachedConfigKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(activeConfig.url, activeConfig.anonKey);
    cachedConfigKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Error creating Supabase client:', err);
    return null;
  }
}

/**
 * Tests connection to Supabase instance.
 */
export async function testConnection(config: SupabaseConfig): Promise<{ success: boolean; message: string }> {
  try {
    const client = createClient(config.url, config.anonKey);
    // Ping or query table
    const { error } = await client.from(config.table).select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        // relation does not exist
        return {
          success: false,
          message: `Koneksi berhasil, namun tabel '${config.table}' belum dibuat di Supabase. Gunakan schema SQL yang disediakan di bawah.`,
        };
      }
      return {
        success: false,
        message: `Gagal akses: ${error.message} (Kode: ${error.code})`,
      };
    }
    return { success: true, message: 'Koneksi ke Supabase berhasil!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Koneksi gagal diperiksa.' };
  }
}

/**
 * Saves family tree to Supabase.
 */
export async function saveTreeToCloud(
  treeId: string,
  dataset: FamilyTreeDataset,
  config?: SupabaseConfig
): Promise<{ success: boolean; error?: string }> {
  const activeConfig = config || loadSupabaseConfig();
  const client = getSupabaseClient(activeConfig);
  if (!client) {
    return { success: false, error: 'Klien Supabase belum dikonfigurasi.' };
  }

  try {
    const { error } = await client.from(activeConfig.table).upsert(
      {
        id: treeId || 'default-family-tree',
        title: dataset.meta.title || 'Pohon Keluarga',
        data: dataset,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menyimpan ke cloud.' };
  }
}

/**
 * Loads family tree from Supabase.
 */
export async function loadTreeFromCloud(
  treeId: string,
  config?: SupabaseConfig
): Promise<{ success: boolean; dataset?: FamilyTreeDataset; error?: string }> {
  const activeConfig = config || loadSupabaseConfig();
  const client = getSupabaseClient(activeConfig);
  if (!client) {
    return { success: false, error: 'Klien Supabase belum dikonfigurasi.' };
  }

  try {
    const { data, error } = await client
      .from(activeConfig.table)
      .select('data')
      .eq('id', treeId || 'default-family-tree')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || !data.data) {
      return { success: false, error: 'Data pohon tidak ditemukan di cloud.' };
    }

    return { success: true, dataset: data.data as FamilyTreeDataset };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengambil data dari cloud.' };
  }
}
