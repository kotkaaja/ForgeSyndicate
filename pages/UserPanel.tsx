// pages/UserPanel.tsx — Panel user dengan tab: Profile, Mod Saya, Upload Mod, Lisensi
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User, Package, Upload, Key, Crown, Shield, Clock, Download,
  Star, Copy, Check, AlertTriangle, Loader2, RefreshCw, X,
  Zap, Gift, RotateCcw, Trash2, Calendar, ExternalLink, Plus,
  Tag, Image, FileCode, ChevronDown, Edit3, Eye
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import ProductCard from '../components/ProductCard';
import { CATEGORIES, PLATFORMS, PRESET_TAGS, CategoryType, PlatformType } from '../types';
import type { ModItem } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────
interface TokenEntry {
  token: string;
  expiry_timestamp: string | null;
  source_alias: string;
  hwid: string | null;
  is_current: boolean;
}

type PanelTab = 'profile' | 'mods' | 'upload' | 'license';

// ── Helpers ────────────────────────────────────────────────────────────────
const formatExpiry = (expiry: string | null | undefined) => {
  if (!expiry) return { text: '∞ Unlimited', color: 'text-zinc-500', urgent: false, expired: false };
  try {
    const exp = new Date(expiry);
    if (isNaN(exp.getTime())) return { text: 'Format invalid', color: 'text-zinc-600', urgent: false, expired: false };
    const now  = new Date();
    const diff = exp.getTime() - now.getTime();
    const days = Math.floor(diff / 86400000);
    if (diff < 0)   return { text: 'Expired!', color: 'text-red-400', urgent: true, expired: true };
    if (days === 0) return { text: 'Berakhir hari ini!', color: 'text-red-400', urgent: true, expired: false };
    if (days <= 3)  return { text: `${days} hari lagi`, color: 'text-orange-400', urgent: true, expired: false };
    if (days <= 7)  return { text: `${days} hari lagi`, color: 'text-yellow-400', urgent: false, expired: false };
    return { text: exp.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }), color: 'text-zinc-300', urgent: false, expired: false };
  } catch { return { text: expiry, color: 'text-zinc-400', urgent: false, expired: false }; }
};

