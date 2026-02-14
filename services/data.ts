import { supabase } from '../lib/supabase';
import { ModItem, ServiceItem, UserRole } from '../types';

// ── VIP Profile yang disimpan di localStorage ─────────────────────────────
export interface VipProfile {
  userId:   string | null;   // Discord User ID
  role:     string;          // vip / bassic / dll
  expiry:   string | null;   // ISO timestamp
  token:    string;
  // Dari Discord API (di-fetch saat login)
  username: string | null;
  avatar:   string | null;   // URL avatar Discord
}

const PROFILE_KEY = 'forge_vip_profile';

export const saveVipProfile = (profile: VipProfile) => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

export const getVipProfile = (): VipProfile | null => {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const clearVipProfile = () => {
  localStorage.removeItem(PROFILE_KEY);
};

// ── Fetch Discord user info (username + avatar) dari Discord API ──────────
export const fetchDiscordUser = async (userId: string): Promise<{ username: string; avatar: string | null } | null> => {
  // Discord CDN tidak butuh auth untuk avatar kalau kita punya user id + avatar hash
  // Tapi untuk username kita butuh bot token, jadi kita lewat Vercel API proxy
  try {
    const res = await fetch(`/api/discord-user?id=${userId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
};

// ── MODS ──────────────────────────────────────────────────────────────────
export const getMods = async (): Promise<ModItem[]> => {
  const { data, error } = await supabase
    .from('mods')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { console.error('Error fetching mods:', error); return []; }

  return data.map((item: any) => ({
    id:            item.id,
    title:         item.title,
    description:   item.description,
    category:      item.category,
    platform:      item.platform,
    imageUrl:      item.image_url   || '',
    mediaUrl:      item.media_url   || '',
    downloadUrl:   item.download_url,
    isPremium:     item.is_premium,
    dateAdded:     new Date(item.created_at).toISOString().split('T')[0],
    author:        item.author,
    downloadCount: item.download_count ?? undefined,
    rating:        item.rating         ?? undefined,
    ratingCount:   item.rating_count   ?? undefined,
    tags:          item.tags           ?? [],
  }));
};

export const getModById = async (id: string): Promise<ModItem | undefined> => {
  const { data, error } = await supabase
    .from('mods').select('*').eq('id', id).single();

  if (error || !data) return undefined;

  return {
    id:            data.id,
    title:         data.title,
    description:   data.description,
    category:      data.category,
    platform:      data.platform,
    imageUrl:      data.image_url   || '',
    mediaUrl:      data.media_url   || '',
    downloadUrl:   data.download_url,
    isPremium:     data.is_premium,
    dateAdded:     new Date(data.created_at).toISOString().split('T')[0],
    author:        data.author,
    downloadCount: data.download_count ?? undefined,
    rating:        data.rating         ?? undefined,
    ratingCount:   data.rating_count   ?? undefined,
    tags:          data.tags           ?? [],
  };
};

export const saveMod = async (mod: ModItem) => {
  const payload: any = {
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
  };

  if (mod.id) {
    const { error } = await supabase.from('mods').update(payload).eq('id', mod.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('mods').insert([payload]);
    if (error) throw error;
  }
};

export const deleteMod = async (id: string) => {
  const { error } = await supabase.from('mods').delete().eq('id', id);
  if (error) throw error;
};

// ── Download counter ──────────────────────────────────────────────────────
export const incrementDownload = async (modId: string) => {
  const profile = getVipProfile();

  // Catat history download ke Supabase
  if (profile) {
    try {
      await supabase.from('download_history').upsert({
        mod_id:     modId,
        user_token: profile.token,
        user_id:    profile.userId || null,
      }, { onConflict: 'mod_id,user_token' });
    } catch {}
  }

  // Increment counter — coba RPC atomic dulu
  const { error } = await supabase.rpc('increment_download', { mod_id: modId });
  if (error) {
    // Fallback manual
    try {
      const { data } = await supabase.from('mods').select('download_count').eq('id', modId).single();
      await supabase.from('mods').update({ download_count: (data?.download_count ?? 0) + 1 }).eq('id', modId);
    } catch {}
  }
};

// ── Download history for a user token ────────────────────────────────────
export const getDownloadHistory = async (userToken: string): Promise<ModItem[]> => {
  const { data, error } = await supabase
    .from('download_history')
    .select('mod_id, mods(*)')
    .eq('user_token', userToken)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data
    .map((row: any) => row.mods)
    .filter(Boolean)
    .map((item: any) => ({
      id:            item.id,
      title:         item.title,
      description:   item.description,
      category:      item.category,
      platform:      item.platform,
      imageUrl:      item.image_url || '',
      mediaUrl:      item.media_url || '',
      downloadUrl:   item.download_url,
      isPremium:     item.is_premium,
      dateAdded:     new Date(item.created_at).toISOString().split('T')[0],
      author:        item.author,
    }));
};

// ── Services ──────────────────────────────────────────────────────────────
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

// ── Auth ──────────────────────────────────────────────────────────────────
export const getUserRole = (): UserRole => {
  return (localStorage.getItem('forge_role') as UserRole) || 'GUEST';
};

export const logout = () => {
  localStorage.removeItem('forge_role');
  clearVipProfile();
  window.location.reload();
};

export const checkAdmin = async (password: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('admins').select('username').eq('password', password).single();
    if (error || !data) return false;
    return true;
  } catch { return false; }
};

export const validateVipToken = async (token: string): Promise<boolean> => {
  try {
    // 1. Cek Admin dulu
    const isAdmin = await checkAdmin(token);
    if (isAdmin) {
      localStorage.setItem('forge_role', 'ADMIN');
      return true;
    }

    // 2. Validasi via Vercel API (ambil profil lengkap)
    const response = await fetch('/api/validate-vip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) return false;

    const result = await response.json();

    if (result.valid) {
      localStorage.setItem('forge_role', 'VIP');

      // Simpan profil dasar dulu
      const profile: VipProfile = {
        userId:   result.userId   || null,
        role:     result.role     || 'vip',
        expiry:   result.expiry   || null,
        token:    token,
        username: null,
        avatar:   null,
      };

      // Fetch info Discord (username + avatar) jika ada userId
      if (result.userId) {
        try {
          const discordInfo = await fetchDiscordUser(result.userId);
          if (discordInfo) {
            profile.username = discordInfo.username;
            profile.avatar   = discordInfo.avatar;
          }
        } catch {}
      }

      saveVipProfile(profile);
      return true;
    }

    return false;
  } catch (error) {
    console.error('VIP Validation Error:', error);
    return false;
  }
};