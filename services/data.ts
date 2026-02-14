import { supabase } from '../lib/supabase';
import { ModItem, ServiceItem, UserRole } from '../types';

// --- MODS ---

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
    rating:        item.rating        ?? undefined,
    ratingCount:   item.rating_count  ?? undefined,
    tags:          item.tags          ?? [],
  }));
};

export const getModById = async (id: string): Promise<ModItem | undefined> => {
  const { data, error } = await supabase
    .from('mods')
    .select('*')
    .eq('id', id)
    .single();

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
    tags:         mod.tags        ?? [],
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

// Increment download counter (+1) setiap kali tombol download diklik
export const incrementDownload = async (id: string) => {
  // Pakai rpc biar atomic (tidak race condition)
  const { error } = await supabase.rpc('increment_download', { mod_id: id });
  if (error) {
    // Fallback manual kalau rpc belum ada
    const { data } = await supabase.from('mods').select('download_count').eq('id', id).single();
    const current = data?.download_count ?? 0;
    await supabase.from('mods').update({ download_count: current + 1 }).eq('id', id);
  }
};

// --- SERVICES (Static) ---
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

// --- AUTH ---
export const getUserRole = (): UserRole => {
  return (localStorage.getItem('forge_role') as UserRole) || 'GUEST';
};

export const logout = () => {
  localStorage.removeItem('forge_role');
  window.location.reload();
};

export const checkAdmin = async (password: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('username')
      .eq('password', password)
      .single();
    if (error || !data) return false;
    return true;
  } catch { return false; }
};

export const validateVipToken = async (token: string): Promise<boolean> => {
  try {
    const isAdmin = await checkAdmin(token);
    if (isAdmin) { localStorage.setItem('forge_role', 'ADMIN'); return true; }

    const response = await fetch('/api/validate-vip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) return false;

    const result = await response.json();
    if (result.valid) { localStorage.setItem('forge_role', 'VIP'); return true; }
    return false;
  } catch { return false; }
};