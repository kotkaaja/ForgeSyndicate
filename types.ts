export type PlatformType = 'PC' | 'Android' | 'Universal';
export type CategoryType = 'Moonloader' | 'Monetloader' | 'CLEO' | 'Skin' | 'Modpack' | 'Client';
export type UserRole = 'GUEST' | 'VIP' | 'ADMIN';

export interface ModItem {
  id: string;
  title: string;
  description: string; // Rich text (HTML supported in render)
  category: CategoryType;
  platform: PlatformType;
  imageUrl: string;
  mediaUrl?: string; // YouTube or TikTok link
  downloadUrl: string;
  isPremium: boolean;
  dateAdded: string;
  author: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  priceStart: string;
  imageUrl: string;
}

export const CATEGORIES: CategoryType[] = ['Moonloader', 'Monetloader', 'CLEO', 'Skin', 'Modpack', 'Client'];
export const PLATFORMS: PlatformType[] = ['PC', 'Android', 'Universal'];