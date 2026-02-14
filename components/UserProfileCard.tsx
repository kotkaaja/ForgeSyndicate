import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Crown, Calendar, Download, Shield, LogOut, ChevronDown,
  ChevronUp, ExternalLink, Clock, Users, Zap, Key, Copy, Check
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getDownloadHistory } from '../services/data';
import { ModItem } from '../types';

// ── Interfaces ────────────────────────────────────────────────────────────
interface LicenseData {
  token: string;
  expiry: string;
  type: string;
  hwid?: string;
}

// ── Tier badge config ─────────────────────────────────────────────────────
const TIER_CONFIG: Record<string, any> = {
  VIP: {
    label:  'VIP',
    icon:   <Crown size={10} />,
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    glow:   'shadow-yellow-900/30',
    banner: 'from-yellow-900/20 via-zinc-900 to-zinc-900',
  },
  BASIC: {
    label:  'BASIC',
    icon:   <Shield size={10} />,
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    glow:   'shadow-blue-900/20',
    banner: 'from-blue-900/15 via-zinc-900 to-zinc-900',
  },
  GUEST: {
    label:  'GUEST',
    icon:   <Users size={10} />,
    className: 'bg-zinc-700/50 text-zinc-400 border-zinc-600/40',
    glow:   '',
    banner: 'from-zinc-900 to-zinc-900',
  },
};

// ── Role badge colors ─────────────────────────────────────────────────────
const getRoleColor = (roleName: string): string => {
  const name = roleName.toLowerCase();
  if (name.includes('vip') || name.includes('premium'))
    return 'bg-yellow-500/10 text-yellow-400 border-yellow-600/30';
  if (name.includes('basic') || name.includes('bassic') || name.includes('member'))
    return 'bg-blue-500/10 text-blue-400 border-blue-600/30';
  if (name.includes('admin') || name.includes('owner') || name.includes('mod'))
    return 'bg-red-500/10 text-red-400 border-red-600/30';
  if (name.includes('bot'))
    return 'bg-zinc-700/30 text-zinc-500 border-zinc-600/20';
  return 'bg-zinc-800/50 text-zinc-500 border-zinc-700/30';
};

// ── Format expiry ─────────────────────────────────────────────────────────
const formatExpiry = (expiry: string | null) => {
  if (!expiry) return { text: '∞ Tidak terbatas', color: 'text-zinc-500', urgent: false };
  try {
    const exp  = new Date(expiry);
    const now  = new Date();
    const diff = exp.getTime() - now.getTime();
    const days = Math.floor(diff / 86400000);

    if (diff < 0)   return { text: 'Sudah expired!',           color: 'text-red-400',    urgent: true  };
    if (days === 0) return { text: 'Berakhir hari ini!',       color: 'text-red-400',    urgent: true  };
    if (days <= 3)  return { text: `${days} hari lagi`,        color: 'text-orange-400', urgent: true  };
    if (days <= 7)  return { text: `${days} hari lagi`,        color: 'text-yellow-400', urgent: false };

    return {
      text: exp.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      color: 'text-zinc-300',
      urgent: false,
    };
  } catch {
    return { text: expiry, color: 'text-zinc-400', urgent: false };
  }
};

// ── Format guild join date ────────────────────────────────────────────────
const formatJoinDate = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  } catch { return '—'; }
};

// ── Main Component ────────────────────────────────────────────────────────
const UserProfileCard: React.FC = () => {
  const { user, logout, isVIP } = useAuth();

  const [showHistory, setShowHistory]       = useState(false);
  const [history, setHistory]               = useState<ModItem[]>([]);
  const [histLoading, setHistLoading]       = useState(false);
  const [showAllRoles, setShowAllRoles]     = useState(false);
  
  // State untuk License Claim
  const [license, setLicense] = useState<LicenseData | null>(null);
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch Download History
  useEffect(() => {
    if (!showHistory || !user) return;
    (async () => {
      setHistLoading(true);
      const data = await getDownloadHistory(user.discordId);
      setHistory(data);
      setHistLoading(false);
    })();
  }, [showHistory, user]);

  // Fetch License Data (Claim.json)
  useEffect(() => {
    if (user?.discordId) {
      setLicenseLoading(true);
      fetch(`/api/user/claim?userId=${user.discordId}`)
        .then(res => {
          if (res.ok) return res.json();
          return null; // Silent fail jika user tidak ada di claim.json
        })
        .then(data => {
          if (data) setLicense(data);
        })
        .catch(err => console.error("License check failed:", err))
        .finally(() => setLicenseLoading(false));
    }
  }, [user]);

  const handleCopyToken = () => {
    if (license?.token) {
      navigator.clipboard.writeText(license.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!user) return null;

  const tier        = TIER_CONFIG[user.tier] || TIER_CONFIG.GUEST;
  const expiry      = formatExpiry(user.expiry);
  const joinDate    = formatJoinDate(user.guildJoinedAt);

  // Filter roles
  const displayRoles = user.guildRoles.filter(r => r !== '@everyone');
  const visibleRoles = showAllRoles ? displayRoles : displayRoles.slice(0, 5);
  const hasMoreRoles = displayRoles.length > 5;

  return (
    <div className={`bg-[#141414] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl shadow-black/40 ${tier.glow}`}>

      {/* Banner + Avatar */}
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
                {user.username.slice(0,2).toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-[#141414]" />
          </div>

          {/* Logout */}
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
          {/* Expiry */}
          <div className="flex items-center justify-between bg-zinc-900/40 rounded-lg px-3 py-2">
            <span className="text-zinc-500 flex items-center gap-1.5"><Clock size={11}/> Aktif hingga</span>
            <span className={`font-bold ${expiry.color}`}>
              {expiry.urgent && '⚠️ '}{expiry.text}
            </span>
          </div>

          {/* Join date */}
          <div className="flex items-center justify-between bg-zinc-900/40 rounded-lg px-3 py-2">
            <span className="text-zinc-500 flex items-center gap-1.5"><Calendar size={11}/> Bergabung server</span>
            <span className="text-zinc-300 font-medium">{joinDate}</span>
          </div>

          {/* Download access */}
          <div className="flex items-center justify-between bg-zinc-900/40 rounded-lg px-3 py-2">
            <span className="text-zinc-500 flex items-center gap-1.5"><Download size={11}/> Akses download</span>
            <span className={`font-bold ${isVIP ? 'text-green-400' : 'text-zinc-400'}`}>
              {isVIP ? 'VIP + Gratis' : 'Gratis saja'}
            </span>
          </div>
        </div>

        {/* ── LICENSE INFO SECTION ────────────────────────────────────────── */}
        <div className="mb-3 border-t border-zinc-800/50 pt-3">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 flex items-center gap-1">
            <Key size={10} className="text-zinc-400"/> Lisensi Produk
          </p>

          {licenseLoading ? (
             <div className="animate-pulse flex flex-col gap-2">
                <div className="h-8 bg-zinc-900/50 rounded-lg w-full"></div>
                <div className="h-4 bg-zinc-900/50 rounded-lg w-2/3"></div>
             </div>
          ) : license ? (
            <div className="bg-zinc-900/40 rounded-lg border border-zinc-800/60 p-2.5 space-y-2">
              {/* Token Row */}
              <div>
                <div className="text-[10px] text-zinc-600 font-medium mb-1 flex justify-between">
                  <span>TOKEN ANDA</span>
                  <span className={`uppercase text-[9px] px-1.5 py-0.5 rounded font-bold ${license.type === 'vip' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'}`}>
                    {license.type}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-black/40 border border-zinc-800 rounded px-2 py-1.5 text-xs text-green-400 font-mono tracking-wide truncate">
                    {license.token}
                  </code>
                  <button 
                    onClick={handleCopyToken}
                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded border border-zinc-700 transition-colors"
                    title="Copy Token"
                  >
                    {copied ? <Check size={12} className="text-green-400"/> : <Copy size={12}/>}
                  </button>
                </div>
              </div>

              {/* License Details Grid */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                 <div className="bg-black/20 p-2 rounded">
                    <span className="block text-[9px] text-zinc-600 mb-0.5">EXPIRED DATE</span>
                    <span className="text-[10px] text-zinc-300 font-medium">
                      {formatExpiry(license.expiry).text}
                    </span>
                 </div>
                 <div className="bg-black/20 p-2 rounded">
                    <span className="block text-[9px] text-zinc-600 mb-0.5">HWID STATUS</span>
                    <span className="text-[10px] text-zinc-500 font-mono truncate">
                      {license.hwid ? 'TERDAFTAR' : 'BELUM SET'}
                    </span>
                 </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 text-center">
               <p className="text-[10px] text-red-400 font-medium">Lisensi tidak ditemukan</p>
            </div>
          )}
        </div>
        {/* ─────────────────────────────────────────────────────────────────── */}

        {/* Roles di server */}
        {displayRoles.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-2 flex items-center gap-1">
              <Users size={10}/> Role di Server
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

        {/* Download history */}
        <button onClick={() => setShowHistory(v => !v)}
          className="w-full flex items-center justify-between text-xs text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800/60 px-3 py-2.5 rounded-xl transition-all">
          <span className="flex items-center gap-1.5 font-semibold">
            <Download size={12}/> Riwayat Download
          </span>
          {showHistory ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
        </button>

        {showHistory && (
          <div className="mt-2 space-y-1.5">
            {histLoading ? (
              <div className="py-4 flex justify-center">
                <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin"/>
              </div>
            ) : history.length === 0 ? (
              <p className="text-center text-zinc-700 text-xs py-3">Belum ada history download.</p>
            ) : (
              history.map(mod => (
                <Link key={mod.id} to={`/mod/${mod.id}`}
                  className="flex items-center gap-2.5 bg-zinc-900/40 hover:bg-zinc-800/50 border border-zinc-800/40 rounded-lg px-3 py-2 transition-all group">
                  <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 bg-zinc-800 border border-zinc-700/50">
                    {mod.imageUrl ? (
                      <img src={mod.imageUrl} alt={mod.title} className="w-full h-full object-cover"/>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700">
                        <Download size={12}/>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-zinc-300 font-semibold truncate group-hover:text-white transition-colors">{mod.title}</p>
                    <p className="text-[10px] text-zinc-600">{mod.category} · {mod.platform}</p>
                  </div>
                  <ExternalLink size={11} className="text-zinc-700 group-hover:text-zinc-400 flex-shrink-0 transition-colors"/>
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