export type PlatformType = 'PC' | 'Android' | 'Universal';

// Moonloader & Monetloader digabung jadi "Loader"
export type CategoryType = 'Moonloader' | 'CLEO' | 'Skin' | 'Modpack' | 'Client';

export type UserRole = 'GUEST' | 'VIP' | 'ADMIN';

export interface ModItem {
  id: string;
  title: string;
  description: string;
  category: CategoryType;
  platform: PlatformType;
  imageUrl: string;
  mediaUrl?: string;
  downloadUrl: string;
  isPremium: boolean;
  dateAdded: string;
  author: string;
  downloadCount?: number;   // #3 download counter
  rating?: number;          // #4 rata-rata rating (0-5)
  ratingCount?: number;     // #4 jumlah vote
  tags?: string[];          // #5 tag bebas ("Hot", "New", "Updated", dll)
  created_at: string;       // ✅ FIX: timestamp dari database untuk download history
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  priceStart: string;
  imageUrl: string;
}

// #10 Moonloader + Monetloader = Loader
export const CATEGORIES: CategoryType[] = ['Moonloader', 'CLEO', 'Skin', 'Modpack', 'Client'];
export const PLATFORMS: PlatformType[] = ['PC', 'Android', 'Universal'];

// Tag presets untuk admin form
export const PRESET_TAGS = ['Hot 🔥', 'New ✨', 'Updated 🔄', 'Trending 📈', 'Popular ⭐', 'Beta 🧪'];

