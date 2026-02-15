// pages/UserPublicProfile.tsx - PUBLIC PROFILE (NO TOKENS)
// View untuk melihat profile user lain tanpa menampilkan token/lisensi

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Crown, Shield, Users, Calendar, ArrowLeft, Loader2,
  ExternalLink, Package, Star
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import ProductCard from '../components/ProductCard';
import type { ModItem } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────
interface PublicUserProfile {
  discordId:     string;
  username:      string;
  avatarUrl:     string | null;
  guildRoles:    string[];
  tier:          'VIP' | 'BASIC' | 'GUEST';
  guildJoinedAt: string | null;
}

// ── Tier Config ───────────────────────────────────────────────────────────
const TIER_CONFIG: Record<string, any> = {
  VIP: {
    label:     'VIP',
    icon:      <Crown size={12} />,
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    glow:      'shadow-yellow-500/30',
  },
  BASIC: {
    label:     'BASIC',
    icon:      <Shield size={12} />,
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    glow:      'shadow-blue-500/20',
  },
  GUEST: {
    label:     'GUEST',
    icon:      <Users size={12} />,
    className: 'bg-zinc-700/30 text-zinc-500 border-zinc-600/30',
    glow:      '',
  },
};

// ── Role Colors ───────────────────────────────────────────────────────────
const getRoleColor = (role: string): string => {
  const name = role.toLowerCase();
  if (name.includes('admin') || name.includes('owner') || name.includes('founder'))
    return 'bg-red-500/10 text-red-400 border-red-600/30';
  if (name.includes('vip') || name.includes('premium'))
    return 'bg-yellow-500/10 text-yellow-400 border-yellow-600/30';
  if (name.includes('verified') || name.includes('modder'))
    return 'bg-blue-500/10 text-blue-400 border-blue-600/30';
  return 'bg-zinc-800/50 text-zinc-500 border-zinc-700/30';
};