const getTokenBadge = (alias: string) => {
  const a = alias.toLowerCase();
  if (a === 'vip') return { label: 'VIP', cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-600/30' };
  if (a === 'basic' || a === 'bassic') return { label: 'BASIC', cls: 'bg-blue-500/15 text-blue-400 border-blue-600/30' };
  return { label: alias.toUpperCase(), cls: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30' };
};

async function uploadToStorage(file: File, bucket: string, folder: string): Promise<string> {
  const safeName = (file.name.split('/').pop() ?? file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${Date.now()}_${safeName}`;
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(`Upload gagal: ${error.message}`);
  return supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;
}

// ── Tab: PROFILE ───────────────────────────────────────────────────────────
const ProfileTab: React.FC<{ user: any; isVIP: boolean }> = ({ user, isVIP }) => {
  const isAdmin = user?.guildRoles?.some((r: string) => ['Admin', 'Administrator', 'Owner', 'Founder', 'Co-Founder'].includes(r));
  const expiry = formatExpiry(user?.expiry);

  return (
    <div className="space-y-4">
      {/* Profile card */}
      <div className="bg-[#141414] border border-zinc-800/80 rounded-2xl overflow-hidden">
        <div className={`h-20 bg-gradient-to-r ${isVIP ? 'from-yellow-900/30 via-zinc-900 to-zinc-900' : 'from-blue-900/20 via-zinc-900 to-zinc-900'} relative`}>
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)', backgroundSize: '18px 18px' }} />
        </div>
        <div className="px-5 pb-5">
          <div className="flex items-end justify-between -mt-8 mb-4">
            <div className="relative">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.username} className="w-16 h-16 rounded-2xl border-4 border-[#141414] object-cover shadow-xl" />
              ) : (
                <div className="w-16 h-16 rounded-2xl border-4 border-[#141414] bg-zinc-800 flex items-center justify-center text-white font-black text-xl">
                  {user?.username?.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-[#141414]" />
            </div>
            <a href={`https://discord.com/users/${user?.discordId}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-zinc-600 hover:text-indigo-400 transition-colors">
              Discord <ExternalLink size={10} />
            </a>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-white font-black text-lg">{user?.username}</h2>
            <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${isAdmin ? 'bg-red-500/20 text-red-400 border-red-500/40' : isVIP ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' : 'bg-blue-500/15 text-blue-400 border-blue-500/30'}`}>
              {isAdmin ? <Shield size={8} /> : <Crown size={8} />}
              {isAdmin ? 'ADMIN' : user?.tier}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-zinc-900/40 rounded-xl px-3 py-2.5">
              <p className="text-zinc-600 text-[10px] mb-0.5 flex items-center gap-1"><Clock size={9} /> Aktif hingga</p>
              <p className={`text-xs font-bold ${expiry.color}`}>{expiry.urgent && '⚠️ '}{expiry.text}</p>
            </div>
            <div className="bg-zinc-900/40 rounded-xl px-3 py-2.5">
              <p className="text-zinc-600 text-[10px] mb-0.5 flex items-center gap-1"><Download size={9} /> Download</p>
              <p className={`text-xs font-bold ${isVIP ? 'text-yellow-400' : 'text-green-400'}`}>{isVIP ? 'VIP + Free' : 'Free only'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Roles */}
      {user?.guildRoles?.length > 0 && (
        <div className="bg-[#141414] border border-zinc-800/80 rounded-2xl p-4">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1">
            <Shield size={10} /> Role Server
          </p>
          <div className="flex flex-wrap gap-2">
            {user.guildRoles.filter((r: string) => r !== '@everyone').map((role: string) => (
              <span key={role} className="text-[10px] px-2.5 py-1 rounded-lg bg-zinc-800/60 text-zinc-400 border border-zinc-700/40 font-semibold">{role}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Tab: LISENSI ────────────────────────────────────────────────────────────
const LicenseTab: React.FC<{ user: any }> = ({ user }) => {
  const { showToast } = useToast();
  const [tokens, setTokens]       = useState<TokenEntry[]>([]);
  const [loading, setLoading]     = useState(false);
  const [hwid, setHwid]           = useState<string | null>(null);
  const [resettingHwid, setResettingHwid] = useState<string | null>(null);
  const [refunding, setRefunding] = useState<string | null>(null);
  const [claiming, setClaiming]   = useState(false);
  const [cooldown, setCooldown]   = useState('');
  const [copied, setCopied]       = useState<string | null>(null);

  const hasInnerCircle = user?.guildRoles?.some((r: string) => r.toLowerCase() === 'inner circle') ?? false;
  const sessionId = localStorage.getItem('ds_session_id');

  const fetchTokens = useCallback(async () => {
    if (!user?.discordId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/user?action=claim&userId=${user.discordId}`);
      if (res.status === 404) { setLoading(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTokens(data.tokens || []);
      setHwid(data.hwid);
    } catch (err: any) {
      console.error('Token fetch error:', err);
    } finally { setLoading(false); }
  }, [user?.discordId]);

  useEffect(() => {
    fetchTokens();
    // Check cooldown
    const last = localStorage.getItem(`last_claim_${user?.discordId}`);
    if (last) {
      const diff = Date.now() - new Date(last).getTime();
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      if (diff < weekMs) {
        const rem = weekMs - diff;
        const days = Math.floor(rem / (24 * 3600000));
        const hours = Math.floor((rem % (24 * 3600000)) / 3600000);
        setCooldown(`${days}h ${hours}j`);
      }
    }
  }, [fetchTokens, user?.discordId]);

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleResetHwid = async (token?: string) => {
    if (!sessionId) return;
    setResettingHwid(token || 'all');
    try {
      const res = await fetch('/api/token-manage?action=user-reset-hwid', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message || 'HWID direset!');
      await fetchTokens();
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setResettingHwid(null); }
  };

  const handleRefund = async (token: string) => {
    if (!confirm('Refund token ini? Token akan dihapus dan cooldown direset.')) return;
    if (!sessionId) return;
    setRefunding(token);
    try {
      const res = await fetch('/api/token-manage?action=user-refund-token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message || 'Token di-refund!');
      localStorage.removeItem(`last_claim_${user?.discordId}`);
      setCooldown('');
      await fetchTokens();
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setRefunding(null); }
  };

  const handleClaim = async () => {
    if (!sessionId || !hasInnerCircle || cooldown || claiming) return;
    setClaiming(true);
    try {
      const res = await fetch('/api/user?action=claim-token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Gagal claim', 'error'); return; }
      const now = new Date().toISOString();
      localStorage.setItem(`last_claim_${user?.discordId}`, now);
      showToast('✅ Token berhasil di-claim!');
      await fetchTokens();
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setClaiming(false); }
  };

  return (
    <div className="space-y-4">
      {/* HWID display */}
      {hwid && (
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">HWID Terdaftar</p>
            <button onClick={() => handleResetHwid()} disabled={!!resettingHwid}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-red-900/25 hover:bg-red-900/40 border border-red-900/40 text-red-400 text-[10px] font-bold rounded-lg transition-all disabled:opacity-50">
              {resettingHwid === 'all' ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />}
              Reset HWID (24h)
            </button>
          </div>
          <code className="text-xs font-mono text-zinc-400 bg-black/30 px-2 py-1 rounded block truncate">{hwid}</code>
        </div>
      )}

      {/* Claim token (Inner Circle) */}
      {hasInnerCircle && (
        <div className="bg-green-900/10 border border-green-800/30 rounded-xl p-4">
          <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-2 flex items-center gap-1">
            <Gift size={10} /> Claim Token Gratis (Inner Circle)
          </p>
          {cooldown ? (
            <div className="flex items-center gap-2 text-orange-400 text-xs">
              <Clock size={12} /> Cooldown: {cooldown} lagi
            </div>
          ) : (
            <button onClick={handleClaim} disabled={claiming}
              className="w-full flex items-center justify-center gap-2 bg-green-600/20 hover:bg-green-600/30 border border-green-700/40 text-green-400 text-xs font-black uppercase tracking-wider py-2.5 rounded-lg transition-all disabled:opacity-50">
              {claiming ? <><Loader2 size={12} className="animate-spin" /> Memproses...</> : <><Zap size={12} /> Claim Token Gratis</>}
            </button>
          )}
          <p className="text-[9px] text-zinc-700 mt-2 text-center">VIP: 1 hari • BASIC: 7 hari • Cooldown 7 hari</p>
        </div>
      )}

      {/* Tokens list */}
      <div className="bg-[#141414] border border-zinc-800/80 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1">
            <Key size={10} /> Lisensi Produk
            {tokens.length > 0 && <span className="ml-1 bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full text-[9px]">{tokens.length}</span>}
          </p>
          <button onClick={fetchTokens} className="text-zinc-600 hover:text-white transition-colors">
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2].map(i => <div key={i} className="h-16 bg-zinc-900/50 rounded-lg animate-pulse" />)}
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-8 text-zinc-700 text-xs">Belum punya token aktif.</div>
        ) : (
          <div className="space-y-3">
            {tokens.map((entry, i) => {
              const expiry = formatExpiry(entry.expiry_timestamp);
              const badge  = getTokenBadge(entry.source_alias);
              return (
                <div key={`${entry.token}-${i}`} className={`rounded-xl border p-3 space-y-2 ${expiry.expired ? 'border-red-900/30 bg-red-950/10' : entry.is_current ? 'border-green-800/40 bg-green-950/10' : 'border-zinc-800/50 bg-zinc-900/30'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {entry.is_current && !expiry.expired && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${badge.cls}`}>{badge.label}</span>
                      {entry.is_current && <span className="text-[9px] text-green-500 font-bold">AKTIF</span>}
                      {expiry.expired && <span className="text-[9px] text-red-500 font-bold flex items-center gap-0.5"><AlertTriangle size={8} /> EXP</span>}
                    </div>
                    <span className={`text-[9px] font-medium ${expiry.color}`}>{expiry.urgent && !expiry.expired && '⚠️ '}{expiry.text}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <code className="flex-1 bg-black/40 border border-zinc-800 rounded px-2 py-1 text-[11px] text-green-400 font-mono truncate">{entry.token}</code>
                    <button onClick={() => handleCopy(entry.token)} className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded border border-zinc-700 transition-colors">
                      {copied === entry.token ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-zinc-600">
                    <span>HWID: {entry.hwid ? <span className="text-green-600 font-mono">{entry.hwid.slice(0,12)}…</span> : <span className="text-zinc-700">Belum terdaftar</span>}</span>
                    <div className="flex items-center gap-1">
                      {entry.hwid && (
                        <button onClick={() => handleResetHwid(entry.token)} disabled={!!resettingHwid}
                          className="flex items-center gap-1 px-1.5 py-0.5 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded text-[9px] font-bold border border-red-900/30 transition-all disabled:opacity-50">
                          {resettingHwid === entry.token ? <Loader2 size={8} className="animate-spin" /> : <RotateCcw size={8} />}
                          Reset HWID
                        </button>
                      )}
                      {!expiry.expired && (
                        <button onClick={() => handleRefund(entry.token)} disabled={!!refunding}
                          className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-500 hover:text-red-400 rounded text-[9px] font-bold border border-zinc-700 transition-all disabled:opacity-50">
                          {refunding === entry.token ? <Loader2 size={8} className="animate-spin" /> : <Trash2 size={8} />}
                          Refund
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Tab: MY MODS ────────────────────────────────────────────────────────────
const MyModsTab: React.FC<{ user: any }> = ({ user }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [mods, setMods]       = useState<ModItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchMods = useCallback(async () => {
    if (!user?.discordId) return;
    setLoading(true);
    const { data, error } = await supabase.from('mods').select('*').eq('uploaded_by', user.discordId).order('created_at', { ascending: false });
    if (!error) {
      setMods((data || []).map((m: any) => ({
        id: m.id, title: m.title, description: m.description, category: m.category,
        platform: m.platform, imageUrl: m.image_url || '', mediaUrl: m.media_url || '',
        downloadUrl: m.download_url, isPremium: m.is_premium || false,
        dateAdded: new Date(m.created_at).toISOString().split('T')[0],
        author: m.author, downloadCount: m.download_count ?? 0, rating: m.rating ?? 0,
        ratingCount: m.rating_count ?? 0, tags: m.tags ?? [], created_at: m.created_at,
        approval_status: m.approval_status ?? 'unofficial', uploaded_by: m.uploaded_by,
      })));
    }
    setLoading(false);
  }, [user?.discordId]);

  useEffect(() => { fetchMods(); }, [fetchMods]);

  const handleDelete = async (mod: ModItem) => {
    if (!confirm(`Hapus mod "${mod.title}"?`)) return;
    const sessionId = localStorage.getItem('ds_session_id');
    if (!sessionId) return;
    setDeleting(mod.id);
    try {
      const res = await fetch('/api/admin?action=manage-mod', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, modId: mod.id, action: 'delete' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMods(prev => prev.filter(m => m.id !== mod.id));
      showToast('Mod dihapus', 'info');
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setDeleting(null); }
  };

  const pendingCount = mods.filter(m => (m as any).approval_status === 'pending').length;

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-green-500" /></div>;

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <Clock size={14} className="text-amber-400" />
          <p className="text-sm text-amber-300 font-semibold">{pendingCount} mod menunggu review admin</p>
        </div>
      )}

      {mods.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-800/50 rounded-2xl">
          <Package size={40} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-600 text-sm mb-4">Belum ada mod yang diupload.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mods.map(mod => (
            <div key={mod.id} className="relative group">
              <ProductCard mod={mod} showPendingBadge />
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-b-xl">
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/mod/${mod.id}`)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium bg-zinc-700/80 hover:bg-zinc-600 text-white transition-colors">
                    <Eye size={11} /> Lihat
                  </button>
                  <button onClick={() => handleDelete(mod)} disabled={deleting === mod.id}
                    className="flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-medium bg-red-700/80 hover:bg-red-600 text-white transition-colors disabled:opacity-50">
                    {deleting === mod.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Tab: UPLOAD MOD (Full version matching admin panel) ─────────────────────
const UploadTab: React.FC<{ user: any }> = ({ user }) => {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);

  const [title, setTitle]       = useState('');
  const [description, setDesc]  = useState('');
  const [category, setCategory] = useState<CategoryType>('Moonloader');
  const [platform, setPlatform] = useState<PlatformType>('PC');
  const [version, setVersion]   = useState('1.0.0');
  const [tags, setTags]         = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [downloadUrl, setDlUrl] = useState('');
  const [imageUrl, setImgUrl]   = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [imgFile, setImgFile]   = useState<File | null>(null);
  const [imgUploading, setImgUpl] = useState(false);
  const [imgPreview, setImgPreview] = useState('');
  const [modFile, setModFile]   = useState<File | null>(null);
  const [modUploading, setModUpl] = useState(false);
  const [isReshare, setIsReshare] = useState(false);
  const [originalAuthor, setOriginalAuthor] = useState('');

  const imgRef = useRef<HTMLInputElement>(null);
  const modRef = useRef<HTMLInputElement>(null);

  const UPLOAD_ROLES = ['modder', 'verified modder', 'verified', 'trusted modder', 'admin', 'administrator', 'owner', 'founder', 'co-founder', 'script maker', 'lua modder'];
  const canUpload = user?.guildRoles?.some((r: string) => UPLOAD_ROLES.includes(r.toLowerCase())) ?? false;

  const handleImgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setImgFile(f); setImgPreview(URL.createObjectURL(f)); setImgUpl(true);
    try { const url = await uploadToStorage(f, 'mod-images', 'thumbnails'); setImgUrl(url); showToast('Gambar diupload!'); }
    catch (err: any) { showToast(err.message, 'error'); setImgFile(null); setImgPreview(''); }
    finally { setImgUpl(false); }
  };

  const handleModFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 50 * 1024 * 1024) { showToast('File terlalu besar (maks 50MB)', 'error'); return; }
    setModFile(f); setModUpl(true);
    try { const url = await uploadToStorage(f, 'mod-files', 'user-uploads'); setDlUrl(url); showToast(`File "${f.name}" diupload!`); }
    catch (err: any) { showToast(err.message, 'error'); setModFile(null); }
    finally { setModUpl(false); }
  };

  const toggleTag = (tag: string) => setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  const addCustomTag = () => { const t = customTag.trim(); if (!t || tags.includes(t)) return; setTags(prev => [...prev, t]); setCustomTag(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadUrl) { showToast('Upload file mod dulu!', 'error'); return; }
    const sessionId = localStorage.getItem('ds_session_id');
    if (!sessionId) { showToast('Session expired', 'error'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/mod', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, title: title.trim(), description: description.trim(), category, platform, version, tags, downloadUrl, imageUrl, mediaUrl, isReshare, originalAuthor: isReshare ? originalAuthor.trim() : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Upload gagal');
      showToast(data.message || 'Mod berhasil diupload!');
      setSuccess(true);
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setSubmitting(false); }
  };

  if (!canUpload) return (
    <div className="text-center py-16">
      <AlertTriangle size={40} className="text-yellow-500 mx-auto mb-3" />
      <p className="text-zinc-400 text-sm">Kamu butuh role <span className="text-green-400 font-bold">Modder</span> untuk upload mod.</p>
    </div>
  );

  if (success) return (
    <div className="text-center py-16 space-y-4">
      <div className="w-16 h-16 bg-green-900/25 border border-green-800/40 rounded-2xl flex items-center justify-center mx-auto">
        <Check size={32} className="text-green-500" />
      </div>
      <h3 className="text-white font-black text-lg">Mod Berhasil Diupload!</h3>
      <button onClick={() => { setSuccess(false); setTitle(''); setDesc(''); setDlUrl(''); setImgUrl(''); setTags([]); setModFile(null); setImgFile(null); setImgPreview(''); setIsReshare(false); setOriginalAuthor(''); }}
        className="bg-green-700 hover:bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors">
        Upload Lagi
      </button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Reshare toggle */}
      <div className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${isReshare ? 'border-purple-700/40 bg-purple-900/10' : 'border-zinc-800/60 bg-zinc-900/20'}`}
        onClick={() => setIsReshare(!isReshare)}>
        <div>
          <p className={`font-black text-sm ${isReshare ? 'text-purple-400' : 'text-zinc-400'}`}>Reshare Mod</p>
          <p className="text-zinc-600 text-xs">Centang jika ini mod orang lain yang kamu bagikan ulang</p>
        </div>
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isReshare ? 'bg-purple-600 border-purple-500' : 'border-zinc-600'}`}>
          {isReshare && <Check size={12} className="text-white" />}
        </div>
      </div>

      {/* Original author (only if reshare) */}
      {isReshare && (
        <div>
          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Author Asli *</label>
          <input required={isReshare} type="text" value={originalAuthor} onChange={e => setOriginalAuthor(e.target.value)}
            placeholder="Nama creator asli mod ini"
            className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-2.5 rounded-xl text-sm focus:border-purple-700 outline-none placeholder:text-zinc-700" />
        </div>
      )}

      {/* Title + version */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Judul Mod *</label>
          <input required type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Nama mod kamu"
            className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-2.5 rounded-xl text-sm focus:border-green-700 outline-none placeholder:text-zinc-700" />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Versi</label>
          <input type="text" value={version} onChange={e => setVersion(e.target.value)} placeholder="1.0.0"
            className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-2.5 rounded-xl text-sm focus:border-green-700 outline-none" />
        </div>
      </div>

      <div>
        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Deskripsi *</label>
        <textarea required rows={3} value={description} onChange={e => setDesc(e.target.value)} placeholder="Jelaskan fitur mod, cara install, dll..."
          className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-2.5 rounded-xl text-sm focus:border-green-700 outline-none resize-none placeholder:text-zinc-700" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Kategori</label>
          <select value={category} onChange={e => setCategory(e.target.value as CategoryType)}
            className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-2.5 rounded-xl text-sm outline-none cursor-pointer">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Platform</label>
          <div className="flex gap-3 py-2.5">
            {PLATFORMS.map(p => (
              <label key={p} className="flex items-center gap-2 text-zinc-300 text-sm cursor-pointer">
                <input type="radio" checked={platform === p} onChange={() => setPlatform(p as PlatformType)} className="accent-green-500" />
                {p}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5 flex items-center gap-1"><Tag size={10} /> Tags</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {PRESET_TAGS.map(tag => (
            <button key={tag} type="button" onClick={() => toggleTag(tag)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${tags.includes(tag) ? 'bg-green-800/60 border border-green-600/60 text-green-300' : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white'}`}>
              {tag}
            </button>
          ))}
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 bg-zinc-800 text-zinc-300 text-xs px-2.5 py-1 rounded-lg">
                {tag}<button type="button" onClick={() => toggleTag(tag)}><X size={10} className="text-zinc-500 hover:text-red-400" /></button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input value={customTag} onChange={e => setCustomTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
            placeholder="Tag custom..." className="flex-1 bg-zinc-900 border border-zinc-800 text-white px-3 py-2 rounded-xl text-xs outline-none placeholder:text-zinc-700" />
          <button type="button" onClick={addCustomTag} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-xl text-xs font-bold">+ Add</button>
        </div>
      </div>

      {/* Files */}
      <div className="border-t border-zinc-800/60 pt-4 space-y-4">
        <input ref={imgRef} type="file" accept="image/*" onChange={handleImgFile} className="hidden" />
        <input ref={modRef} type="file" onChange={handleModFile} className="hidden" />

        {/* Image */}
        <div>
          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2 flex items-center gap-1"><Image size={10} /> Thumbnail (opsional)</label>
          {imgPreview ? (
            <div className="relative rounded-xl overflow-hidden h-32 bg-zinc-900 border border-zinc-800">
              <img src={imgPreview} className="w-full h-full object-cover" alt="" />
              <button type="button" onClick={() => { setImgUrl(''); setImgFile(null); setImgPreview(''); }} className="absolute top-2 right-2 bg-black/70 text-red-400 rounded-lg p-1.5"><X size={12} /></button>
              {imgUploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-white" /></div>}
            </div>
          ) : (
            <button type="button" onClick={() => imgRef.current?.click()} disabled={imgUploading}
              className="w-full border-2 border-dashed border-zinc-800 hover:border-green-700/60 text-zinc-600 hover:text-green-400 py-6 rounded-xl text-sm transition-all flex flex-col items-center gap-2 bg-zinc-900/20">
              {imgUploading ? <><Loader2 size={16} className="animate-spin" /> Mengupload...</> : <><Image size={16} /> Klik untuk upload thumbnail</>}
            </button>
          )}
          <input type="url" placeholder="Atau paste URL gambar..." value={imageUrl} onChange={e => { setImgUrl(e.target.value); setImgPreview(e.target.value); }}
            className="w-full mt-2 bg-zinc-900/50 border border-zinc-800/60 text-zinc-400 px-3 py-2 rounded-xl text-xs outline-none placeholder:text-zinc-700 focus:border-zinc-600" />
        </div>

        {/* Mod file */}
        <div>
          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2 flex items-center gap-1"><FileCode size={10} /> File Mod *</label>
          <p className="text-[10px] text-zinc-700 mb-2">⚠️ Maks 50MB. File lebih besar? Gunakan URL eksternal.</p>
          <button type="button" onClick={() => modRef.current?.click()} disabled={modUploading}
            className={`w-full border-2 border-dashed py-6 rounded-xl text-sm transition-all flex flex-col items-center gap-2 disabled:opacity-50 ${downloadUrl && !modUploading ? 'border-green-700/60 bg-green-900/10 text-green-400' : 'border-zinc-800 hover:border-green-700/60 text-zinc-600 hover:text-green-400 bg-zinc-900/20'}`}>
            {modUploading ? <><Loader2 size={16} className="animate-spin" /> Mengupload...</> : downloadUrl ? <><FileCode size={16} /> {modFile?.name || 'File tersimpan'} ✓</> : <><Upload size={16} /> Upload file mod</>}
          </button>
          <input type="url" placeholder="Atau paste URL download..." value={downloadUrl} onChange={e => setDlUrl(e.target.value)}
            className="w-full mt-2 bg-zinc-900/50 border border-zinc-800/60 text-zinc-400 px-3 py-2 rounded-xl text-xs outline-none placeholder:text-zinc-700 focus:border-zinc-600" />
        </div>

        {/* Preview URL */}
        <div>
          <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Preview Video (opsional)</label>
          <input type="url" placeholder="https://youtube.com/..." value={mediaUrl} onChange={e => setMediaUrl(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-2.5 rounded-xl text-xs outline-none placeholder:text-zinc-700 focus:border-zinc-700" />
        </div>
      </div>

      <button type="submit" disabled={submitting || modUploading || imgUploading || !downloadUrl}
        className="w-full bg-green-700 hover:bg-green-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
        {submitting ? <><Loader2 size={16} className="animate-spin" /> Mengupload...</> : !downloadUrl ? 'Upload File Mod Dulu' : <><Upload size={16} /> PUBLISH MOD</>}
      </button>
    </form>
  );
};

// ── MAIN ───────────────────────────────────────────────────────────────────
const UserPanel: React.FC = () => {
  const { user, isVIP, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<PanelTab>('profile');

  if (!user) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center space-y-4">
        <User size={48} className="text-zinc-700 mx-auto" />
        <p className="text-zinc-400">Kamu harus <Link to="/login" className="text-green-400 underline">login</Link> dulu.</p>
      </div>
    </div>
  );

  const isAdmin = user.guildRoles?.some(r => ['Admin','Administrator','Owner','Founder','Co-Founder'].includes(r));
  const isModder = user.guildRoles?.some(r => ['Modder','Verified Modder','Verified','Trusted Modder','Script Maker','Lua Modder','Admin','Administrator','Owner','Founder','Co-Founder'].includes(r));

  const tabs = [
    { id: 'profile', label: 'Profil', icon: <User size={13} /> },
    { id: 'license', label: 'Lisensi', icon: <Key size={13} /> },
    ...(isModder ? [{ id: 'mods', label: 'Mod Saya', icon: <Package size={13} /> }] : []),
    ...(isModder ? [{ id: 'upload', label: 'Upload Mod', icon: <Upload size={13} /> }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-16">
      {/* Header */}
      <div className="border-b border-zinc-800/60 bg-[#0d0d0d] sticky top-14 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-xl object-cover border border-zinc-700" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-white font-black">{user.username.slice(0,2).toUpperCase()}</div>
              )}
              <div>
                <p className="text-white font-black text-sm">{user.username}</p>
                <span className={`text-[9px] font-black uppercase ${isAdmin ? 'text-red-400' : isVIP ? 'text-yellow-400' : 'text-blue-400'}`}>
                  {isAdmin ? 'ADMIN' : user.tier}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link to="/admin" className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/25 border border-red-900/40 text-red-400 text-xs font-bold rounded-lg hover:bg-red-900/40 transition-colors">
                  <Shield size={11} /> Admin Panel
                </Link>
              )}
              <button onClick={logout} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-red-400 text-xs font-bold rounded-lg transition-colors">
                Keluar
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id as PanelTab)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${tab === t.id ? 'bg-green-700 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6">
        {tab === 'profile' && <ProfileTab user={user} isVIP={isVIP} />}
        {tab === 'license' && <LicenseTab user={user} />}
        {tab === 'mods'    && <MyModsTab user={user} />}
        {tab === 'upload'  && <UploadTab user={user} />}
      </div>
    </div>
  );
};

export default UserPanel;