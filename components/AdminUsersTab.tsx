// components/AdminUsersTab.tsx — Tab manajemen user di panel admin
import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, User, RefreshCw, Shield, Crown, Clock, Key, Plus,
  Trash2, RotateCcw, AlertTriangle, Loader2, ChevronDown, Check,
  Copy, X, Calendar, Download, Monitor, Zap
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

interface UserRecord {
  id: string;
  discord_id: string;
  username: string;
  avatar_url: string | null;
  tier: string;
  guild_roles: string[];
  expiry: string | null;
  last_login: string | null;
  created_at: string;
  modder_verified: boolean;
  is_modder: boolean;
  // token_claims di sini mungkin data lama, kita akan fetch fresh data di modal
  token_claims: any[]; 
}

// Gunakan interface yang sama dengan UserPanel untuk konsistensi
interface TokenEntry {
  token:            string;
  expiry_timestamp: string | null;
  source_alias:     string;
  hwid:             string | null;
  is_current:       boolean;
}

// ── Add Token Modal ─────────────────────────────────────────────────────────
const AddTokenModal: React.FC<{
  targetUser: UserRecord;
  sessionId: string;
  onDone: () => void;
  onClose: () => void;
}> = ({ targetUser, sessionId, onDone, onClose }) => {
  const [tier, setTier]   = useState('BASIC');
  const [days, setDays]   = useState(7);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ token: string; expires_at: string } | null>(null);
  const { showToast } = useToast();

  const handleAdd = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/token-manage?action=admin-add-token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, targetDiscordId: targetUser.discord_id, tier, duration_days: days }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      showToast(`Token ${data.tier} berhasil ditambah!`);
      onDone(); // Refresh list parent
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#111] border border-zinc-700 rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h3 className="text-sm font-black text-white">Add Token — {targetUser.username}</h3>
          <button onClick={onClose}><X size={16} className="text-zinc-600 hover:text-white" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {result ? (
            <div className="space-y-3">
              <div className="bg-green-900/20 border border-green-800/40 rounded-xl p-3">
                <p className="text-green-400 text-xs font-bold mb-1">✅ Token berhasil dibuat!</p>
                <code className="text-xs font-mono text-green-300 block truncate">{result.token}</code>
                <p className="text-zinc-600 text-[10px] mt-1">Exp: {new Date(result.expires_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}</p>
              </div>
              <button onClick={onClose} className="w-full py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-bold">Tutup</button>
            </div>
          ) : (
            <>
              <div>
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">Tier Token</label>
                <div className="grid grid-cols-2 gap-2">
                  {['BASIC', 'VIP'].map(t => (
                    <button key={t} type="button" onClick={() => setTier(t)}
                      className={`py-2 rounded-lg text-xs font-black border transition-all ${tier === t ? t === 'VIP' ? 'bg-yellow-500/20 border-yellow-500/60 text-yellow-400' : 'bg-blue-500/20 border-blue-500/60 text-blue-400' : 'bg-zinc-900 border-zinc-700 text-zinc-500'}`}>
                      {t === 'VIP' ? '👑 VIP' : '🛡️ BASIC'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">Durasi (hari)</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {[1, 7, 14, 30].map(d => (
                    <button key={d} type="button" onClick={() => setDays(d)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${days === d ? 'bg-green-700 border-green-600 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:text-white'}`}>
                      {d}h
                    </button>
                  ))}
                </div>
                <input type="number" value={days} onChange={e => setDays(Math.max(1, Number(e.target.value)))} min={1}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm text-center focus:border-green-700 outline-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} disabled={saving} className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-bold hover:bg-zinc-700">Batal</button>
                <button onClick={handleAdd} disabled={saving}
                  className="flex-1 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-xs font-bold flex items-center justify-center gap-1">
                  {saving ? <><Loader2 size={11} className="animate-spin" /> Membuat...</> : <><Plus size={11} /> Buat Token</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── User Detail Modal ────────────────────────────────────────────────────────
const UserDetailModal: React.FC<{
  user: UserRecord;
  sessionId: string;
  onClose: () => void;
  onRefresh: () => void; // Refresh tabel utama
}> = ({ user, sessionId, onClose, onRefresh }) => {
  const { showToast } = useToast();
  
  // State Local untuk Modal
  const [tokens, setTokens]           = useState<TokenEntry[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [githubData, setGithubData]   = useState<any>(null);

  // State Action
  const [extendToken, setExtendToken] = useState<string | null>(null);
  const [extendDays, setExtendDays]   = useState(7);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [copied, setCopied]           = useState<string | null>(null);

  // 1. Fetch data detail (HWID & Live Tokens)
  const fetchDetail = useCallback(async () => {
    setLoadingTokens(true);
    try {
      // Fetch Github Data (HWID global)
      const resDetail = await fetch(`/api/token-manage?action=get-user-detail&sessionId=${sessionId}&targetDiscordId=${user.discord_id}`);
      if (resDetail.ok) {
        const data = await resDetail.json();
        setGithubData(data.github_data);
      }

      // Fetch Real Tokens (Sama seperti user panel)
      const resTokens = await fetch(`/api/user?action=claim&userId=${user.discord_id}`);
      if (resTokens.ok) {
        const data = await resTokens.json();
        setTokens(data.tokens || []);
      } else if (resTokens.status === 404) {
        setTokens([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTokens(false);
    }
  }, [user.discord_id, sessionId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleCopy = (text: string) => { navigator.clipboard.writeText(text); setCopied(text); setTimeout(() => setCopied(null), 2000); };

  // Helper untuk action API (delete/extend/reset)
  const apiAction = async (action: string, body: any, successMsg: string) => {
    setLoadingAction(action);
    try {
      const res = await fetch(`/api/token-manage?action=${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      showToast(data.message || successMsg);
      
      // Refresh local tokens & parent table
      await fetchDetail(); 
      onRefresh(); 
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setLoadingAction(null); }
  };

  const formatExpiry = (expiry: string | null | undefined) => {
    if (!expiry) return { text: '∞ Unlimited', color: 'text-zinc-500', expired: false };
    try {
      const exp = new Date(expiry);
      if (isNaN(exp.getTime())) return { text: 'Invalid', color: 'text-zinc-600', expired: false };
      const diff = exp.getTime() - Date.now();
      const days = Math.floor(diff / 86400000);
      
      if (diff < 0) return { text: 'Expired', color: 'text-red-400', expired: true };
      if (days === 0) return { text: 'Hari ini', color: 'text-red-400', expired: false };
      if (days <= 3) return { text: `${days} hari`, color: 'text-orange-400', expired: false };
      
      return { 
        text: exp.toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' }), 
        color: 'text-green-400', 
        expired: false 
      };
    } catch { return { text: '-', color: 'text-zinc-500', expired: false }; }
  };

  const getTokenBadge = (alias: string) => {
    const a = alias.toLowerCase();
    if (a === 'vip') return { label: 'VIP', cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-600/30' };
    if (a === 'basic' || a === 'bassic') return { label: 'BASIC', cls: 'bg-blue-500/15 text-blue-400 border-blue-600/30' };
    return { label: alias.toUpperCase(), cls: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30' };
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 overflow-auto">
      <div className="bg-[#111] border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-xl object-cover border border-zinc-700" /> : <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-white font-black text-sm">{user.username.slice(0,2).toUpperCase()}</div>}
            <div>
              <p className="text-white font-black text-sm">{user.username}</p>
              <p className="text-zinc-600 text-[10px] font-mono">{user.discord_id}</p>
            </div>
          </div>
          <button onClick={onClose}><X size={16} className="text-zinc-600 hover:text-white" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-zinc-900/40 rounded-xl p-2.5 border border-zinc-800/50">
              <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">Role System</p>
              <p className={`text-xs font-black ${user.tier === 'VIP' ? 'text-yellow-400' : 'text-blue-400'}`}>{user.tier}</p>
            </div>
            <div className="bg-zinc-900/40 rounded-xl p-2.5 border border-zinc-800/50">
              <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">Expiry Utama</p>
              <p className={`text-xs font-bold ${formatExpiry(user.expiry).color}`}>{formatExpiry(user.expiry).text}</p>
            </div>
            <div className="bg-zinc-900/40 rounded-xl p-2.5 border border-zinc-800/50">
              <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">Active Tokens</p>
              <p className="text-xs font-black text-white">{tokens.length}</p>
            </div>
          </div>

          {/* GitHub HWID (Global) */}
          {githubData?.hwid && (
            <div className="bg-zinc-900/40 rounded-xl p-3 border border-zinc-800/50">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1"><Monitor size={10}/> HWID Global</p>
                <button onClick={() => apiAction('admin-reset-hwid', { targetDiscordId: user.discord_id }, 'HWID direset!')} disabled={!!loadingAction}
                  className="flex items-center gap-1 px-2 py-1 bg-red-900/25 border border-red-900/40 text-red-400 text-[9px] font-bold rounded-lg hover:bg-red-900/40 transition-all disabled:opacity-50">
                  {loadingAction === 'admin-reset-hwid' ? <Loader2 size={9} className="animate-spin" /> : <RotateCcw size={9} />} Reset Global
                </button>
              </div>
              <code className="text-[10px] font-mono text-zinc-400 block truncate">{githubData.hwid}</code>
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-700/80 hover:bg-green-700 text-white text-xs font-bold transition-colors">
              <Plus size={12} /> Add Manual Token
            </button>
            <button onClick={() => apiAction('admin-reset-cooldown', { targetDiscordId: user.discord_id }, 'Cooldown direset!')} disabled={!!loadingAction}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-700/80 hover:bg-blue-700 text-white text-xs font-bold transition-colors disabled:opacity-50">
              {loadingAction === 'admin-reset-cooldown' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Reset Claim Cooldown
            </button>
          </div>

          {/* TOKEN LIST (From claims.json source) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                <Key size={10} /> Live Tokens ({tokens.length})
              </p>
              <button onClick={fetchDetail} className="text-zinc-600 hover:text-white"><RefreshCw size={10} className={loadingTokens ? 'animate-spin' : ''}/></button>
            </div>

            {loadingTokens ? (
              <div className="space-y-2">
                {[1,2].map(i => <div key={i} className="h-12 bg-zinc-900/50 rounded-lg animate-pulse" />)}
              </div>
            ) : tokens.length === 0 ? (
              <div className="text-center py-6 bg-zinc-900/20 rounded-xl border border-dashed border-zinc-800">
                <p className="text-zinc-600 text-xs">User ini belum memiliki token aktif.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tokens.map((entry, i) => {
                  const expiry = formatExpiry(entry.expiry_timestamp);
                  const badge  = getTokenBadge(entry.source_alias);
                  
                  return (
                    <div key={`${entry.token}-${i}`} className={`rounded-xl border p-2.5 space-y-2 ${expiry.expired ? 'border-zinc-800/50 bg-zinc-900/20 opacity-60' : entry.is_current ? 'border-green-900/30 bg-green-900/5' : 'border-zinc-800/60 bg-zinc-900/30'}`}>
                      {/* Top Row: Badge & Status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                           {entry.is_current && !expiry.expired && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                           <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${badge.cls}`}>{badge.label}</span>
                           {entry.is_current && <span className="text-[9px] text-green-500 font-bold">AKTIF</span>}
                           {expiry.expired && <span className="text-[9px] text-red-500 font-bold flex items-center gap-0.5"><AlertTriangle size={8} /> EXP</span>}
                        </div>
                        <span className={`text-[9px] font-medium ${expiry.color}`}>{expiry.text}</span>
                      </div>

                      {/* Middle Row: Token Code */}
                      <div className="flex items-center gap-1.5">
                        <code className="flex-1 bg-black/30 border border-zinc-800 rounded px-2 py-1 text-[10px] text-green-400 font-mono truncate">{entry.token}</code>
                        <button onClick={() => handleCopy(entry.token)} className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 text-zinc-400 hover:text-white">
                          {copied === entry.token ? <Check size={9} className="text-green-400" /> : <Copy size={9} />}
                        </button>
                      </div>

                      {/* Bottom Row: HWID & Actions */}
                      <div className="flex items-center justify-between pt-1 border-t border-zinc-800/30">
                         {/* HWID Status */}
                         <div className="flex items-center gap-1">
                            <Monitor size={10} className="text-zinc-600" />
                            <span className={`text-[9px] font-bold ${entry.hwid ? 'text-green-500' : 'text-zinc-600'}`}>
                              {entry.hwid ? 'TERIKAT' : 'NON-BIND'}
                            </span>
                         </div>

                         {/* Actions */}
                         <div className="flex gap-1">
                           {/* Extend Input */}
                           {extendToken === entry.token ? (
                              <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200">
                                <input type="number" value={extendDays} onChange={e => setExtendDays(Math.max(1, Number(e.target.value)))} min={1}
                                  className="w-10 bg-zinc-950 border border-zinc-800 text-white px-1 py-0.5 rounded text-[9px] text-center outline-none" />
                                <button onClick={() => { apiAction('admin-extend-token', { targetDiscordId: user.discord_id, token: entry.token, extend_days: extendDays }, 'Diperpanjang!'); setExtendToken(null); }}
                                  disabled={!!loadingAction} className="px-1.5 py-0.5 bg-blue-700 text-white text-[9px] font-bold rounded">OK</button>
                                <button onClick={() => setExtendToken(null)} className="text-zinc-500 hover:text-white"><X size={10} /></button>
                              </div>
                           ) : (
                              <button onClick={() => setExtendToken(entry.token)} disabled={expiry.expired}
                                className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-white text-[9px] font-bold rounded transition-colors disabled:opacity-30">
                                +Hari
                              </button>
                           )}

                           {/* Reset HWID per token */}
                           {entry.hwid && (
                             <button onClick={() => apiAction('user-reset-hwid', { token: entry.token }, 'HWID Token Reset!')} disabled={!!loadingAction}
                               className="px-1.5 py-0.5 bg-red-900/20 hover:bg-red-900/30 border border-red-900/30 text-red-400 text-[9px] font-bold rounded transition-colors disabled:opacity-50">
                               Reset HWID
                             </button>
                           )}

                           {/* Delete */}
                           <button onClick={() => { if(confirm('Hapus token ini?')) apiAction('admin-delete-token', { targetDiscordId: user.discord_id, token: entry.token }, 'Dihapus!'); }} disabled={!!loadingAction}
                              className="w-5 h-5 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded transition-colors disabled:opacity-50">
                              <Trash2 size={9} />
                           </button>
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Roles List */}
          {user.guild_roles?.length > 0 && (
            <div className="border-t border-zinc-800/50 pt-3">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1"><Shield size={10} /> Roles</p>
              <div className="flex flex-wrap gap-1.5">
                {user.guild_roles.filter(r => r !== '@everyone').map(role => (
                  <span key={role} className="text-[9px] px-2 py-0.5 rounded bg-zinc-800/60 text-zinc-500 border border-zinc-700/40">{role}</span>
                ))}
              </div>
            </div>
          )}

          <Link to={`/user/${user.discord_id}`} target="_blank"
            className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-400 hover:text-white text-xs font-bold transition-colors border border-zinc-800/60 mt-2">
            <User size={12} /> Lihat Profil Publik
          </Link>
        </div>

        {showAddModal && (
          <AddTokenModal
            targetUser={user}
            sessionId={sessionId}
            onDone={() => { fetchDetail(); onRefresh(); }} // Refresh detail modal & tabel utama
            onClose={() => setShowAddModal(false)}
          />
        )}
      </div>
    </div>
  );
};

// ── Main AdminUsersTab ──────────────────────────────────────────────────────
const AdminUsersTab: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const [users, setUsers]     = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState('');
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const { showToast } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL('/api/token-manage', window.location.origin);
      url.searchParams.set('action', 'get-users');
      url.searchParams.set('sessionId', sessionId);
      if (search) url.searchParams.set('search', search);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users || []);
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setLoading(false); }
  }, [sessionId, search, showToast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const TIER_STYLES: Record<string, string> = {
    VIP:   'bg-yellow-500/15 text-yellow-400 border-yellow-600/30',
    BASIC: 'bg-blue-500/15 text-blue-400 border-blue-600/30',
    GUEST: 'bg-zinc-700/30 text-zinc-500 border-zinc-600/30',
  };

  return (
    <div className="animate-in fade-in duration-200">
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" size={13} />
          <input placeholder="Cari username..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-white pl-10 pr-4 py-2.5 rounded-lg text-sm focus:border-zinc-600 outline-none" />
        </div>
        <button onClick={fetchUsers} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-600 hover:text-white">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-[#111] border border-zinc-800/70 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-12 flex items-center justify-center gap-2 text-zinc-600 text-xs"><Loader2 size={14} className="animate-spin" /> Memuat...</div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-zinc-700 text-sm">Tidak ada user.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-black/40 text-zinc-600 uppercase text-[9px] tracking-widest border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Tokens</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Last Login</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {users.map(u => {
                const expiry = u.expiry ? new Date(u.expiry) : null;
                const isExpired = expiry && expiry < new Date();
                return (
                  <tr key={u.id} className="hover:bg-zinc-800/15">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-lg object-cover border border-zinc-700" /> : <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-white font-black text-xs">{u.username.slice(0,2).toUpperCase()}</div>}
                        <div>
                          <p className="text-white text-xs font-semibold">{u.username}</p>
                          <p className="text-zinc-700 text-[9px] font-mono">{u.discord_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${TIER_STYLES[u.tier] || TIER_STYLES.GUEST}`}>{u.tier}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-zinc-400 text-xs font-semibold">{u.token_claims?.length || 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      {expiry ? (
                        <span className={`text-xs font-medium ${isExpired ? 'text-red-400' : 'text-green-400'}`}>
                          {isExpired ? '⚠️ Expired' : expiry.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                      ) : <span className="text-zinc-700 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 text-xs">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString('id-ID') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setSelectedUser(u)}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white text-[10px] font-bold rounded-lg transition-colors">
                        Kelola
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          sessionId={sessionId}
          onClose={() => setSelectedUser(null)}
          onRefresh={() => { fetchUsers(); }} // Hapus setSelectedUser(null) agar modal tidak close saat refresh
        />
      )}
    </div>
  );
};

export default AdminUsersTab;