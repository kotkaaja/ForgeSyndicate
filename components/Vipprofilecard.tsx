import React, { useEffect, useState } from 'react';
import { Crown, Calendar, Download, Shield, User, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getVipProfile, getDownloadHistory, VipProfile } from '../services/data';
import { ModItem } from '../types';

// Badge warna per role
const roleBadge: Record<string, { label: string; className: string }> = {
  vip:    { label: 'VIP',    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-600/40' },
  vips:   { label: 'VIP+',   className: 'bg-yellow-500/20 text-yellow-400 border-yellow-600/40' },
  bassic: { label: 'BASIC',  className: 'bg-blue-500/20 text-blue-400 border-blue-600/40' },
  admin:  { label: 'ADMIN',  className: 'bg-red-500/20 text-red-400 border-red-600/40' },
};

const getRoleBadge = (role: string) =>
  roleBadge[role.toLowerCase()] ?? { label: role.toUpperCase(), className: 'bg-zinc-700 text-zinc-300 border-zinc-600' };

// Format expiry ke teks yang mudah dibaca
const formatExpiry = (expiry: string | null): { text: string; isExpired: boolean; isSoon: boolean } => {
  if (!expiry) return { text: 'Tidak ada batas', isExpired: false, isSoon: false };
  try {
    const exp  = new Date(expiry);
    const now  = new Date();
    const diff = exp.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (diff < 0)  return { text: 'Sudah expired', isExpired: true, isSoon: false };
    if (days <= 7) return { text: `Berakhir ${days} hari lagi`, isExpired: false, isSoon: true };

    return {
      text: exp.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      isExpired: false,
      isSoon: false,
    };
  } catch {
    return { text: expiry, isExpired: false, isSoon: false };
  }
};

// ── Main Component ────────────────────────────────────────────────────────
const VipProfileCard: React.FC = () => {
  const [profile, setProfile]       = useState<VipProfile | null>(null);
  const [history, setHistory]       = useState<ModItem[]>([]);
  const [historyLoading, setHistLoading] = useState(false);
  const [showHistory, setShowHistory]   = useState(false);

  useEffect(() => {
    const p = getVipProfile();
    setProfile(p);
  }, []);

  useEffect(() => {
    if (!showHistory || !profile) return;
    (async () => {
      setHistLoading(true);
      const data = await getDownloadHistory(profile.token);
      setHistory(data);
      setHistLoading(false);
    })();
  }, [showHistory, profile]);

  if (!profile) return null;

  const expiry = formatExpiry(profile.expiry);
  const badge  = getRoleBadge(profile.role);
  const initials = profile.username
    ? profile.username.slice(0, 2).toUpperCase()
    : profile.token.slice(0, 2).toUpperCase();

  return (
    <div className="bg-[#141414] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl mb-5">
      {/* Header gradient */}
      <div className="relative h-16 bg-gradient-to-r from-zinc-900 via-green-900/20 to-zinc-900">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.08) 1px,transparent 1px)', backgroundSize: '16px 16px' }} />
      </div>

      <div className="px-5 pb-5">
        {/* Avatar */}
        <div className="flex items-end gap-3 -mt-8 mb-4">
          <div className="relative flex-shrink-0">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.username || 'User'}
                className="w-16 h-16 rounded-2xl border-4 border-[#141414] object-cover shadow-xl"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl border-4 border-[#141414] bg-zinc-800 flex items-center justify-center text-white font-black text-xl shadow-xl">
                {initials}
              </div>
            )}
            {/* Online dot */}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-[#141414]" />
          </div>

          <div className="pb-1 flex-1 min-w-0">
            <p className="text-white font-black text-base truncate">
              {profile.username || `User ${profile.token.slice(0,6)}...`}
            </p>
            <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${badge.className}`}>
              <Crown size={9} /> {badge.label}
            </span>
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-2.5 text-xs">
          {/* Expiry */}
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 flex items-center gap-1.5"><Calendar size={12} /> Aktif hingga</span>
            <span className={`font-semibold ${expiry.isExpired ? 'text-red-400' : expiry.isSoon ? 'text-yellow-400' : 'text-zinc-300'}`}>
              {expiry.text}
            </span>
          </div>

          {/* Token (masked) */}
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 flex items-center gap-1.5"><Shield size={12} /> Token</span>
            <span className="font-mono text-zinc-400 text-[10px]">
              {profile.token.slice(0,4)}••••{profile.token.slice(-4)}
            </span>
          </div>

          {/* Discord ID */}
          {profile.userId && (
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 flex items-center gap-1.5"><User size={12} /> Discord</span>
              <a
                href={`https://discord.com/users/${profile.userId}`}
                target="_blank" rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                Lihat profil <ExternalLink size={10} />
              </a>
            </div>
          )}
        </div>

        {/* Download history toggle */}
        <button
          onClick={() => setShowHistory(v => !v)}
          className="mt-4 w-full flex items-center justify-between text-xs text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800/60 px-3 py-2.5 rounded-xl transition-all"
        >
          <span className="flex items-center gap-1.5 font-semibold">
            <Download size={12} /> Riwayat Download
          </span>
          {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {/* Download history list */}
        {showHistory && (
          <div className="mt-2 space-y-1.5 animate-in fade-in duration-200">
            {historyLoading ? (
              <div className="py-4 text-center">
                <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin mx-auto" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-center text-zinc-700 text-xs py-3">Belum ada history download.</p>
            ) : (
              history.map(mod => (
                <Link
                  key={mod.id}
                  to={`/mod/${mod.id}`}
                  className="flex items-center gap-2.5 bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/40 rounded-lg px-3 py-2 transition-all group"
                >
                  {/* Thumbnail mini */}
                  <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 bg-zinc-800">
                    {mod.imageUrl ? (
                      <img src={mod.imageUrl} alt={mod.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <Download size={12} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-zinc-300 font-semibold truncate group-hover:text-white transition-colors">
                      {mod.title}
                    </p>
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

export default VipProfileCard;