// components/UserProfileCard.tsx — FIXED dengan tier lengkap + Claim Token dari GitHub
import React, { useState, useEffect } from 'react';
import {
  Shield, Download, Star, Calendar, Hash,
  ChevronDown, ChevronUp, Clock, Copy, Check,
  Gift, Loader2, AlertTriangle, Zap, Crown, Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Token {
  token:             string;
  expiry_timestamp:  string | null;
  source_alias:      string;
  hwid:              string | null;
  is_current?:       boolean;
}

interface DownloadHistoryItem {
  id:         string;
  title:      string;
  category:   string;
  created_at: string;
}

interface ClaimResponse {
  tokens:        Token[];
  current_token: string;
  hwid:          string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SESSION_KEY = 'ds_session_id';

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

// Tier display dengan icon
const TIER_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  'GUEST':   { icon: <Users size={11}/>,   color: 'bg-zinc-800 text-zinc-400',        label: 'Guest' },
  'BASIC':   { icon: <Shield size={11}/>,  color: 'bg-blue-500/20 text-blue-400',     label: 'Basic' },
  'MODDER':  { icon: <Star size={11}/>,    color: 'bg-green-500/20 text-green-400',   label: 'Modder' },
  'VERIFIED': { icon: <Check size={11}/>,  color: 'bg-blue-500/20 text-blue-400',     label: 'Verified Modder' },
  'VIP':     { icon: <Crown size={11}/>,   color: 'bg-yellow-500/20 text-yellow-400', label: 'VIP' },
  'ADMIN':   { icon: <Shield size={11}/>,  color: 'bg-red-500/20 text-red-400',       label: 'Admin' },
  'OWNER':   { icon: <Crown size={11}/>,   color: 'bg-red-500/20 text-red-400',       label: 'Owner' },
};

function formatCountdown(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 48) return `${Math.floor(h / 24)} hari`;
  return `${h}j ${m}m`;
}

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return diff > 0 && diff < 3 * 24 * 3600000; // < 3 hari
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

// Deteksi tier dari roles
function detectUserTier(roles: string[]): string {
  const lower = roles.map(r => r.toLowerCase());
  if (lower.includes('owner') || lower.includes('founder') || lower.includes('co-founder')) return 'OWNER';
  if (lower.includes('admin') || lower.includes('administrator')) return 'ADMIN';
  if (lower.includes('vip') || lower.includes('high council')) return 'VIP';
  if (lower.includes('verified modder') || lower.includes('verified')) return 'VERIFIED';
  if (lower.includes('modder') || lower.includes('script maker')) return 'MODDER';
  if (lower.includes('member') || lower.includes('basic')) return 'BASIC';
  return 'GUEST';
}

// ─── Approval Badge ───────────────────────────────────────────────────────────
const ApprovalBadge: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'official') return (
    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-yellow-900/30 text-yellow-400 border border-yellow-800/40">
      ⭐ OFFICIAL
    </span>
  );
  if (status === 'verified') return (
    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-800/40">
      ✓ VERIFIED
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700/40">
      UNOFFICIAL
    </span>
  );
};