// ── Main Component ────────────────────────────────────────────────────────
const UserPublicProfile: React.FC = () => {
  const { discordId } = useParams<{ discordId: string }>();

  const [user, setUser]       = useState<PublicUserProfile | null>(null);
  const [mods, setMods]       = useState<ModItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!discordId) return;
    fetchUserProfile();
  }, [discordId]); // eslint-disable-line

  const fetchUserProfile = async () => {
    if (!discordId) return;
    
    setLoading(true);
    setError('');

    try {
      // 1. Fetch user info from user_sessions
      const { data: sessionData, error: sessionError } = await supabase
        .from('user_sessions')
        .select('discord_id, username, avatar_url, guild_roles, tier, guild_joined_at')
        .eq('discord_id', discordId)
        .maybeSingle();

      if (sessionError) throw sessionError;

      if (!sessionData) {
        // User tidak ditemukan di session, coba fetch dari Discord API
        const discordRes = await fetch(`/api/discord-user?id=${discordId}`);
        if (discordRes.ok) {
          const discordData = await discordRes.json();
          setUser({
            discordId,
            username:      discordData.username || 'Unknown User',
            avatarUrl:     discordData.avatar,
            guildRoles:    [],
            tier:          'GUEST',
            guildJoinedAt: null,
          });
        } else {
          throw new Error('User tidak ditemukan');
        }
      } else {
        setUser({
          discordId:     sessionData.discord_id,
          username:      sessionData.username,
          avatarUrl:     sessionData.avatar_url,
          guildRoles:    sessionData.guild_roles || [],
          tier:          sessionData.tier || 'GUEST',
          guildJoinedAt: sessionData.guild_joined_at,
        });
      }

      // 2. Fetch user's uploaded mods (ONLY approved ones)
      const { data: modsData, error: modsError } = await supabase
        .from('mods')
        .select('*')
        .eq('uploaded_by', discordId)
        .in('approval_status', ['official', 'verified', 'unofficial'])
        .order('created_at', { ascending: false });

      if (modsError) throw modsError;

      setMods((modsData || []).map((m: any) => ({
        id:            m.id,
        title:         m.title,
        description:   m.description,
        category:      m.category,
        platform:      m.platform,
        imageUrl:      m.image_url    || '',
        mediaUrl:      m.media_url    || '',
        downloadUrl:   m.download_url,
        isPremium:     m.is_premium,
        dateAdded:     new Date(m.created_at).toISOString().split('T')[0],
        author:        m.author,
        downloadCount: m.download_count ?? undefined,
        rating:        m.rating         ?? undefined,
        ratingCount:   m.rating_count   ?? undefined,
        tags:          m.tags           ?? [],
        created_at:    m.created_at,
        approval_status: m.approval_status ?? 'unofficial',
        uploaded_by:   m.uploaded_by,
      })));

    } catch (err: any) {
      console.error('[UserPublicProfile]', err);
      setError(err.message || 'Gagal memuat profil');
    } finally {
      setLoading(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-green-500" />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────
  if (error || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <Users size={48} className="text-zinc-700 mx-auto" />
          <h2 className="text-white font-black text-xl">User Tidak Ditemukan</h2>
          <p className="text-zinc-500 text-sm max-w-sm mx-auto">{error || 'User dengan ID ini tidak terdaftar di server.'}</p>
          <Link
            to="/mods"
            className="inline-block text-green-400 hover:text-green-300 text-sm underline"
          >
            ← Kembali ke Gudang Mod
          </Link>
        </div>
      </div>
    );
  }

  const tierConfig = TIER_CONFIG[user.tier] || TIER_CONFIG.GUEST;
  const totalMods  = mods.length;
  const totalDownloads = mods.reduce((sum, m) => sum + (m.downloadCount || 0), 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-16">
      {/* Header Bar */}
      <div className="border-b border-zinc-800/60 bg-[#0d0d0d] px-4 py-5">
        <div className="max-w-5xl mx-auto">
          <Link
            to="/mods"
            className="text-zinc-600 hover:text-white flex items-center gap-1.5 text-xs mb-3 transition-colors"
          >
            <ArrowLeft size={13} /> Kembali ke Gudang Mod
          </Link>
          <div className="flex items-center gap-3">
            <Users size={20} className="text-green-500" />
            <h1 className="text-xl font-black tracking-tight">PROFIL MEMBER</h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT - Profile Card */}
          <div className="lg:col-span-1">
            <div className={`bg-[#141414] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl ${tierConfig.glow}`}>
              {/* Avatar + Tier */}
              <div className="p-6 text-center border-b border-zinc-800/50">
                <div className="relative inline-block mb-4">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.username}
                      className="w-24 h-24 rounded-2xl object-cover border-4 border-zinc-900"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-zinc-800 border-4 border-zinc-900 flex items-center justify-center text-white font-black text-3xl">
                      {user.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className={`absolute -bottom-2 -right-2 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 ${tierConfig.className} shadow-lg`}>
                    {tierConfig.icon}
                    {tierConfig.label}
                  </div>
                </div>

                <h2 className="text-xl font-black text-white mb-1">{user.username}</h2>

                <a
                  href={`https://discord.com/users/${user.discordId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-zinc-600 hover:text-indigo-400 flex items-center justify-center gap-1 transition-colors"
                >
                  Discord Profile <ExternalLink size={9} />
                </a>

                {user.guildJoinedAt && (
                  <div className="flex items-center justify-center gap-1.5 text-zinc-500 text-xs mt-3">
                    <Calendar size={11} />
                    <span>
                      Bergabung{' '}
                      {new Date(user.guildJoinedAt).toLocaleDateString('id-ID', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="p-6 space-y-3">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">
                  Statistik
                </h3>

                <div className="flex items-center justify-between bg-zinc-900/40 rounded-lg px-3 py-2.5">
                  <span className="text-zinc-500 text-xs flex items-center gap-1.5">
                    <Package size={11} /> Total Mod
                  </span>
                  <span className="text-green-400 font-bold text-sm">{totalMods}</span>
                </div>

                <div className="flex items-center justify-between bg-zinc-900/40 rounded-lg px-3 py-2.5">
                  <span className="text-zinc-500 text-xs flex items-center gap-1.5">
                    <Star size={11} /> Total Download
                  </span>
                  <span className="text-yellow-400 font-bold text-sm">{totalDownloads.toLocaleString()}</span>
                </div>
              </div>

              {/* Roles */}
              {user.guildRoles.length > 0 && (
                <div className="p-6 pt-0">
                  <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">
                    Role di Server
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {user.guildRoles.slice(0, 8).map((role) => (
                      <span
                        key={role}
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg ${getRoleColor(role)}`}
                      >
                        {role}
                      </span>
                    ))}
                    {user.guildRoles.length > 8 && (
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-zinc-800/60 text-zinc-500 border border-zinc-700/40">
                        +{user.guildRoles.length - 8} lainnya
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT - Uploaded Mods */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-black text-white">MOD YANG DIUPLOAD</h2>
                <p className="text-zinc-600 text-xs mt-0.5">
                  {totalMods} mod dipublish • {totalDownloads.toLocaleString()} total download
                </p>
              </div>
            </div>

            {mods.length === 0 ? (
              <div className="bg-[#141414] border border-zinc-800/60 rounded-xl p-12 text-center">
                <Package size={40} className="text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-600 text-sm">User ini belum mengupload mod apapun.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mods.map((mod) => (
                  <Link key={mod.id} to={`/mod/${mod.id}`}>
                    <ProductCard mod={mod} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPublicProfile;