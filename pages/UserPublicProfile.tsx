// components/UserProfileCard.tsx - FIXED VERSION
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Crown, Calendar, Download, Shield, LogOut, ChevronDown, Gift,
  ChevronUp, ExternalLink, Clock, Users, Zap, Key, Copy, Check,
  AlertTriangle, Loader2, Star
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ModItem } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────
interface TokenEntry {
  token:            string;
  expiry_timestamp: string | null;
  source_alias:     string;
  hwid:             string | null;
  is_current?:      boolean;
}

interface ClaimResponse {
  tokens:        TokenEntry[];
  current_token: string;
  hwid:          string | null;
}

// ── Tier badge config ─────────────────────────────────────────────────────
const TIER_CONFIG: Record<string, any> = {
  VIP: {
    label:  'VIP',
    icon:   <Crown size={10} />,
    className: 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-400 border border-yellow-500/40',
    glow:   'shadow-lg shadow-yellow-500/30',
    banner: 'from-yellow-900/20 via-zinc-900 to-zinc-900',
  },
  BASIC: {
    label:  'BASIC',
    icon:   <Shield size={10} />,
    className: 'bg-gradient-to-r from-blue-500/15 to-cyan-500/15 text-blue-400 border border-blue-500/30',
    glow:   'shadow-md shadow-blue-500/20',
    banner: 'from-blue-900/15 via-zinc-900 to-zinc-900',
  },
  GUEST: {
    label:  'GUEST',
    icon:   <Users size={10} />,
    className: 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/40',
    glow:   '',
    banner: 'from-zinc-900 to-zinc-900',
  },
};

// ── Role badge colors ─────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  'Admin':          'bg-red-900/30 text-red-400 border border-red-800/40',
  'Owner':          'bg-red-900/30 text-red-400 border border-red-800/40',
  'Co-Founder':     'bg-red-900/30 text-red-400 border border-red-800/40',
  'Founder':        'bg-red-900/30 text-red-400 border border-red-800/40',
  'High Council':   'bg-purple-900/30 text-purple-400 border border-purple-800/40',
  'Inner Circle':   'bg-purple-900/30 text-purple-400 border border-purple-800/40',
  'Vip':            'bg-yellow-900/30 text-yellow-400 border border-yellow-800/40',
  'VIP':            'bg-yellow-900/30 text-yellow-400 border border-yellow-800/40',
  'Verified Modder':'bg-blue-900/30 text-blue-400 border border-blue-800/40',
  'Modder':         'bg-green-900/30 text-green-400 border border-green-800/40',
  'Moderator':      'bg-orange-900/30 text-orange-400 border border-orange-800/40',
};

const getRoleColor = (role: string) =>
  ROLE_COLORS[role] || 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/40';

// ── Format expiry ─────────────────────────────────────────────────────────
const formatExpiry = (expiry: string | null | undefined) => {
  if (!expiry) return { text: '∞ Tidak terbatas', color: 'text-emerald-400', urgent: false, expired: false };

  try {
    const exp = new Date(expiry);
    if (isNaN(exp.getTime())) {
      return { text: 'Format tidak valid', color: 'text-zinc-600', urgent: false, expired: false };
    }

    const now  = new Date();
    const diff = exp.getTime() - now.getTime();
    const days = Math.floor(diff / 86400000);

    if (diff < 0) return { text: 'Expired',            color: 'text-red-400',    urgent: true,  expired: true  };
    if (days === 0) return { text: 'Berakhir hari ini', color: 'text-red-400',    urgent: true,  expired: false };
    if (days <= 3)  return { text: `${days} hari lagi`, color: 'text-orange-400', urgent: true,  expired: false };
    if (days <= 7)  return { text: `${days} hari lagi`, color: 'text-yellow-400', urgent: false, expired: false };

    return {
      text: exp.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      color: 'text-emerald-400',
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
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  } catch {
    return '—';
  }
};

// ── Claim Token Section ───────────────────────────────────────────────────
const ClaimTokenSection: React.FC<{ onClaim: () => void }> = ({ onClaim }) => {
  const { user }      = useAuth();
  const [claiming, setClaiming] = useState(false);
  const [cooldown, setCooldown] = useState('');
  const [message, setMessage]   = useState('');
  
  const hasInnerCircle = user?.guildRoles.some(r => 
    r.toLowerCase() === 'inner circle'
  ) || false;

  useEffect(() => {
    const last = localStorage.getItem(`last_claim_${user?.discordId}`);
    if (last) checkCooldown(last);
  }, [user?.discordId]); // eslint-disable-line

  const checkCooldown = (lastClaimTime: string) => {
    const lastDate = new Date(lastClaimTime);
    const now = new Date();
    const diff = now.getTime() - lastDate.getTime();
    const weekInMs = 7 * 24 * 60 * 60 * 1000;
    
    if (diff < weekInMs) {
      const remaining = weekInMs - diff;
      const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
      const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      setCooldown(`${days} hari ${hours} jam`);
    } else {
      setCooldown('');
    }
  };

  const handleClaim = async () => {
    if (!user || !hasInnerCircle || cooldown) return;
    
    setClaiming(true);
    setMessage('');
    
    try {
      const sessionId = localStorage.getItem('ds_session_id');
      if (!sessionId) {
        setMessage('Session expired, login ulang');
        return;
      }

      const res = await fetch('/api/user?action=claim-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 429) {
          setCooldown(data.wait || '7 hari');
          setMessage(`Cooldown: ${data.wait}`);
        } else {
          setMessage(data.error || 'Gagal claim token');
        }
        return;
      }

      const now = new Date().toISOString();
      localStorage.setItem(`last_claim_${user.discordId}`, now);
      checkCooldown(now);

      setMessage(`✅ Token ${data.tier} berhasil! (${data.duration} hari)`);
      
      // Reload tokens after 2 seconds
      setTimeout(() => {
        onClaim();
      }, 2000);
      
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    } finally {
      setClaiming(false);
    }
  };

  if (!hasInnerCircle) {
    return (
      <div className="mt-4 pt-4 border-t border-zinc-800/40">
        <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-xl px-4 py-3 text-center">
          <Users size={20} className="text-zinc-600 mx-auto mb-2"/>
          <p className="text-zinc-500 text-xs leading-relaxed">
            Butuh role <span className="text-purple-400 font-semibold">Inner Circle</span> untuk claim token gratis
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-zinc-800/40">
      <div className="flex items-center gap-2 mb-3">
        <Gift size={14} className="text-green-400"/>
        <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Claim Token Gratis</h4>
      </div>

      {cooldown ? (
        <div className="bg-orange-900/15 border border-orange-800/30 rounded-xl px-4 py-3 flex items-start gap-3">
          <Clock size={16} className="text-orange-400 shrink-0 mt-0.5"/>
          <div>
            <p className="text-orange-400 text-xs font-semibold">Cooldown Aktif</p>
            <p className="text-zinc-500 text-[11px] mt-1">{cooldown} lagi</p>
          </div>
        </div>
      ) : (
        <button 
          onClick={handleClaim} 
          disabled={claiming}
          className="w-full bg-green-900/25 hover:bg-green-800/40 border border-green-800/40 hover:border-green-700/60 text-green-400 hover:text-green-300 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {claiming ? (
            <><Loader2 size={14} className="animate-spin"/> Memproses...</>
          ) : (
            <><Zap size={14}/> CLAIM TOKEN GRATIS</>
          )}
        </button>
      )}
      
      {message && (
        <div className={`mt-2 text-center text-[11px] ${
          message.includes('✅') ? 'text-green-400' : 'text-orange-400'
        }`}>
          {message}
        </div>
      )}
      
      <div className="mt-3 text-center space-y-1">
        <p className="text-zinc-700 text-[10px]">
          🎁 VIP: 1 hari • ⭐ BASIC: 7 hari
        </p>
        <p className="text-zinc-700 text-[10px]">
          Cooldown: 7 hari (sekali per minggu)
        </p>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────
const UserProfileCard: React.FC = () => {
  const { user, logout } = useAuth();
  
  const [tokens, setTokens]       = useState<TokenEntry[]>([]);
  const [history, setHistory]     = useState<ModItem[]>([]);
  const [showHist, setShowHist]   = useState(false);
  const [showMore, setShowMore]   = useState(false);
  const [copiedId, setCopiedId]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]); // eslint-disable-line

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Fetch tokens dari GitHub via /api/user/claim
      const tokRes = await fetch(`/api/user?action=claim&userId=${user.discordId}`);
      if (tokRes.ok) {
        const tokData: ClaimResponse = await tokRes.json();
        setTokens(tokData.tokens || []);
      }

      // Fetch download history
      const sessionId = localStorage.getItem('ds_session_id');
      if (sessionId) {
        const histRes = await fetch(`/api/user?action=downloads&sessionId=${sessionId}`);
        if (histRes.ok) {
          const histData = await histRes.json();
          setHistory(histData || []);
        }
      }
    } catch (err) {
      console.error('[UserProfileCard]', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToken = async (token: string, id: string) => {
    await navigator.clipboard.writeText(token);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!user) return null;

  const tierConfig     = TIER_CONFIG[user.tier] || TIER_CONFIG['GUEST'];
  const displayedRoles = showMore ? user.guildRoles : user.guildRoles.slice(0, 6);
  const hasExpiring    = tokens.some(t => {
    if (!t.expiry_timestamp) return false;
    const diff = new Date(t.expiry_timestamp).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 3600000; // < 7 hari
  });

  return (
    <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800/60 rounded-2xl overflow-hidden shadow-2xl">
      {/* Banner gradient */}
      <div className={`h-20 bg-gradient-to-r ${tierConfig.banner} relative`}>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>
      </div>

      <div className="px-5 pb-5 -mt-10 relative">
        {/* Avatar + Tier Badge */}
        <div className="flex items-end gap-4 mb-4">
          <div className="relative group">
            <div className={`absolute inset-0 rounded-2xl ${tierConfig.glow} blur-xl transition-all duration-300`}></div>
            <img 
              src={user.avatarUrl || '/default-avatar.png'} 
              alt={user.username}
              className="w-20 h-20 rounded-2xl border-4 border-zinc-900 object-cover relative z-10 group-hover:scale-105 transition-transform duration-200"
            />
            <div className={`absolute -bottom-1 -right-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 ${tierConfig.className} z-20`}>
              {tierConfig.icon}
              {tierConfig.label}
            </div>
          </div>

          <div className="flex-1 min-w-0 pb-1">
            <h3 className="font-black text-white text-lg truncate">{user.username}</h3>
            <div className="flex items-center gap-2 text-zinc-500 text-xs mt-1">
              <Calendar size={11}/>
              <span>Bergabung {formatJoinDate(user.guildJoinedAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-500 text-xs mt-1">
              <Download size={11}/>
              <span className={user.tier === 'VIP' ? 'text-yellow-400 font-semibold' : 'text-green-400 font-semibold'}>
                Akses: {user.tier === 'VIP' ? 'VIP + Gratis' : 'Gratis'}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-800/40 text-red-400 hover:text-red-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200"
          >
            <LogOut size={13}/> Logout
          </button>
        </div>

        {/* Expiring warning */}
        {hasExpiring && (
          <div className="mb-4 bg-orange-900/20 border border-orange-800/40 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle size={18} className="text-orange-400 shrink-0"/>
            <p className="text-orange-400 text-sm font-medium">
              Ada token yang akan expired dalam 7 hari!
            </p>
          </div>
        )}

        {/* Token list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Key size={11}/> Lisensi Produk
            </h4>
            {tokens.length > 0 && (
              <span className="bg-zinc-800/60 text-zinc-400 text-[10px] font-bold px-2 py-1 rounded-lg">
                {tokens.length} TOKEN
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-zinc-600"/>
            </div>
          ) : tokens.length > 0 ? (
            <div className="space-y-2">
              {tokens.map((tok, i) => {
                const expInfo = formatExpiry(tok.expiry_timestamp);
                const tier = tok.source_alias?.toUpperCase() || 'BASIC';
                
                return (
                  <div 
                    key={i} 
                    className={`rounded-xl border px-4 py-3 transition-all duration-200 ${
                      expInfo.expired 
                        ? 'border-red-900/40 bg-red-950/20 opacity-60' 
                        : expInfo.urgent
                        ? 'border-orange-800/40 bg-orange-950/10'
                        : 'border-zinc-800/40 bg-zinc-900/30 hover:bg-zinc-900/50'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${
                        tier === 'VIP' 
                          ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/40' 
                          : 'bg-blue-900/30 text-blue-400 border border-blue-800/40'
                      }`}>
                        {tier}
                      </span>
                      <div className={`text-[11px] font-semibold flex items-center gap-1.5 ${expInfo.color}`}>
                        <Clock size={10}/>
                        {expInfo.text}
                        {expInfo.urgent && !expInfo.expired && ' ⚠️'}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-black/40 text-green-400 text-[11px] font-mono px-3 py-2 rounded-lg border border-zinc-800/60 truncate">
                        {tok.token}
                      </code>
                      <button 
                        onClick={() => copyToken(tok.token, tok.token)}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-all duration-200"
                      >
                        {copiedId === tok.token ? <Check size={12} className="text-green-400"/> : <Copy size={12}/>}
                      </button>
                    </div>

                    {tok.is_current && (
                      <div className="mt-2 flex items-center gap-1.5 text-emerald-400 text-[10px] font-semibold">
                        <Star size={9} className="fill-emerald-400"/>
                        Token Aktif
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-xl px-4 py-6 text-center">
              <Key size={24} className="text-zinc-700 mx-auto mb-2"/>
              <p className="text-zinc-600 text-sm">Belum punya token aktif</p>
            </div>
          )}
        </div>

        {/* Claim Token */}
        <ClaimTokenSection onClaim={fetchData}/>

        {/* Roles */}
        {user.guildRoles.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-800/40">
            <h4 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-3">
              <Shield size={11}/> Role di Server
            </h4>
            <div className="flex flex-wrap gap-2">
              {displayedRoles.map(role => (
                <span 
                  key={role} 
                  className={`text-[10px] font-semibold px-3 py-1.5 rounded-lg ${getRoleColor(role)} transition-all duration-200 hover:scale-105`}
                >
                  {role}
                </span>
              ))}
              {user.guildRoles.length > 6 && (
                <button 
                  onClick={() => setShowMore(!showMore)}
                  className="text-[10px] font-semibold px-3 py-1.5 rounded-lg bg-zinc-800/60 text-zinc-400 hover:text-white border border-zinc-700/40 transition-all duration-200"
                >
                  {showMore ? '- Sembunyikan' : `+ ${user.guildRoles.length - 6} lainnya`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Download History */}
        <div className="mt-4 pt-4 border-t border-zinc-800/40">
          <button 
            onClick={() => setShowHist(!showHist)}
            className="w-full flex items-center justify-between text-[11px] font-black text-zinc-500 hover:text-zinc-300 uppercase tracking-widest transition-colors py-1 group"
          >
            <span className="flex items-center gap-2">
              <Download size={11} className="group-hover:translate-y-0.5 transition-transform"/> 
              Riwayat Download
            </span>
            {showHist ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
          </button>
          
          {showHist && (
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              {history.length === 0 ? (
                <div className="text-center py-6">
                  <Download size={24} className="text-zinc-700 mx-auto mb-2"/>
                  <p className="text-zinc-600 text-xs">Belum ada riwayat download</p>
                </div>
              ) : history.map(item => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between bg-zinc-900/30 hover:bg-zinc-900/50 border border-zinc-800/40 rounded-lg px-3 py-2.5 transition-all duration-200"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-300 text-xs font-semibold truncate">{item.title}</p>
                    <p className="text-zinc-600 text-[10px] mt-0.5">{item.category}</p>
                  </div>
                  <p className="text-zinc-700 text-[10px] shrink-0 ml-3">
                    {new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="mt-4 pt-4 border-t border-zinc-800/40 grid grid-cols-2 gap-2">
          <Link 
            to="/catalog"
            className="px-4 py-2.5 bg-zinc-800/40 hover:bg-zinc-800/60 border border-zinc-700/40 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200"
          >
            <Download size={12}/> Browse Mods
          </Link>
          <Link 
            to="/upload"
            className="px-4 py-2.5 bg-green-900/20 hover:bg-green-900/40 border border-green-800/40 text-green-400 hover:text-green-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200"
          >
            <ExternalLink size={12}/> Upload Mod
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UserProfileCard;