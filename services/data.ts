import { supabase } from '../lib/supabase';
import { ModItem, ServiceItem, UserRole } from '../types';

// --- MODS OPERATIONS (SUPABASE) ---

export const getMods = async (): Promise<ModItem[]> => {
  const { data, error } = await supabase
    .from('mods')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching mods:', error);
    return [];
  }

  // Mapping snake_case (DB) ke camelCase (App)
  return data.map((item: any) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    category: item.category,
    platform: item.platform,
    imageUrl: item.image_url,
    mediaUrl: item.media_url,
    downloadUrl: item.download_url,
    isPremium: item.is_premium,
    dateAdded: new Date(item.created_at).toISOString().split('T')[0],
    author: item.author
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
    id: data.id,
    title: data.title,
    description: data.description,
    category: data.category,
    platform: data.platform,
    imageUrl: data.image_url,
    mediaUrl: data.media_url,
    downloadUrl: data.download_url,
    isPremium: data.is_premium,
    dateAdded: new Date(data.created_at).toISOString().split('T')[0],
    author: data.author
  };
};

export const saveMod = async (mod: ModItem) => {
  const payload = {
    title: mod.title,
    description: mod.description,
    category: mod.category,
    platform: mod.platform,
    image_url: mod.imageUrl,
    media_url: mod.mediaUrl,
    download_url: mod.downloadUrl,
    is_premium: mod.isPremium,
    author: mod.author
  };

  if (mod.id) {
    // Update
    const { error } = await supabase
      .from('mods')
      .update(payload)
      .eq('id', mod.id);
    if (error) throw error;
  } else {
    // Insert
    const { error } = await supabase
      .from('mods')
      .insert([payload]);
    if (error) throw error;
  }
};

export const deleteMod = async (id: string) => {
  const { error } = await supabase
    .from('mods')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// --- SERVICES (Static) ---
export const getServices = (): ServiceItem[] => [
 {
    id: '1',
    title: 'Jasa Scripting Moonloader',
    description: 'Pembuatan script Custom Lua untuk automation, atau mempermudah gameplay.',
    priceStart: 'Rp 25.000',
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1000' // Gambar Code
  },
  {
    id: '2',
    title: 'Jasa Pembuatan Bot Discord',
    description: 'Bot Server Discord untuk membantu membangun komunitas anda.',
    priceStart: 'Rp 50.000',
    imageUrl: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?q=80&w=1000' // Gambar Robot/AI
  }
];
// --- AUTH SYSTEM (SUPABASE) ---

export const getUserRole = (): UserRole => {
  const role = localStorage.getItem('forge_role');
  return (role as UserRole) || 'GUEST';
};

export const logout = () => {
  localStorage.removeItem('forge_role');
  window.location.reload();
};

// Cek Admin langsung ke Database
export const checkAdmin = async (password: string): Promise<boolean> => {
  try {
    // Mencari baris di tabel 'admins' yang password-nya cocok
    const { data, error } = await supabase
      .from('admins')
      .select('username')
      .eq('password', password)
      .single();

    if (error || !data) return false;
    
    // Jika data ditemukan, berarti password benar
    return true; 
  } catch (err) {
    console.error(err);
    return false;
  }
};

// Logic VIP Token (External Fetch) - Tidak berubah
export const validateVipToken = async (token: string): Promise<boolean> => {
  try {
    const isAdmin = await checkAdmin(token);
    if (isAdmin) {
      localStorage.setItem('forge_role', 'ADMIN');
      return true;
    }

    const url = `https://delonrp.github.io/tgs.sh/ini-susah.txt?t=${Date.now()}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Gagal menghubungi server validasi.');
    
    const textData = await response.text();
    if (textData.includes(token)) {
      localStorage.setItem('forge_role', 'VIP');
      return true;
    }
    return false;
  } catch (error) {
    console.error("VIP Validation Error:", error);
    return false;
  }
};