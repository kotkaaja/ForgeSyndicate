import { supabase } from '../lib/supabase';           // ✅ path asli dipertahankan
import { ModItem, ServiceItem } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// USER ROLE  (masih dipakai Admin.tsx & file-file lama)
// ─────────────────────────────────────────────────────────────────────────────
export type UserRole = 'GUEST' | 'BASIC' | 'VIP' | 'ADMIN';

export const getUserRole = (): UserRole => {
  return (localStorage.getItem('forge_role') as UserRole) || 'GUEST';
};

export const logout = (): void => {
  localStorage.removeItem('forge_role');
  localStorage.removeItem('ds_session_id');
  window.location.reload();
};

// ─────────────────────────────────────────────────────────────────────────────
// VipProfile — TYPE STUB (backward compat, sistem baru pakai AuthContext)
// ─────────────────────────────────────────────────────────────────────────────
export interface VipProfile {
  token:    string;
  role:     string;
  expiry:   string | null;
  userId:   string | null;
  username: string | null;
  avatar:   string | null;
}

/** @deprecated Gunakan useAuth() dari AuthContext. Selalu return null. */
export const getVipProfile = (): VipProfile | null => null;

// validateVipToken — DEPRECATED
export const validateVipToken = async (_token: string): Promise<boolean> => {
  console.warn('[deprecated] validateVipToken tidak dipakai lagi. Gunakan Discord OAuth.');
  return false;
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────
export const checkAdmin = async (password: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('username')
      .eq('password', password)
      .single();
    return !error && !!data;
  } catch {
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MODS
// ─────────────────────────────────────────────────────────────────────────────
const mapMod = (item: any): ModItem => ({
  id:            item.id,
  title:         item.title,
  description:   item.description,
  category:      item.category,
  platform:      item.platform,
  imageUrl:      item.image_url    || '',
  mediaUrl:      item.media_url    || '',
  downloadUrl:   item.download_url,
  isPremium:     item.is_premium,
  dateAdded:     new Date(item.created_at).toISOString().split('T')[0],
  author:        item.author,
  downloadCount: item.download_count ?? undefined,
  rating:        item.rating         ?? undefined,
  ratingCount:   item.rating_count   ?? undefined,
  tags:          item.tags           ?? [],
  created_at:    item.created_at,
  // ── BARU: approval_status untuk badge label ──
  approval_status: item.approval_status ?? 'unofficial',
  uploaded_by:     item.uploaded_by     ?? null,
});

// ── getMods — PUBLIK: hanya tampilkan yang sudah approved ────────────────────
// pending → TERSEMBUNYI dari halaman publik
export const getMods = async (): Promise<ModItem[]> => {
  const { data, error } = await supabase
    .from('mods')
    .select('*')
    // Hanya official, verified, unofficial yang muncul ke publik
    .in('approval_status', ['official', 'verified', 'unofficial'])
    .order('created_at', { ascending: false });

  if (error) { console.error(error); return []; }
  return data.map(mapMod);
};

// ── getMyMods — USER MANAGE: semua mod milik sendiri termasuk pending ─────────
export const getMyMods = async (discordId: string): Promise<ModItem[]> => {
  if (!discordId) return [];
  const { data, error } = await supabase
    .from('mods')
    .select('*')
    .eq('uploaded_by', discordId)
    .order('created_at', { ascending: false });

  if (error) { console.error(error); return []; }
  return data.map(mapMod);
};

// ── getPendingModCount — badge notif pending di admin panel ──────────────────
export const getPendingModCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('mods')
    .select('id', { count: 'exact', head: true })
    .eq('approval_status', 'pending');
  if (error) return 0;
  return count || 0;
};

export const getModById = async (id: string): Promise<ModItem | undefined> => {
  const { data, error } = await supabase
    .from('mods').select('*').eq('id', id).single();
  if (error || !data) return undefined;
  return mapMod(data);
};

export const saveMod = async (mod: ModItem): Promise<void> => {
  const payload = {
    title:        mod.title,
    description:  mod.description,
    category:     mod.category,
    platform:     mod.platform,
    image_url:    mod.imageUrl    || null,
    media_url:    mod.mediaUrl    || null,
    download_url: mod.downloadUrl,
    is_premium:   mod.isPremium,
    author:       mod.author,
    tags:         mod.tags ?? [],
    // Admin yang save manual lewat panel = langsung official
    approval_status: (mod as any).approval_status ?? 'official',
  };
  if (mod.id) {
    const { error } = await supabase.from('mods').update(payload).eq('id', mod.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('mods').insert([payload]);
    if (error) throw error;
  }
};

export const deleteMod = async (id: string): Promise<void> => {
  const { error } = await supabase.from('mods').delete().eq('id', id);
  if (error) throw error;
};

// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD COUNTER
// ─────────────────────────────────────────────────────────────────────────────
export const incrementDownload = async (modId: string, discordId?: string): Promise<void> => {
  if (discordId) {
    try {
      await supabase
        .from('download_history')
        .upsert({ mod_id: modId, discord_id: discordId }, { onConflict: 'mod_id,discord_id' });
    } catch {
      // abaikan error history
    }
  }

  const { error } = await supabase.rpc('increment_download', { mod_id: modId });
  if (error) {
    const { data } = await supabase
      .from('mods').select('download_count').eq('id', modId).single();
    await supabase
      .from('mods')
      .update({ download_count: (data?.download_count ?? 0) + 1 })
      .eq('id', modId);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD HISTORY
// ─────────────────────────────────────────────────────────────────────────────
export const getDownloadHistory = async (discordId: string): Promise<ModItem[]> => {
  const { data: histData, error: histError } = await supabase
    .from('download_history')
    .select('mod_id, created_at')
    .eq('discord_id', discordId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (histError || !histData || histData.length === 0) return [];

  const modIds = histData.map((h: any) => h.mod_id).filter(Boolean);
  if (modIds.length === 0) return [];

  const { data: modsData, error: modsError } = await supabase
    .from('mods')
    .select('*')
    .in('id', modIds);

  if (modsError || !modsData) return [];

  const modsMap = new Map(modsData.map((m: any) => [m.id, m]));
  return modIds
    .map((id: string) => modsMap.get(id))
    .filter(Boolean)
    .map(mapMod);
};

// ─────────────────────────────────────────────────────────────────────────────
// SERVICES (static)
// ─────────────────────────────────────────────────────────────────────────────
export const getServices = (): ServiceItem[] => [
  {
    id: '1',
    title: 'Jasa Scripting Moonloader',
    description: 'Pembuatan script Custom Lua untuk automation, atau mempermudah gameplay.',
    priceStart: 'Rp 25.000',
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1000',
  },
  {
    id: '2',
    title: 'Jasa Pembuatan Bot Discord',
    description: 'Bot Server Discord untuk membantu membangun komunitas anda.',
    priceStart: 'Rp 50.000',
    imageUrl: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?q=80&w=1000',
  },
];