// ─── Claim Token Section (dari GitHub) ───────────────────────────────────────
const ClaimTokenSection: React.FC = () => {
  const { user }      = useAuth();
  const { showToast } = useToast();
  const [claiming, setClaiming] = useState(false);
  const [cooldown, setCooldown] = useState('');
  const [lastClaim, setLastClaim] = useState<string | null>(null);
  
  // Cek apakah user punya role Inner Circle
  const hasInnerCircle = user?.guildRoles.some(r => 
    r.toLowerCase() === 'inner circle'
  ) || false;

  useEffect(() => {
    // Cek last claim dari localStorage
    const last = localStorage.getItem(`last_claim_${user?.discordId}`);
    if (last) {
      setLastClaim(last);
      checkCooldown(last);
    }
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
      setCooldown(`${days} hari ${hours} jam lagi`);
    } else {
      setCooldown('');
    }
  };

  const handleClaim = async () => {
    if (!user || !hasInnerCircle) return;
    
    // Cek cooldown 7 hari
    if (lastClaim) {
      const lastDate = new Date(lastClaim);
      const now = new Date();
      const diff = now.getTime() - lastDate.getTime();
      const weekInMs = 7 * 24 * 60 * 60 * 1000;
      
      if (diff < weekInMs) {
        showToast('Kamu bisa claim lagi dalam ' + cooldown, 'error');
        return;
      }
    }

    setClaiming(true);
    try {
      const sessionId = localStorage.getItem(SESSION_KEY);
      if (!sessionId) {
        showToast('Session expired, login ulang', 'error');
        return;
      }

      // Call API claim-token
      const res = await fetch('/api/user/claim-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 429) {
          setCooldown(data.wait || '7 hari');
          showToast('Cooldown aktif: ' + data.wait, 'error');
        } else {
          showToast(data.error || 'Gagal claim token', 'error');
        }
        return;
      }

      // Simpan last claim time
      const now = new Date().toISOString();
      localStorage.setItem(`last_claim_${user.discordId}`, now);
      setLastClaim(now);
      checkCooldown(now);

      showToast(`Token ${data.tier} berhasil diklaim! Berlaku ${data.duration} hari 🎉`);
      
      // Reload tokens
      window.location.reload();
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setClaiming(false);
    }
  };

  if (!hasInnerCircle) {
    return (
      <div className="mt-4 border-t border-zinc-800/60 pt-4">
        <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-lg px-3 py-3 text-center">
          <Users size={16} className="text-zinc-600 mx-auto mb-2"/>
          <p className="text-zinc-600 text-xs">
            Kamu butuh role <span className="text-purple-400 font-bold">Inner Circle</span> untuk claim token gratis
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-zinc-800/60 pt-4">
      <div className="flex items-center gap-2 mb-3">
        <Gift size={13} className="text-green-500"/>
        <h4 className="text-xs font-black text-zinc-300 uppercase tracking-wider">Claim Token Gratis</h4>
      </div>

      {cooldown ? (
        <div className="bg-yellow-900/15 border border-yellow-800/30 rounded-lg px-3 py-2.5 flex items-center gap-2">
          <Clock size={12} className="text-yellow-500 shrink-0"/>
          <div>
            <p className="text-yellow-400 text-xs font-bold">Cooldown aktif</p>
            <p className="text-zinc-500 text-[10px]">{cooldown} bisa claim lagi</p>
          </div>
        </div>
      ) : (
        <button onClick={handleClaim} disabled={claiming}
          className="w-full bg-green-900/25 hover:bg-green-700/40 border border-green-800/40 hover:border-green-600/60 text-green-400 hover:text-green-300 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50">
          {claiming
            ? <><Loader2 size={13} className="animate-spin"/> Memproses...</>
            : <><Zap size={13}/> CLAIM TOKEN GRATIS</>}
        </button>
      )}
      
      <div className="mt-2 text-center space-y-1">
        <p className="text-zinc-700 text-[10px]">
          🎁 VIP: 1 hari token · ⭐ BASIC: 7 hari token
        </p>
        <p className="text-zinc-700 text-[10px]">
          Cooldown: Sekali per minggu (7 hari)
        </p>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const UserProfileCard: React.FC = () => {
  const { user }         = useAuth();
  const { showToast }    = useToast();

  const [tokens, setTokens]       = useState<Token[]>([]);
  const [history, setHistory]     = useState<DownloadHistoryItem[]>([]);
  const [showHist, setShowHist]   = useState(false);
  const [showMore, setShowMore]   = useState(false);
  const [copiedId, setCopiedId]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]); // eslint-disable-line

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch tokens dari GitHub via /api/user/claim
      const tokRes = await fetch(`/api/user/claim?userId=${user.discordId}`);
      if (tokRes.ok) {
        const tokData: ClaimResponse = await tokRes.json();
        setTokens(tokData.tokens || []);
      }

      // Fetch download history
      const sessionId = localStorage.getItem(SESSION_KEY);
      if (sessionId) {
        const histRes = await fetch(`/api/user/downloads?sessionId=${sessionId}`);
        if (histRes.ok) {
          const histData = await histRes.json();
          setHistory(histData || []);
        }
      }
    } catch (err: any) {
      console.error('[UserProfileCard]', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToken = async (token: string, id: string) => {
    await navigator.clipboard.writeText(token);
    setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
    showToast('Token disalin!');
  };

  if (!user) return null;

  const displayedRoles = showMore ? user.guildRoles : user.guildRoles.slice(0, 5);
  const hasExpiring    = tokens.some(t => isExpiringSoon(t.expiry_timestamp));
  const userTier       = detectUserTier(user.guildRoles);
  const tierConfig     = TIER_CONFIG[userTier] || TIER_CONFIG['GUEST'];

  return (
    <div className="bg-[#111] border border-zinc-800/60 rounded-2xl p-5 space-y-4 relative overflow-hidden">
      {/* Gradient top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-700/40 to-transparent"/>

      {/* Avatar + Info */}
      <div className="flex items-start gap-3">
        <div className="relative">
          <img src={user.avatarUrl || '/default-avatar.png'} alt={user.username}
            className="w-14 h-14 rounded-xl border-2 border-zinc-700 object-cover"/>
          <span className={`absolute -bottom-1 -right-1 text-[8px] font-black px-1.5 py-0.5 rounded-md border flex items-center gap-0.5 ${tierConfig.color}`}>
            {tierConfig.icon}
            {tierConfig.label}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-white text-sm truncate">{user.username}</h3>
          <p className="text-zinc-600 text-[10px] flex items-center gap-1 mt-0.5">
            <Calendar size={9}/> Bergabung {user.guildJoinedAt
              ? new Date(user.guildJoinedAt).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
              : '—'}
          </p>
          <p className="text-zinc-500 text-[10px] flex items-center gap-1 mt-0.5">
            <Download size={9}/> Akses: <span className={`font-bold ${
              userTier === 'VIP' || userTier === 'OWNER' || userTier === 'ADMIN' 
                ? 'text-yellow-400' 
                : 'text-green-400'
            }`}>
              {userTier === 'VIP' || userTier === 'OWNER' || userTier === 'ADMIN' ? 'VIP + Gratis' : 'Gratis saja'}
            </span>
          </p>
        </div>
      </div>

      {/* Expiring warning */}
      {hasExpiring && (
        <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-xl p-4 flex items-center gap-3 text-yellow-400 text-sm">
          <AlertTriangle size={17}/> Ada token yang akan segera kadaluarsa!
        </div>
      )}

      {/* Token list */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={16} className="animate-spin text-zinc-600"/>
        </div>
      ) : tokens.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <Shield size={10}/> Lisensi Produk
            <span className="bg-zinc-800 text-zinc-400 text-[9px] px-1.5 py-0.5 rounded-full ml-auto font-normal">
              {tokens.length} TOKEN
            </span>
          </h4>
          {tokens.map((tok, i) => {
            const expired    = isExpired(tok.expiry_timestamp);
            const expireSoon = isExpiringSoon(tok.expiry_timestamp);
            const tier       = tok.source_alias?.toUpperCase() || 'BASIC';
            
            return (
              <div key={i} className={`rounded-xl border px-3 py-2.5 space-y-1.5 ${
                expired    ? 'border-zinc-800/40 bg-zinc-900/20 opacity-60' :
                expireSoon ? 'border-yellow-800/40 bg-yellow-900/10' :
                             'border-zinc-800/40 bg-zinc-900/30'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                    tier === 'VIP'   ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800/40' :
                                      'bg-zinc-800 text-zinc-400 border-zinc-700/40'
                  }`}>{tier}</span>
                  <span className={`text-[10px] font-bold flex items-center gap-1 ${
                    expired    ? 'text-red-500' :
                    expireSoon ? 'text-yellow-400' : 'text-zinc-500'
                  }`}>
                    <Clock size={9}/>
                    {expired ? 'EXPIRED' : tok.expiry_timestamp ? formatCountdown(tok.expiry_timestamp) : '∞'}
                    {expireSoon && !expired && ' ⚠️'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-zinc-950 text-green-400 text-[10px] font-mono px-2 py-1.5 rounded border border-zinc-800/60 truncate">
                    {tok.token}
                  </code>
                  <button onClick={() => copyToken(tok.token, tok.token)}
                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-500 hover:text-white rounded transition-all">
                    {copiedId === tok.token ? <Check size={11} className="text-green-400"/> : <Copy size={11}/>}
                  </button>
                </div>
                {tok.hwid && (
                  <p className="text-zinc-700 text-[9px] flex items-center gap-1">
                    <Hash size={8}/> HWD: {tok.hwid}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-xl px-3 py-4 text-center">
          <p className="text-zinc-600 text-xs">Belum punya token aktif</p>
        </div>
      )}

      {/* Claim Token */}
      <ClaimTokenSection/>

      {/* Roles */}
      {user.guildRoles.length > 0 && (
        <div>
          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
            <Star size={10}/> Role di Server
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {displayedRoles.map(role => (
              <span key={role} className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${getRoleColor(role)}`}>
                {role}
              </span>
            ))}
            {user.guildRoles.length > 5 && (
              <button onClick={() => setShowMore(!showMore)}
                className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-zinc-800/60 text-zinc-500 hover:text-white transition-colors">
                {showMore ? '- Sembunyikan' : `+ ${user.guildRoles.length - 5} lainnya`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Download History */}
      <div>
        <button onClick={() => setShowHist(!showHist)}
          className="w-full flex items-center justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-zinc-300 transition-colors py-1">
          <span className="flex items-center gap-1.5"><Download size={10}/> Riwayat Download</span>
          {showHist ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
        </button>
        {showHist && (
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-zinc-700 text-xs text-center py-3">Belum ada riwayat.</p>
            ) : history.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-zinc-900/30 border border-zinc-800/40 rounded-lg px-2.5 py-1.5">
                <div>
                  <p className="text-zinc-300 text-[11px] font-semibold truncate max-w-[160px]">{item.title}</p>
                  <p className="text-zinc-600 text-[9px]">{item.category}</p>
                </div>
                <p className="text-zinc-700 text-[9px] shrink-0 ml-2">
                  {new Date(item.created_at).toLocaleDateString('id-ID')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export { ApprovalBadge };
export default UserProfileCard;