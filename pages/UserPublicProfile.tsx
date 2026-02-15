// pages/UserPublicProfile.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, Calendar, ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ProductCard from '../components/ProductCard';
import { ModItem } from '../types';

interface UserPublicData {
  discord_id:   string;
  username:     string;
  avatar_url:   string;
  guild_roles:  string[];
  modder_verified: boolean;
  created_at:   string;
}

const MODDER_ROLES   = ['modder', 'script maker', 'lua modder', 'verified modder', 'verified'];
const ADMIN_ROLES    = ['admin', 'administrator', 'owner', 'founder', 'co-founder'];

function getProfileLabel(user: UserPublicData): { label: string; class: string } {
  const lower = (user.guild_roles || []).map(r => r.toLowerCase());
  if (ADMIN_ROLES.some(r => lower.includes(r))) {
    return { label: '⭐ Official', class: 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/40' };
  }
  if (user.modder_verified || lower.includes('verified modder') || lower.includes('verified')) {
    return { label: '✓ Verified Modder', class: 'bg-blue-900/30 text-blue-400 border border-blue-800/40' };
  }
  if (MODDER_ROLES.some(r => lower.includes(r))) {
    return { label: 'Modder', class: 'bg-green-900/30 text-green-400 border border-green-800/40' };
  }
  return { label: 'Member', class: 'bg-zinc-800 text-zinc-400 border border-zinc-700/40' };
}

const ApprovalBadge: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'official') return <span className="text-[9px] font-black px-2 py-0.5 rounded bg-yellow-900/25 text-yellow-400 border border-yellow-800/40">⭐ OFFICIAL</span>;
  if (status === 'verified') return <span className="text-[9px] font-black px-2 py-0.5 rounded bg-blue-900/25 text-blue-400 border border-blue-800/40">✓ VERIFIED</span>;
  return <span className="text-[9px] font-black px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">UNOFFICIAL</span>;
};

const UserPublicProfile: React.FC = () => {
  const { discordId } = useParams<{ discordId: string }>();

  const [userData, setUserData]     = useState<UserPublicData | null>(null);
  const [mods, setMods]             = useState<ModItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [notFound, setNotFound]     = useState(false);
  const [activeFilter, setFilter]   = useState<'all' | 'official' | 'verified' | 'unofficial'>('all');

  useEffect(() => {
    if (!discordId) return;
    fetchProfile();
  }, [discordId]); // eslint-disable-line

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: user, error: userErr } = await supabase
        .from('user_sessions')
        .select('discord_id, username, avatar_url, guild_roles, modder_verified, created_at')
        .eq('discord_id', discordId)
        .single();

      if (userErr || !user) { setNotFound(true); return; }
      setUserData(user);

      const { data: modData } = await supabase
        .from('mods')
        .select('*')
        .eq('uploaded_by', discordId)
        .order('created_at', { ascending: false });

      const mapped: ModItem[] = (modData || []).map(m => ({
        id:             m.id,
        title:          m.title,
        description:    m.description,
        category:       m.category,
        platform:       m.platform,
        imageUrl:       m.image_url,
        mediaUrl:       m.media_url,
        downloadUrl:    m.download_url,
        isPremium:      m.is_premium,
        dateAdded:      m.created_at,
        author:         m.author,
        downloadCount:  m.download_count,
        rating:         m.rating,
        ratingCount:    m.rating_count,
        tags:           m.tags,
      }));
      setMods(mapped);
    } catch {
      setNotFound(true);
    } finally { setLoading(false); }
  };

  const filteredMods = activeFilter === 'all'
    ? mods
    : mods.filter(m => (m as any).approvalStatus === activeFilter);

  const totalDownloads = mods.reduce((s, m) => s + (m.downloadCount || 0), 0);
  const avgRating      = mods.length > 0
    ? (mods.reduce((s, m) => s + (m.rating || 0), 0) / mods.length).toFixed(1)
    : '0.0';

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-zinc-600"/>
    </div>
  );

  if (notFound || !userData) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <AlertTriangle size={40} className="text-yellow-500 mx-auto"/>
        <h2 className="text-white font-black text-lg">User Tidak Ditemukan</h2>
        <p className="text-zinc-500 text-sm">Profil ini tidak ada atau belum pernah login.</p>
        <Link to="/mods" className="text-zinc-600 text-xs underline">← Ke Gudang Mod</Link>
      </div>
    </div>
  );

  const profileLabel = getProfileLabel(userData);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="border-b border-zinc-800/60 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link to="/mods" className="text-zinc-600 hover:text-white flex items-center gap-1.5 text-xs mb-5 transition-colors w-fit">
            <ArrowLeft size={13}/> Kembali
          </Link>
          <div className="flex items-start gap-5">
            <div className="relative shrink-0">
              <img src={userData.avatar_url || '/default-avatar.png'} alt={userData.username}
                className="w-20 h-20 rounded-2xl border-2 border-zinc-700 object-cover"/>
              <span className={`absolute -bottom-1 -right-1 text-[9px] font-black px-2 py-0.5 rounded-lg ${profileLabel.class}`}>
                {profileLabel.label}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black tracking-tight">{userData.username}</h1>
              <p className="text-zinc-600 text-xs mt-1 flex items-center gap-1.5">
                <Calendar size={10}/> Bergabung {new Date(userData.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </p>
              <div className="flex gap-6 mt-3">
                <div className="text-center">
                  <p className="text-white font-black text-xl">{mods.length}</p>
                  <p className="text-zinc-600 text-[10px] uppercase tracking-wider">Mod</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-black text-xl">{totalDownloads.toLocaleString()}</p>
                  <p className="text-zinc-600 text-[10px] uppercase tracking-wider">Download</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-black text-xl">{avgRating}</p>
                  <p className="text-zinc-600 text-[10px] uppercase tracking-wider">Avg Rating</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {mods.length > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {[
              { id: 'all',      label: `Semua (${mods.length})` },
              { id: 'official', label: `⭐ Official (${mods.filter(m => (m as any).approvalStatus === 'official').length})` },
              { id: 'verified', label: `✓ Verified (${mods.filter(m => (m as any).approvalStatus === 'verified').length})` },
              { id: 'unofficial', label: `Unofficial (${mods.filter(m => (m as any).approvalStatus === 'unofficial').length})` },
            ].map(tab => (
              <button key={tab.id} onClick={() => setFilter(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeFilter === tab.id
                    ? 'bg-zinc-700 text-white'
                    : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {filteredMods.length === 0 ? (
          <div className="text-center py-20 text-zinc-700">
            <Package size={40} className="mx-auto mb-3 opacity-40"/>
            <p className="text-sm">{mods.length === 0 ? 'User ini belum upload mod.' : 'Tidak ada mod di kategori ini.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMods.map(mod => (
              <div key={mod.id} className="relative">
                <div className="absolute top-3 left-3 z-10">
                  <ApprovalBadge status={(mod as any).approvalStatus || 'unofficial'}/>
                </div>
                <ProductCard mod={mod}/>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPublicProfile;