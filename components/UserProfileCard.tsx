import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Crown, Calendar, Download, Shield, LogOut, ChevronDown,
  ChevronUp, ExternalLink, Clock, Users, Zap, Key, Copy, Check,
  AlertTriangle, Gift, Loader2, RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ModItem } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────
interface TokenEntry {
  token:            string;
  expiry_timestamp: string | null;
  source_alias:     string;
  hwid:             string | null;
  is_current:       boolean;
}

interface ClaimResponse {
  tokens:        TokenEntry[];
  current_token: string;
  hwid:          string | null;
  last_claim_timestamp: string | null;
}

interface DownloadHistoryItem extends ModItem {
  downloaded_at: string;
}

// ── Tier badge config ─────────────────────────────────────────────────────
const TIER_CONFIG: Record<string, any> = {
  VIP: {
    label:     'VIP',
    icon:      <Crown size={10} />,
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    glow:      'shadow-yellow-900/30',
    banner:    'from-yellow-900/20 via-zinc-900 to-zinc-900',
  },
  BASIC: {
    label:     'BASIC',
    icon:      <Shield size={10} />,
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    glow:      'shadow-blue-900/20',
    banner:    'from-blue-900/15 via-zinc-900 to-zinc-900',
  },
  GUEST: {
    label:     'GUEST',
    icon:      <Users size={10} />,
    className: 'bg-zinc-700/50 text-zinc-400 border-zinc-600/40',
    glow:      '',
    banner:    'from-zinc-900 to-zinc-900',
  },
};

// ── Role badge colors ─────────────────────────────────────────────────────
const getRoleColor = (roleName: string): string => {
  const name = roleName.toLowerCase();
  if (name.includes('vip') || name.includes('premium'))
    return 'bg-yellow-500/10 text-yellow-400 border-yellow-600/30';
  if (name.includes('basic') || name.includes('bassic') || name.includes('member'))
    return 'bg-blue-500/10 text-blue-400 border-blue-600/30';
  if (name.includes('admin') || name.includes('owner') || name.includes('mod') || name.includes('founder'))
    return 'bg-red-500/10 text-red-400 border-red-600/30';
  if (name.includes('high council') || name.includes('inner circle'))
    return 'bg-purple-500/10 text-purple-400 border-purple-600/30';
  if (name.includes('bot'))
    return 'bg-zinc-700/30 text-zinc-500 border-zinc-600/20';
  return 'bg-zinc-800/50 text-zinc-500 border-zinc-700/30';
};

// ── Format expiry ─────────────────────────────────────────────────────────
const formatExpiry = (expiry: string | null | undefined) => {
  if (!expiry) return { text: '∞ Tidak terbatas', color: 'text-zinc-500', urgent: false, expired: false };

  try {
    const exp = new Date(expiry);
    if (isNaN(exp.getTime()))
      return { text: 'Format tidak valid', color: 'text-zinc-600', urgent: false, expired: false };

    const now  = new Date();
    const diff = exp.getTime() - now.getTime();
    const days = Math.floor(diff / 86400000);

    if (diff < 0)   return { text: 'Sudah expired!',     color: 'text-red-400',    urgent: true,  expired: true  };
    if (days === 0) return { text: 'Berakhir hari ini!', color: 'text-red-400',    urgent: true,  expired: false };
    if (days <= 3)  return { text: `${days} hari lagi`,  color: 'text-orange-400', urgent: true,  expired: false };
    if (days <= 7)  return { text: `${days} hari lagi`,  color: 'text-yellow-400', urgent: false, expired: false };

    return {
      text: exp.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      color: 'text-zinc-300',
      urgent: false,
      expired: false,
    };
  } catch {
    return { text: expiry, color: 'text-zinc-400', urgent: false, expired: false };
  }
};

// ── Format guild join date ────────────────────────────────────────────────
const formatJoinDate = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return '—'; }
};

// ── Token badge label ─────────────────────────────────────────────────────
const getTokenBadge = (alias: string) => {
  const a = alias.toLowerCase();
  if (a === 'vip' || a === 'vips')
    return { label: 'VIP',   cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-600/30' };
  if (a === 'bassic' || a === 'basic')
    return { label: 'BASIC', cls: 'bg-blue-500/15 text-blue-400 border-blue-600/30' };
  return { label: alias.toUpperCase(), cls: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30' };
};

// ── Single Token Row ──────────────────────────────────────────────────────
const TokenRow: React.FC<{ entry: TokenEntry }> = ({ entry }) => {
  const [copied, setCopied] = useState(false);
  const expiry = formatExpiry(entry.expiry_timestamp);
  const badge  = getTokenBadge(entry.source_alias);

  const handleCopy = () => {
    navigator.clipboard.writeText(entry.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-lg border p-2.5 space-y-1.5 transition-colors ${
      expiry.expired
        ? 'border-red-900/30 bg-red-950/10'
        : entry.is_current
        ? 'border-green-800/40 bg-green-950/10'
        : 'border-zinc-800/50 bg-zinc-900/30'
    }`}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {entry.is_current && !expiry.expired && (
            <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          )}
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider flex-shrink-0 ${badge.cls}`}>
            {badge.label}
          </span>
          {entry.is_current && (
            <span className="text-[9px] text-green-500 font-bold flex-shrink-0">AKTIF</span>
          )}
          {expiry.expired && (
            <span className="text-[9px] text-red-500 font-bold flex-shrink-0 flex items-center gap-0.5">
              <AlertTriangle size={8} /> EXP
            </span>
          )}
        </div>
        <span className={`text-[9px] font-medium flex-shrink-0 ${expiry.color}`}>
          {expiry.urgent && !expiry.expired && '⚠️ '}{expiry.text}
        </span>
      </div>

      {/* Token string + copy */}
      <div className="flex items-center gap-1.5">
        <code className="flex-1 bg-black/40 border border-zinc-800 rounded px-2 py-1 text-[11px] text-green-400 font-mono tracking-wider truncate">
          {entry.token}
        </code>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded border border-zinc-700 transition-colors"
          title="Copy Token"
        >
          {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
        </button>
      </div>

      {/* HWID */}
      <div className="flex items-center justify-between text-[9px] text-zinc-600">
        <span>HWID: {entry.hwid ? (
          <span className="text-green-600 font-mono">{entry.hwid.slice(0, 10)}…</span>
        ) : (
          <span className="text-zinc-700">Belum terdaftar</span>
        )}</span>
      </div>
    </div>
  );
};

// ── Claim Token Section ───────────────────────────────────────────────────
const ClaimTokenSection: React.FC<{ onClaimed: () => void }> = ({ onClaimed }) => {
  const { user } = useAuth();
  const [claiming,  setClaiming]  = useState(false);
  const [cooldown,  setCooldown]  = useState('');
  const [message,   setMessage]   = useState('');

  const hasInnerCircle = user?.guildRoles.some(
    r => r.toLowerCase() === 'inner circle'
  ) ?? false;

  const updateCooldown = useCallback(async () => {
    if (!user?.discordId) return;
    try {
      const res = await fetch(`/api/user?action=claim&userId=${user.discordId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.last_claim_timestamp) {
          const lastClaim = new Date(data.last_claim_timestamp);
          const diff = Date.now() - lastClaim.getTime();
          const weekMs = 7 * 24 * 60 * 60 * 1000;
          
          if (diff < weekMs) {
            const rem = weekMs - diff;
            const days = Math.floor(rem / (24 * 3600000));
            const hours = Math.floor((rem % (24 * 3600000)) / 3600000);
            setCooldown(`${days}h ${hours}j`);
          } else {
            setCooldown('');
          }
        }
      }
    } catch (err) {
      console.error('Failed to check cooldown:', err);
    }
  }, [user?.discordId]);

  useEffect(() => {
    updateCooldown();
  }, [updateCooldown]);

  const handleClaim = async () => {
    if (!user || !hasInnerCircle || cooldown || claiming) return;

    setClaiming(true);
    setMessage('');

    try {
      const sessionId = localStorage.getItem('ds_session_id');
      if (!sessionId) { setMessage('Session expired, login ulang'); return; }

      const res  = await fetch('/api/user?action=claim-token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sessionId }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setMessage(`Cooldown: ${data.wait || '7 hari'}`);
          await updateCooldown();
        } else {
          setMessage(data.error || 'Gagal claim token');
        }
        return;
      }

      setMessage(`✅ Token ${data.tier} berhasil! (${data.duration})`);
      await updateCooldown();
      setTimeout(() => onClaimed(), 2000);
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    } finally {
      setClaiming(false);
    }
  };

  if (!hasInnerCircle) return null;

  return (
    <div className="mb-3 border-t border-zinc-800/50 pt-3">
      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 flex items-center gap-1">
        <Gift size={10} className="text-green-500" />
        Claim Token Gratis
      </p>

      {cooldown ? (
        <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-lg px-3 py-2.5 flex items-center gap-2">
          <Clock size={12} className="text-orange-400 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-orange-400 font-semibold">Cooldown aktif</p>
            <p className="text-[9px] text-zinc-500">{cooldown} lagi</p>
          </div>
        </div>
      ) : (
        <button
          onClick={handleClaim}
          disabled={claiming}
          className="w-full flex items-center justify-center gap-2 bg-green-600/20 hover:bg-green-600/30 border border-green-700/40 hover:border-green-600/60 text-green-400 hover:text-green-300 text-[11px] font-black uppercase tracking-wider py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {claiming
            ? <><Loader2 size={12} className="animate-spin" /> Memproses...</>
            : <><Zap size={12} /> Claim Token Gratis</>}
        </button>
      )}

      {message && (
        <p className={`mt-2 text-center text-[10px] ${
          message.startsWith('✅') ? 'text-green-400' : 'text-orange-400'
        }`}>
          {message}
        </p>
      )}

      <div className="mt-2 text-center space-y-0.5">
        <p className="text-[9px] text-zinc-700">🎁 VIP: 1 hari token &nbsp;⭐ BASIC: 7 hari token</p>
        <p className="text-[9px] text-zinc-700">Cooldown: Sekali per minggu (7 hari)</p>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────
const UserProfileCard: React.FC = () => {
  const { user, logout, isVIP } = useAuth();

  const [showHistory,   setShowHistory]   = useState(false);
  const [history,       setHistory]       = useState<DownloadHistoryItem[]>([]);
  const [histLoading,   setHistLoading]   = useState(false);
  const [showAllRoles,  setShowAllRoles]  = useState(false);
  const [showAllTokens, setShowAllTokens] = useState(false);

  // License state
  const [claim,        setClaim]        = useState<ClaimResponse | null>(null);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError,   setClaimError]   = useState(false);

  // ── Fetch token dari claim.json ───────────────────────────────────────
  const fetchClaim = useCallback(async () => {
    if (!user?.discordId) return;
    setClaimLoading(true);
    setClaimError(false);

    try {
      const res = await fetch(`/api/user?action=claim&userId=${user.discordId}`);
      if (res.status === 404) {
        setClaimLoading(false);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setClaim(data);
    } catch (err) {
      console.error('License check failed:', err);
      setClaimError(true);
    } finally {
      setClaimLoading(false);
    }
  }, [user?.discordId]);

  useEffect(() => {
    fetchClaim();
  }, [fetchClaim]);

  // ── Fetch download history ────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    if (!user?.discordId) return;
    setHistLoading(true);
    try {
      const { data, error } = await supabase
        .from('download_history')
        .select(`
          downloaded_at,
          mods (*)
        `)
        .eq('user_id', user.discordId)
        .order('downloaded_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formatted: DownloadHistoryItem[] = (data || []).map((item: any) => ({
        ...item.mods,
        id: item.mods.id,
        title: item.mods.title,
        description: item.mods.description,
        category: item.mods.category,
        platform: item.mods.platform,
        imageUrl: item.mods.image_url,
        mediaUrl: item.mods.media_url,
        downloadUrl: item.mods.download_url,
        isPremium: item.mods.is_premium,
        dateAdded: item.mods.created_at,
        author: item.mods.author,
        downloadCount: item.mods.download_count,
        rating: item.mods.rating,
        ratingCount: item.mods.rating_count,
        tags: item.mods.tags,
        created_at: item.mods.created_at,
        downloaded_at: item.downloaded_at,
      }));

      setHistory(formatted);
    } catch (e) {
      console.error('Download history error:', e);
      setHistory([]);
    } finally {
      setHistLoading(false);
    }
  }, [user?.discordId]);

  useEffect(() => {
    if (showHistory) {
      fetchHistory();
    }
  }, [showHistory, fetchHistory]);

  if (!user) return null;

  const tier     = TIER_CONFIG[user.tier] || TIER_CONFIG.GUEST;
  const expiry   = formatExpiry(user.expiry);
  const joinDate = formatJoinDate(user.guildJoinedAt);

  const displayRoles  = user.guildRoles.filter(r => r !== '@everyone');
  const visibleRoles  = showAllRoles ? displayRoles : displayRoles.slice(0, 5);
  const hasMoreRoles  = displayRoles.length > 5;

  const allTokens     = claim?.tokens ?? [];
  const visibleTokens = showAllTokens ? allTokens : allTokens.slice(0, 2);
  const hasMoreTokens = allTokens.length > 2;

  return (
    <div className={`bg-[#141414] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl shadow-black/40 ${tier.glow} mb-5`}>

      {/* Banner */}
      <div className={`h-20 bg-gradient-to-r ${tier.banner} relative`}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.08) 1px,transparent 1px)', backgroundSize: '18px 18px' }} />
        {isVIP && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[10px] font-black px-2 py-0.5 rounded-full">
            <Zap size={9} /> PREMIUM
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        {/* Avatar row */}
        <div className="flex items-end justify-between -mt-10 mb-3">
          <div className="relative">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username}
                className="w-16 h-16 rounded-2xl border-4 border-[#141414] object-cover shadow-xl" />
            ) : (
              <div className="w-16 h-16 rounded-2xl border-4 border-[#141414] bg-zinc-800 flex items-center justify-center text-white font-black text-xl">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-[#141414]" />
          </div>

          <button onClick={logout}
            className="flex items-center gap-1.5 text-zinc-600 hover:text-red-400 text-[11px] font-semibold transition-colors bg-zinc-900/60 hover:bg-red-950/40 border border-zinc-800/60 hover:border-red-900/40 px-2.5 py-1.5 rounded-lg">
            <LogOut size={12} /> Keluar
          </button>
        </div>

        {/* Username + tier badge */}
        <div className="mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-black text-base">{user.username}</h3>
            <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${tier.className}`}>
              {tier.icon} {tier.label}
            </span>
          </div>
          <a href={`https://discord.com/users/${user.discordId}`} target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-zinc-600 hover:text-indigo-400 flex items-center gap-1 transition-colors mt-0.5">
            Lihat profil Discord <ExternalLink size={9} />
          </a>
        </div>

        {/* Info grid */}
        <div className="space-y-2 text-xs mb-3">
          <div className="flex items-center justify-between bg-zinc-900/40 rounded-lg px-3 py-2">
            <span className="text-zinc-500 flex items-center gap-1.5"><Clock size={11} /> Aktif hingga</span>
            <span className={`font-bold ${expiry.color}`}>
              {expiry.urgent && '⚠️ '}{expiry.text}
            </span>
          </div>
          <div className="flex items-center justify-between bg-zinc-900/40 rounded-lg px-3 py-2">
            <span className="text-zinc-500 flex items-center gap-1.5"><Calendar size={11} /> Bergabung server</span>
            <span className="text-zinc-300 font-medium">{joinDate}</span>
          </div>
          <div className="flex items-center justify-between bg-zinc-900/40 rounded-lg px-3 py-2">
            <span className="text-zinc-500 flex items-center gap-1.5"><Download size={11} /> Akses download</span>
            <span className={`font-bold ${isVIP ? 'text-yellow-400' : 'text-green-400'}`}>
              {isVIP ? 'VIP + Gratis' : 'Gratis saja'}
            </span>
          </div>
        </div>

        {/* ── LISENSI / TOKEN ───────────────────────────────────────────── */}
        <div className="mb-3 border-t border-zinc-800/50 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-1">
              <Key size={10} className="text-zinc-400" />
              Lisensi Produk
              {allTokens.length > 0 && (
                <span className="ml-auto text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full">
                  {allTokens.length} token
                </span>
              )}
            </p>
            <button onClick={fetchClaim} disabled={claimLoading} className="text-zinc-600 hover:text-white transition-colors">
              <RefreshCw size={10} className={claimLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {claimLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-14 bg-zinc-900/50 rounded-lg" />
              <div className="h-14 bg-zinc-900/50 rounded-lg" />
            </div>
          ) : claimError ? (
            <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-3 text-center">
              <p className="text-[10px] text-red-400">Gagal memuat lisensi</p>
            </div>
          ) : allTokens.length === 0 ? (
            <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-lg p-3 text-center">
              <p className="text-[10px] text-zinc-600">Belum punya token aktif</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleTokens.map((entry, i) => (
                <TokenRow key={`${entry.token}-${i}`} entry={entry} />
              ))}
              {hasMoreTokens && (
                <button
                  onClick={() => setShowAllTokens(v => !v)}
                  className="w-full text-[10px] text-zinc-500 hover:text-zinc-300 text-center py-1 border border-dashed border-zinc-800 rounded-lg transition-colors"
                >
                  {showAllTokens
                    ? 'Sembunyikan'
                    : `+ ${allTokens.length - 2} token lainnya`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── CLAIM TOKEN GRATIS ────────────────────────────────────────── */}
        <ClaimTokenSection onClaimed={fetchClaim} />

        {/* ── ROLES ────────────────────────────────────────────────────── */}
        {displayRoles.length > 0 && (
          <div className="mb-3 border-t border-zinc-800/50 pt-3">
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-2 flex items-center gap-1">
              <Users size={10} /> Role di Server
            </p>
            <div className="flex flex-wrap gap-1.5">
              {visibleRoles.map(role => (
                <span key={role}
                  className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${getRoleColor(role)}`}>
                  {role}
                </span>
              ))}
              {hasMoreRoles && (
                <button onClick={() => setShowAllRoles(v => !v)}
                  className="text-[10px] px-2 py-0.5 rounded border border-zinc-700/50 text-zinc-500 hover:text-zinc-300 transition-colors">
                  {showAllRoles ? 'Sembunyikan' : `+${displayRoles.length - 5} lainnya`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── DOWNLOAD HISTORY ─────────────────────────────────────────── */}
        <button onClick={() => setShowHistory(v => !v)}
          className="w-full flex items-center justify-between text-xs text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800/60 px-3 py-2.5 rounded-xl transition-all">
          <span className="flex items-center gap-1.5 font-semibold">
            <Download size={12} /> Riwayat Download
          </span>
          {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {showHistory && (
          <div className="mt-2 space-y-1.5">
            {histLoading ? (
              <div className="py-4 flex justify-center">
                <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-center text-zinc-700 text-xs py-3">Belum ada history download.</p>
            ) : (
              history.map(mod => (
                <Link key={`${mod.id}-${mod.downloaded_at}`} to={`/mod/${mod.id}`}
                  className="flex items-center gap-2.5 bg-zinc-900/40 hover:bg-zinc-800/50 border border-zinc-800/40 rounded-lg px-3 py-2 transition-all group">
                  <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 bg-zinc-800 border border-zinc-700/50">
                    {mod.imageUrl ? (
                      <img src={mod.imageUrl} alt={mod.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700">
                        <Download size={12} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-zinc-300 font-semibold truncate group-hover:text-white transition-colors">{mod.title}</p>
                    <p className="text-[10px] text-zinc-600">{mod.category}</p>
                  </div>
                  <ExternalLink size={11} className="text-zinc-700 group-hover:text-zinc-400 flex-shrink-0 transition-colors" />
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfileCard;