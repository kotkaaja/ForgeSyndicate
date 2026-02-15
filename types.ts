export type PlatformType = 'PC' | 'Android' | 'Universal';

export type CategoryType = 'Moonloader' | 'CLEO' | 'Skin' | 'Modpack' | 'Client';

export type UserRole = 'GUEST' | 'VIP' | 'ADMIN';

export type ApprovalStatus = 'official' | 'verified' | 'unofficial' | 'pending';

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
  downloadCount?: number;
  rating?: number;
  ratingCount?: number;
  tags?: string[];
  created_at: string;
  // ── BARU: approval & ownership ──
  approval_status?: ApprovalStatus;
  uploaded_by?: string | null;
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  priceStart: string;
  imageUrl: string;
}

export const CATEGORIES: CategoryType[] = ['Moonloader', 'CLEO', 'Skin', 'Modpack', 'Client'];
export const PLATFORMS: PlatformType[] = ['PC', 'Android', 'Universal'];

export const PRESET_TAGS = ['Hot 🔥', 'New ✨', 'Updated 🔄', 'Trending 📈', 'Popular ⭐', 'Beta 🧪'];