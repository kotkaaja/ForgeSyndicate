// components/UserProfileCard.tsx — UPDATE dengan Claim Token
import React, { useState, useEffect } from 'react';
import {
  Shield, Download, Star, Calendar, Hash,
  ChevronDown, ChevronUp, Clock, Copy, Check,
  Gift, Loader2, AlertTriangle, Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Token {
  token:      string;
  tier:       string;
  expiry:     string | null;
  hwd?:       string;
}

interface DownloadHistoryItem {
  id:         string;
  title:      string;
  category:   string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SESSION_KEY = 'ds_session_id';

const ROLE_COLORS: Record<string, string> = {
  'Admin':          'bg-red-900/30 text-red-400 border border-red-800/40',
  'Owner':          'bg-red-900/30 text-red-400 border border-red-800/40',
  'Co-Founder':     'bg-red-900/30 text-red-400 border border-red-800/40',
  'High Council':   'bg-purple-900/30 text-purple-400 border border-purple-800/40',
  'Vip':            'bg-yellow-900/30 text-yellow-400 border border-yellow-800/40',
  'Verified Modder':'bg-blue-900/30 text-blue-400 border border-blue-800/40',
  'Modder':         'bg-green-900/30 text-green-400 border border-green-800/40',
  'Moderator':      'bg-orange-900/30 text-orange-400 border border-orange-800/40',
};

const getRoleColor = (role: string) =>
  ROLE_COLORS[role] || 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/40';

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

// ─── Claim Token Section ──────────────────────────────────────────────────────
const ClaimTokenSection: React.FC = () => {
  const { showToast }           = useToast();
  const [claiming, setClaiming] = useState(false);
  const [result, setResult]     = useState<{ token: string; tier: string; expires_at: string; wait?: string } | null>(null);
  const [cooldownMsg, setCooldown] = useState('');
  const [copied, setCopied]     = useState(false);

  const handleClaim = async () => {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) { showToast('Login dulu untuk claim token', 'error'); return; }

    setClaiming(true); setCooldown(''); setResult(null);
    try {
      const res  = await fetch('/api/user/claim-token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sessionId }),
      });
      const data = await res.json();

      if (res.status === 429) { setCooldown(data.wait || 'Cooldown aktif'); return; }
      if (!res.ok)            { showToast(data.message || data.error, 'error'); return; }

      setResult(data);
      showToast(`Token ${data.tier} berhasil diklaim! 🎉`);
    } catch {
      showToast('Gagal menghubungi server', 'error');
    } finally { setClaiming(false); }
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.token);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4 border-t border-zinc-800/60 pt-4">
      <div className="flex items-center gap-2 mb-3">
        <Gift size={13} className="text-green-500"/>
        <h4 className="text-xs font-black text-zinc-300 uppercase tracking-wider">Claim Token</h4>
      </div>

      {cooldownMsg ? (
        <div className="bg-yellow-900/15 border border-yellow-800/30 rounded-lg px-3 py-2.5 flex items-center gap-2">
          <Clock size={12} className="text-yellow-500 shrink-0"/>
          <div>
            <p className="text-yellow-400 text-xs font-bold">Cooldown aktif</p>
            <p className="text-zinc-500 text-[10px]">{cooldownMsg} lagi bisa claim</p>
          </div>
        </div>
      ) : result ? (
        <div className="bg-green-900/15 border border-green-800/30 rounded-lg px-3 py-2.5 space-y-2">
          <p className="text-green-400 text-xs font-bold flex items-center gap-1">
            <Check size={12}/> Token {result.tier} berhasil diklaim!
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-black/40 text-green-400 text-xs font-mono px-2 py-1.5 rounded truncate">
              {result.token}
            </code>
            <button onClick={copy}
              className="p-1.5 bg-zinc-800 hover:bg-green-700 text-zinc-400 hover:text-white rounded transition-all">
              {copied ? <Check size={12} className="text-green-400"/> : <Copy size={12}/>}
            </button>
          </div>
          <p className="text-zinc-600 text-[10px]">
            Berlaku hingga {new Date(result.expires_at).toLocaleString('id-ID')}
          </p>
        </div>
      ) : (
        <button onClick={handleClaim} disabled={claiming}
          className="w-full bg-green-900/25 hover:bg-green-700/40 border border-green-800/40 hover:border-green-600/60 text-green-400 hover:text-green-300 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all">
          {claiming
            ? <><Loader2 size={13} className="animate-spin"/> Memproses...</>
            : <><Zap size={13}/> CLAIM TOKEN GRATIS</>}
        </button>
      )}
      <p className="text-zinc-700 text-[10px] mt-2 text-center">
        VIP: 1 hari (daily) · Basic: 7 hari (mingguan)
      </p>
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

  // Tentukan apakah user bisa claim token (role BASIC atau VIP)
  const canClaim = user && user.guildRoles.some(r =>
    ['member', 'basic', 'vip', 'high council', 'script kiddie', 'cleo user', 'early supporter']
      .includes(r.toLowerCase())
  );

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const sessionId = localStorage.getItem(SESSION_KEY);
        if (!sessionId) return;
        const [tokRes, histRes] = await Promise.all([
          fetch(`/api/user/tokens?sessionId=${sessionId}`),
          fetch(`/api/user/downloads?sessionId=${sessionId}`),
        ]);
        if (tokRes.ok)  setTokens(await tokRes.json());
        if (histRes.ok) setHistory(await histRes.json());
      } finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

  const copyToken = async (token: string, id: string) => {
    await navigator.clipboard.writeText(token);
    setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
    showToast('Token disalin!');
  };

  if (!user) return null;

  const displayedRoles = showMore ? user.guildRoles : user.guildRoles.slice(0, 5);
  const hasExpiring    = tokens.some(t => isExpiringSoon(t.expiry));

  return (
    <div className="bg-[#111] border border-zinc-800/60 rounded-2xl p-5 space-y-4 relative overflow-hidden">
      {/* Gradient top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-700/40 to-transparent"/>

      {/* Avatar + Info */}
      <div className="flex items-start gap-3">
        <div className="relative">
          <img src={user.avatarUrl || '/default-avatar.png'} alt={user.username}
            className="w-14 h-14 rounded-xl border-2 border-zinc-700 object-cover"/>
          <span className={`absolute -bottom-1 -right-1 text-[8px] font-black px-1.5 py-0.5 rounded-md border ${
            user.tier === 'VIP'   ? 'bg-yellow-900/60 text-yellow-400 border-yellow-700/50' :
            user.tier === 'ADMIN' ? 'bg-red-900/60 text-red-400 border-red-700/50' :
                                    'bg-zinc-800 text-zinc-400 border-zinc-700/50'
          }`}>{user.tier}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-white text-sm truncate">{user.username}</h3>
          <p className="text-zinc-600 text-[10px] flex items-center gap-1 mt-0.5">
            <Calendar size={9}/> Bergabung {user.joinedAt
              ? new Date(user.joinedAt).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
              : '—'}
          </p>
          <p className="text-zinc-500 text-[10px] flex items-center gap-1 mt-0.5">
            <Download size={9}/> Akses: <span className={`font-bold ${
              user.tier === 'VIP' ? 'text-yellow-400' : user.tier === 'ADMIN' ? 'text-red-400' : 'text-green-400'
            }`}>{user.tier === 'VIP' ? 'VIP + Gratis' : user.tier === 'ADMIN' ? 'Full Access' : 'Gratis saja'}</span>
          </p>
        </div>
      </div>

      {/* Expiring warning */}
      {hasExpiring && (
        <div className="bg-yellow-900/15 border border-yellow-800/30 rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertTriangle size={12} className="text-yellow-500 shrink-0"/>
          <p className="text-yellow-400 text-xs">Ada token yang akan segera kadaluarsa!</p>
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
            const expired    = isExpired(tok.expiry);
            const expireSoon = isExpiringSoon(tok.expiry);
            return (
              <div key={i} className={`rounded-xl border px-3 py-2.5 space-y-1.5 ${
                expired    ? 'border-zinc-800/40 bg-zinc-900/20 opacity-60' :
                expireSoon ? 'border-yellow-800/40 bg-yellow-900/10' :
                             'border-zinc-800/40 bg-zinc-900/30'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                    tok.tier === 'VIP'   ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800/40' :
                                          'bg-zinc-800 text-zinc-400 border-zinc-700/40'
                  }`}>{tok.tier}</span>
                  <span className={`text-[10px] font-bold flex items-center gap-1 ${
                    expired    ? 'text-red-500' :
                    expireSoon ? 'text-yellow-400' : 'text-zinc-500'
                  }`}>
                    <Clock size={9}/>
                    {expired ? 'EXPIRED' : tok.expiry ? formatCountdown(tok.expiry) : '∞'}
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
                {tok.hwd && (
                  <p className="text-zinc-700 text-[9px] flex items-center gap-1">
                    <Hash size={8}/> HWD: {tok.hwd}
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
      {canClaim && <ClaimTokenSection/>}

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