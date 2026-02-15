import React, { useState, useRef } from 'react';
import {
  Trash2, Edit, Plus, Save, X, Lock, Unlock, ArrowLeft, Shield,
  Search, ArrowUp, ArrowDown, History, Box, User, ShieldCheck, FileText,
  Image, Upload, Link as LinkIcon, FileCode, Eye, Loader2, Tag, Cpu,
  AlertTriangle,
} from 'lucide-react';
import { getMods, saveMod, deleteMod, checkAdmin } from '../services/data';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { ModItem, CATEGORIES, PLATFORMS, CategoryType, PlatformType, PRESET_TAGS } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ObfuscateHistoryItem {
  id:              string;
  file_name:       string;
  original_code:   string;
  obfuscated_code: string;
  created_at:      string;
  user_id:         string | null;
  discord_id:      string | null;
}
interface CompileHistoryItem {
  id:         string;
  file_name:  string;
  raw_script: string;
  arch:       string;
  discord_id: string | null;
  created_at: string;
}
type CompileError = '' | 'TABLE_MISSING' | 'RLS_BLOCK' | 'UNKNOWN';

// ─── Role Helpers ─────────────────────────────────────────────────────────────
const ADMIN_ROLES = ['admin', 'administrator', 'owner', 'founder', 'co-founder'];
const MOD_ROLES   = ['moderator', 'developer', 'mod'];

const isAdminRole = (roles: string[]) =>
  roles.some(r => ADMIN_ROLES.includes(r.toLowerCase()));
const isAnyStaff = (roles: string[]) =>
  roles.some(r => [...ADMIN_ROLES, ...MOD_ROLES].includes(r.toLowerCase()));

// ─── Upload to Supabase Storage ───────────────────────────────────────────────
async function uploadFile(file: File, bucket: string, folder: string): Promise<string> {
  const safe = (file.name.split('/').pop() ?? file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${safe}`;
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const ImageUploadField: React.FC<{ value: string; onChange: (u: string) => void }> = ({ value, onChange }) => {
  const [mode, setMode]           = useState<'url'|'upload'>('url');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]     = useState(value || '');
  const ref                       = useRef<HTMLInputElement>(null);
  const { showToast }             = useToast();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true);
    try { const u = await uploadFile(f, 'mod-images', 'thumbnails'); setPreview(u); onChange(u); showToast('Gambar diupload!'); }
    catch (err: any) { showToast('Gagal: ' + err.message, 'error'); }
    finally { setUploading(false); }
  };

  const ModeBtn = ({ m }: { m: 'url'|'upload' }) => (
    <button type="button" onClick={() => setMode(m)}
      className={`text-[10px] px-2 py-0.5 rounded transition-all ${mode===m ? 'bg-zinc-700 text-white':'text-zinc-600 hover:text-white'}`}>
      {m === 'url' ? <><LinkIcon size={9} className="inline mr-0.5"/>URL</> : <><Upload size={9} className="inline mr-0.5"/>Upload</>}
    </button>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Image size={11}/> Gambar <span className="text-zinc-600 normal-case font-normal">(opsional)</span>
        </label>
        <div className="flex gap-1"><ModeBtn m="url"/><ModeBtn m="upload"/></div>
      </div>
      {mode === 'url' ? (
        <input type="url" placeholder="https://..." value={value}
          onChange={e => { onChange(e.target.value); setPreview(e.target.value); }}
          className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm focus:border-green-700 outline-none"/>
      ) : (
        <>
          <input ref={ref} type="file" accept="image/*" onChange={onFile} className="hidden"/>
          <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
            className="w-full border-2 border-dashed border-zinc-800 hover:border-green-700 text-zinc-500 hover:text-green-400 py-3 rounded-lg text-xs transition-all flex items-center justify-center gap-2 bg-zinc-900/40">
            {uploading ? <><Loader2 size={13} className="animate-spin"/> Mengupload...</> : <><Upload size={13}/> PNG / JPG / WEBP</>}
          </button>
        </>
      )}
      {preview && (
        <div className="relative mt-1 rounded-lg overflow-hidden border border-zinc-800 h-24 bg-black">
          <img src={preview} className="w-full h-full object-cover opacity-70" onError={() => setPreview('')} alt=""/>
          <button type="button" onClick={() => { onChange(''); setPreview(''); }}
            className="absolute top-1 right-1 bg-black/70 text-red-400 rounded p-0.5 hover:bg-red-900/60"><X size={13}/></button>
        </div>
      )}
    </div>
  );
};

const FileUploadField: React.FC<{ value: string; onChange: (u: string) => void }> = ({ value, onChange }) => {
  const [mode, setMode]     = useState<'url'|'upload'>('url');
  const [loading, setLoad]  = useState(false);
  const [name, setName]     = useState('');
  const ref                 = useRef<HTMLInputElement>(null);
  const { showToast }       = useToast();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setLoad(true);
    try { const u = await uploadFile(f, 'mod-files', 'scripts'); onChange(u); setName(f.name); showToast('File diupload!'); }
    catch (err: any) { showToast('Gagal: ' + err.message, 'error'); }
    finally { setLoad(false); }
  };

  const ModeBtn = ({ m }: { m: 'url'|'upload' }) => (
    <button type="button" onClick={() => setMode(m)}
      className={`text-[10px] px-2 py-0.5 rounded transition-all ${mode===m ? 'bg-zinc-700 text-white':'text-zinc-600 hover:text-white'}`}>
      {m === 'url' ? <><LinkIcon size={9} className="inline mr-0.5"/>URL</> : <><Upload size={9} className="inline mr-0.5"/>Upload</>}
    </button>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <FileCode size={11}/> File Mod <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-1"><ModeBtn m="url"/><ModeBtn m="upload"/></div>
      </div>
      {mode === 'url' ? (
        <input type="url" required placeholder="https://..." value={value} onChange={e => onChange(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm focus:border-green-700 outline-none"/>
      ) : (
        <>
          <input ref={ref} type="file" onChange={onFile} className="hidden"/>
          <button type="button" onClick={() => ref.current?.click()} disabled={loading}
            className="w-full border-2 border-dashed border-zinc-800 hover:border-green-700 text-zinc-500 hover:text-green-400 py-3 rounded-lg text-xs transition-all flex items-center justify-center gap-2 bg-zinc-900/40">
            {loading ? <><Loader2 size={13} className="animate-spin"/> Mengupload...</>
              : name ? <><FileCode size={13} className="text-green-400"/><span className="text-green-400 truncate max-w-xs">{name}</span></>
              : <><Upload size={13}/> .lua / .cs / .zip / dll</>}
          </button>
        </>
      )}
    </div>
  );
};

const TagSelector: React.FC<{ value: string[]; onChange: (t: string[]) => void }> = ({ value, onChange }) => {
  const [custom, setCustom] = useState('');
  const toggle    = (t: string) => onChange(value.includes(t) ? value.filter(x => x !== t) : [...value, t]);
  const addCustom = () => { if (!custom.trim() || value.includes(custom.trim())) return; onChange([...value, custom.trim()]); setCustom(''); };

  return (
    <div className="space-y-2">
      <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
        <Tag size={11}/> Tags <span className="text-zinc-600 normal-case font-normal">(opsional)</span>
      </label>
      <div className="flex flex-wrap gap-1.5">
        {PRESET_TAGS.map(tag => (
          <button key={tag} type="button" onClick={() => toggle(tag)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              value.includes(tag) ? 'bg-green-800/60 border border-green-600/60 text-green-300'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600'}`}>
            {tag}
          </button>
        ))}
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {value.map(tag => (
            <span key={tag} className="flex items-center gap-1 bg-zinc-800 text-zinc-300 text-xs px-2 py-0.5 rounded-md">
              {tag}
              <button type="button" onClick={() => toggle(tag)} className="text-zinc-500 hover:text-red-400"><X size={10}/></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input value={custom} onChange={e => setCustom(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())}
          placeholder="Custom tag..." className="flex-1 bg-zinc-950 border border-zinc-800 text-white px-3 py-1.5 rounded-lg text-xs outline-none"/>
        <button type="button" onClick={addCustom} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">+ Add</button>
      </div>
    </div>
  );
};

// Helper UI
const TableLoader = () => (
  <div className="py-12 text-center text-zinc-600 text-xs flex items-center justify-center gap-2">
    <Loader2 size={14} className="animate-spin"/> Memuat...
  </div>
);
const TableEmpty = ({ msg }: { msg: string }) => (
  <div className="py-12 text-center text-zinc-700 text-sm">{msg}</div>
);
const ErrorBox = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="py-12 text-center space-y-2">
    <AlertTriangle size={28} className="text-yellow-600 mx-auto mb-2"/>
    <p className="text-zinc-400 text-sm font-bold">{title}</p>
    {hint && <p className="text-zinc-700 text-xs max-w-sm mx-auto">{hint}</p>}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const Admin: React.FC = () => {
  const { showToast } = useToast();
  const { user }      = useAuth();

  const [authed, setAuthed]           = useState(false);
  const [password, setPassword]       = useState('');
  const [loginErr, setLoginErr]       = useState('');
  const [activeTab, setActiveTab]     = useState<'mods'|'obfuscate'|'compiler'>('mods');

  // Mods
  const [mods, setMods]               = useState<ModItem[]>([]);
  const [filtered, setFiltered]       = useState<ModItem[]>([]);
  const [search, setSearch]           = useState('');
  const [editing, setEditing]         = useState(false);
  const [dirty, setDirty]             = useState(false);
  const [saving, setSaving]           = useState(false);

  // History obfuscate
  const [obfItems, setObfItems]       = useState<ObfuscateHistoryItem[]>([]);
  const [obfLoading, setObfLoading]   = useState(false);

  // History compiler
  const [cpItems, setCpItems]         = useState<CompileHistoryItem[]>([]);
  const [cpLoading, setCpLoading]     = useState(false);
  const [cpError, setCpError]         = useState<CompileError>('');

  const emptyMod: ModItem = {
    id: '', title: '', description: '', category: 'Moonloader', platform: 'PC',
    imageUrl: '', mediaUrl: '', downloadUrl: '', isPremium: false,
    dateAdded: '', author: user?.username || 'Admin', tags: [],
  };
  const [form, setForm] = useState<ModItem>(emptyMod);

  // Hak akses
  const isPasswordAdmin = localStorage.getItem('forge_role') === 'ADMIN';
  const isDiscordAdmin  = user ? isAdminRole(user.guildRoles) : false;
  const isDiscordStaff  = user ? isAnyStaff(user.guildRoles) : false;
  const canSeeHistory   = isPasswordAdmin || isDiscordAdmin;  // HANYA admin, bukan moderator

  // ── Auth ───────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (isPasswordAdmin)  { setAuthed(true); return; }
    if (isDiscordStaff)   { setAuthed(true); }
  }, [user]); // eslint-disable-line

  React.useEffect(() => {
    if (!authed) return;
    if (activeTab === 'mods')       loadMods();
    if (activeTab === 'obfuscate')  canSeeHistory && loadObfHistory();
    if (activeTab === 'compiler')   canSeeHistory && loadCpHistory();
  }, [authed, activeTab]); // eslint-disable-line

  // ── Mods ───────────────────────────────────────────────────────────────────
  const loadMods = async () => {
    const data = await getMods();
    setMods(data); setFiltered(data); setDirty(false);
  };

  React.useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(search ? mods.filter(m =>
      m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
    ) : mods);
  }, [search, mods]);

  const moveRow = (i: number, dir: 'up'|'down') => {
    if (search) return;
    const arr = [...mods];
    const to  = dir === 'up' ? i - 1 : i + 1;
    if (to < 0 || to >= arr.length) return;
    [arr[i], arr[to]] = [arr[to], arr[i]];
    setMods(arr); setFiltered(arr); setDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const item = { ...form };
      if (!item.id) delete (item as any).id;
      await saveMod(item);
      setEditing(false); setForm(emptyMod);
      await loadMods();
      showToast('Mod disimpan!');
    } catch { showToast('Gagal simpan.', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus mod ini?')) return;
    await deleteMod(id);
    await loadMods();
    showToast('Mod dihapus.', 'info');
  };

  // ── History Obfuscate ──────────────────────────────────────────────────────
  const loadObfHistory = async () => {
    setObfLoading(true);
    try {
      const { data, error } = await supabase
        .from('obfuscation_history').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setObfItems(data || []);
    } catch (err: any) { showToast('Gagal: ' + err.message, 'error'); }
    finally { setObfLoading(false); }
  };

  const downloadObf = (item: ObfuscateHistoryItem, type: 'raw'|'protected') => {
    const code = type === 'raw' ? item.original_code : item.obfuscated_code;
    if (!code) { showToast('File kosong.', 'error'); return; }
    const a = Object.assign(document.createElement('a'), {
      href:     URL.createObjectURL(new Blob([code], { type: 'text/plain' })),
      download: `${type === 'raw' ? 'RAW_' : 'PROTECTED_'}${item.file_name}`,
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const deleteObf = async (id: string) => {
    if (!confirm('Hapus history?')) return;
    try {
      const { error } = await supabase.from('obfuscation_history').delete().eq('id', id);
      if (error) throw error;
      setObfItems(h => h.filter(i => i.id !== id));
      showToast('Dihapus.', 'info');
    } catch (err: any) { showToast('Gagal: ' + err.message, 'error'); }
  };

  // ── History Compiler ───────────────────────────────────────────────────────
  const loadCpHistory = async () => {
    setCpLoading(true); setCpError('');
    try {
      const { data, error } = await supabase
        .from('compile_history').select('*').order('created_at', { ascending: false });
      if (error) {
        if (error.code === '42501' || error.message.includes('permission')) { setCpError('RLS_BLOCK'); return; }
        if (error.message.includes('does not exist'))                       { setCpError('TABLE_MISSING'); return; }
        throw error;
      }
      setCpItems(data || []);
    } catch (err: any) { showToast('Gagal: ' + err.message, 'error'); setCpError('UNKNOWN'); }
    finally { setCpLoading(false); }
  };

  const downloadCp = (item: CompileHistoryItem) => {
    const a = Object.assign(document.createElement('a'), {
      href:     URL.createObjectURL(new Blob([item.raw_script], { type: 'text/plain' })),
      download: item.file_name,
    });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const deleteCp = async (id: string) => {
    if (!confirm('Hapus history compile?')) return;
    try {
      const { error } = await supabase.from('compile_history').delete().eq('id', id);
      if (error) throw error;
      setCpItems(h => h.filter(i => i.id !== id));
      showToast('Dihapus.', 'info');
    } catch (err: any) { showToast('Gagal: ' + err.message, 'error'); }
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const ok = await checkAdmin(password);
    if (ok) { setAuthed(true); localStorage.setItem('forge_role', 'ADMIN'); setLoginErr(''); }
    else setLoginErr('Password salah!');
    setSaving(false);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // LOGIN SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.04)_0%,transparent_70%)]"/>
      <div className="absolute top-4 left-4">
        <Link to="/" className="text-zinc-600 hover:text-white flex items-center gap-1.5 text-xs transition-colors">
          <ArrowLeft size={14}/> Kembali
        </Link>
      </div>
      <div className="relative bg-[#111] p-7 rounded-2xl border border-red-900/25 max-w-xs w-full shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-700 to-transparent rounded-t-2xl"/>
        <Shield size={36} className="text-red-500/80 mx-auto mb-4"/>
        <h2 className="text-base font-black text-white text-center mb-1">Admin Terminal</h2>
        <p className="text-zinc-600 text-xs text-center mb-5">Restricted access</p>
        {!user && (
          <div className="mb-4 bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-500 text-center">
            Punya role admin/mod?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300">Login Discord dulu</Link>
          </div>
        )}
        {user && !isDiscordStaff && (
          <div className="mb-4 bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-500 text-center">
            Role Discord kamu tidak punya akses. Gunakan password.
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-3">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoFocus
            className="w-full bg-black border border-zinc-800 text-red-400 px-4 py-2.5 rounded-lg text-center font-mono text-sm focus:border-red-700 outline-none"
            placeholder="••••••••"/>
          {loginErr && <p className="text-red-500 text-xs text-center">{loginErr}</p>}
          <button type="submit" disabled={saving}
            className="w-full bg-red-900/80 hover:bg-red-800 text-white py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
            {saving ? <><Loader2 size={14} className="animate-spin"/> Auth...</> : 'UNLOCK TERMINAL'}
          </button>
        </form>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-4 py-7">

        {/* Header */}
        <div className="flex justify-between items-center mb-5 bg-[#111] px-5 py-4 rounded-xl border border-zinc-800/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-900/25 border border-red-900/40 flex items-center justify-center">
              <Shield size={17} className="text-red-500"/>
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight">ADMIN PANEL</h1>
              <p className="text-zinc-600 text-xs flex items-center gap-2">
                {user ? (
                  <>
                    {user.username}
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                      canSeeHistory ? 'bg-red-900/40 text-red-400' : 'bg-orange-900/40 text-orange-400'
                    }`}>
                      {canSeeHistory ? 'ADMIN' : 'MODERATOR'}
                    </span>
                  </>
                ) : 'Super User — Password Login'}
              </p>
            </div>
          </div>
          <button onClick={() => { localStorage.removeItem('forge_role'); setAuthed(false); }}
            className="text-xs text-red-500/60 hover:text-red-400 border border-red-900/25 hover:border-red-900/60 px-3 py-1.5 rounded-lg transition-all">
            LOGOUT
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/60 w-fit">
          {/* Tab Mods — semua staff bisa */}
          <button onClick={() => setActiveTab('mods')}
            className={`px-4 py-2 font-black text-[10px] tracking-wider flex items-center gap-1.5 rounded-lg transition-all ${
              activeTab === 'mods' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-600 hover:text-zinc-300'}`}>
            <Box size={12}/> KELOLA MODS
          </button>

          {/* Tab History — HANYA admin */}
          {canSeeHistory && (
            <>
              <button onClick={() => setActiveTab('obfuscate')}
                className={`px-4 py-2 font-black text-[10px] tracking-wider flex items-center gap-1.5 rounded-lg transition-all ${
                  activeTab === 'obfuscate' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-600 hover:text-zinc-300'}`}>
                <History size={12}/> HISTORY OBFUSCATE
              </button>
              <button onClick={() => setActiveTab('compiler')}
                className={`px-4 py-2 font-black text-[10px] tracking-wider flex items-center gap-1.5 rounded-lg transition-all ${
                  activeTab === 'compiler' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-600 hover:text-zinc-300'}`}>
                <Cpu size={12}/> HISTORY COMPILER
              </button>
            </>
          )}
        </div>

        {/* ─── TAB: MODS ──────────────────────────────────────────────────── */}
        {activeTab === 'mods' && (
          <div className="animate-in fade-in duration-200">
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" size={14}/>
                <input placeholder="Cari mod..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white pl-10 pr-4 py-2.5 rounded-lg text-sm focus:border-zinc-600 outline-none"/>
              </div>
              <div className="flex gap-2">
                {dirty && (
                  <button onClick={() => { setDirty(false); showToast('Urutan disimpan!'); }}
                    className="bg-yellow-600 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-black text-xs flex items-center gap-1.5 transition-colors animate-bounce">
                    <Save size={13}/> SAVE ORDER
                  </button>
                )}
                <button onClick={() => { setForm(emptyMod); setEditing(true); }}
                  className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-black text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-green-900/30">
                  <Plus size={13}/> TAMBAH MOD
                </button>
              </div>
            </div>

            <div className="bg-[#111] border border-zinc-800/70 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-black/40 text-zinc-600 uppercase text-[9px] tracking-widest border-b border-zinc-800">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">Urut</th>
                    <th className="px-4 py-3">Nama Mod</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filtered.map((mod, i) => (
                    <tr key={mod.id} className="hover:bg-zinc-800/15 transition-colors">
                      <td className="px-4 py-3 text-center">
                        {!search ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <button onClick={() => moveRow(i, 'up')} disabled={i === 0}
                              className="text-zinc-700 hover:text-green-400 disabled:opacity-20"><ArrowUp size={11}/></button>
                            <button onClick={() => moveRow(i, 'down')} disabled={i === mods.length-1}
                              className="text-zinc-700 hover:text-red-400 disabled:opacity-20"><ArrowDown size={11}/></button>
                          </div>
                        ) : <span className="text-zinc-700">—</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-sm">
                        {mod.title}
                        {mod.tags && mod.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {mod.tags.slice(0,3).map(t =>
                              <span key={t} className="text-[9px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">{t}</span>)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] bg-zinc-800/80 text-zinc-400 px-2 py-0.5 rounded">{mod.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        {mod.isPremium
                          ? <span className="text-[9px] bg-yellow-900/25 text-yellow-500 border border-yellow-800/40 px-2 py-0.5 rounded font-black">VIP</span>
                          : <span className="text-[9px] bg-green-900/25 text-green-500 border border-green-800/40 px-2 py-0.5 rounded font-black">Free</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => { setForm(mod); setEditing(true); }}
                            className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-all"><Edit size={14}/></button>
                          <button onClick={() => handleDelete(mod.id)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={5}><TableEmpty msg="Tidak ada mod."/></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB: HISTORY OBFUSCATE ─────────────────────────────────────── */}
        {activeTab === 'obfuscate' && (
          <div className="animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                <History size={13}/> Riwayat Lua Shield / Obfuscate
              </h3>
              <button onClick={loadObfHistory} className="text-xs text-zinc-600 hover:text-white underline">Refresh</button>
            </div>
            <div className="bg-[#111] border border-zinc-800/70 rounded-xl overflow-hidden">
              {obfLoading ? <TableLoader/>
                : obfItems.length === 0 ? <TableEmpty msg="Belum ada history obfuscate."/>
                : (
                  <table className="w-full text-left">
                    <thead className="bg-black/40 text-zinc-600 uppercase text-[9px] tracking-widest border-b border-zinc-800">
                      <tr>
                        <th className="px-4 py-3">Waktu</th>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">File</th>
                        <th className="px-4 py-3 text-right">Download</th>
                        <th className="px-4 py-3 text-right">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {obfItems.map(item => (
                        <tr key={item.id} className="hover:bg-zinc-800/15">
                          <td className="px-4 py-3 text-zinc-600 text-xs">{new Date(item.created_at).toLocaleString('id-ID')}</td>
                          <td className="px-4 py-3">
                            {(item.discord_id || item.user_id)
                              ? <span className="text-green-500 text-xs flex items-center gap-1"><User size={10}/> Member</span>
                              : <span className="text-zinc-600 text-xs flex items-center gap-1"><User size={10}/> Guest</span>}
                          </td>
                          <td className="px-4 py-3 font-mono text-yellow-500/80 text-xs truncate max-w-[200px]">{item.file_name}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button onClick={() => downloadObf(item, 'raw')}
                                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 border border-zinc-700">
                                <FileText size={9}/> RAW
                              </button>
                              <button onClick={() => downloadObf(item, 'protected')}
                                className="bg-blue-900/25 hover:bg-blue-700 text-blue-400 hover:text-white px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 border border-blue-900/40 transition-all">
                                <ShieldCheck size={9}/> SECURE
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => deleteObf(item.id)}
                              className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg"><Trash2 size={13}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
          </div>
        )}

        {/* ─── TAB: HISTORY COMPILER ──────────────────────────────────────── */}
        {activeTab === 'compiler' && (
          <div className="animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-black text-orange-400 uppercase tracking-widest flex items-center gap-1.5">
                <Cpu size={13}/> Riwayat LuaJIT Compiler
              </h3>
              <div className="flex items-center gap-4">
                {cpItems.length > 0 && (
                  <div className="flex gap-3 text-[10px] text-zinc-600">
                    <span><span className="text-white font-bold">{cpItems.length}</span> total</span>
                    <span><span className="text-green-400 font-bold">{cpItems.filter(i => i.arch==='32').length}</span> × 32-bit</span>
                    <span><span className="text-blue-400 font-bold">{cpItems.filter(i => i.arch==='64').length}</span> × 64-bit</span>
                  </div>
                )}
                <button onClick={loadCpHistory} className="text-xs text-zinc-600 hover:text-white underline">Refresh</button>
              </div>
            </div>

            <div className="bg-[#111] border border-zinc-800/70 rounded-xl overflow-hidden">
              {cpLoading ? <TableLoader/>
                : cpError === 'TABLE_MISSING' ? (
                  <ErrorBox
                    title="Tabel compile_history belum dibuat"
                    hint="Jalankan DATABASE_FIX_v2.sql di Supabase SQL Editor, kemudian klik Refresh."/>
                ) : cpError === 'RLS_BLOCK' ? (
                  <ErrorBox
                    title="RLS memblokir akses baca"
                    hint={`Jalankan di Supabase SQL Editor:\nALTER TABLE compile_history DISABLE ROW LEVEL SECURITY;`}/>
                ) : cpError === 'UNKNOWN' ? (
                  <ErrorBox title="Terjadi error tidak diketahui" hint="Cek console browser untuk detail error."/>
                ) : cpItems.length === 0 ? (
                  <TableEmpty msg="Belum ada history compile."/>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-black/40 text-zinc-600 uppercase text-[9px] tracking-widest border-b border-zinc-800">
                      <tr>
                        <th className="px-4 py-3">Waktu</th>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">File</th>
                        <th className="px-4 py-3">Platform</th>
                        <th className="px-4 py-3 text-right">Download RAW</th>
                        <th className="px-4 py-3 text-right">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {cpItems.map(item => (
                        <tr key={item.id} className="hover:bg-zinc-800/15">
                          <td className="px-4 py-3 text-zinc-600 text-xs">{new Date(item.created_at).toLocaleString('id-ID')}</td>
                          <td className="px-4 py-3">
                            {item.discord_id
                              ? <span className="text-green-500 text-xs flex items-center gap-1"><User size={10}/> Member</span>
                              : <span className="text-zinc-600 text-xs flex items-center gap-1"><User size={10}/> Guest</span>}
                          </td>
                          <td className="px-4 py-3 font-mono text-orange-400/80 text-xs truncate max-w-[180px]">{item.file_name}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                              item.arch === '64'
                                ? 'bg-blue-900/25 text-blue-400 border-blue-900/40'
                                : 'bg-green-900/25 text-green-400 border-green-900/40'}`}>
                              {item.arch === '64' ? '64-bit · Android' : '32-bit · PC'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => downloadCp(item)}
                              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-orange-400 px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 border border-zinc-700 transition-colors ml-auto">
                              <FileText size={9}/> RAW .lua
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => deleteCp(item.id)}
                              className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg"><Trash2 size={13}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL EDIT / TAMBAH ──────────────────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 z-[99] flex items-start justify-center bg-black/95 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#111] border border-zinc-700/70 rounded-2xl max-w-xl w-full p-6 relative shadow-2xl my-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-600 to-transparent rounded-t-2xl"/>
            <button onClick={() => setEditing(false)}
              className="absolute top-4 right-4 text-zinc-600 hover:text-white bg-zinc-800 hover:bg-zinc-700 p-1.5 rounded-lg transition-all">
              <X size={14}/>
            </button>
            <h2 className="text-base font-black text-white mb-5 uppercase tracking-wide">
              {form.id ? '✏️ Edit Mod' : '➕ Tambah Mod Baru'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Judul *</label>
                  <input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm focus:border-green-700 outline-none"/>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Author *</label>
                  <input required type="text" value={form.author} onChange={e => setForm({...form, author: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm focus:border-green-700 outline-none"/>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Deskripsi *</label>
                <textarea required rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm focus:border-green-700 outline-none resize-none"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Kategori</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value as CategoryType})}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm outline-none">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Platform</label>
                  <div className="flex gap-3 py-2.5">
                    {PLATFORMS.map(p => (
                      <label key={p} className="flex items-center gap-1.5 text-zinc-300 text-xs cursor-pointer">
                        <input type="radio" checked={form.platform===p} onChange={() => setForm({...form, platform: p as PlatformType})} className="accent-green-500"/>
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="border-t border-zinc-800/60 pt-4 space-y-4">
                <ImageUploadField value={form.imageUrl} onChange={u => setForm({...form, imageUrl: u})}/>
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Eye size={10}/> Preview Media <span className="text-zinc-700 normal-case font-normal">(opsional)</span>
                  </label>
                  <input type="url" placeholder="https://youtube.com/watch?v=..." value={form.mediaUrl||''}
                    onChange={e => setForm({...form, mediaUrl: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm focus:border-green-700 outline-none"/>
                </div>
                <FileUploadField value={form.downloadUrl} onChange={u => setForm({...form, downloadUrl: u})}/>
              </div>
              <TagSelector value={form.tags||[]} onChange={tags => setForm({...form, tags})}/>
              <div onClick={() => setForm({...form, isPremium: !form.isPremium})}
                className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${
                  form.isPremium ? 'border-yellow-700/40 bg-yellow-900/10' : 'border-green-700/40 bg-green-900/10'}`}>
                <div>
                  <span className={`font-black text-sm ${form.isPremium ? 'text-yellow-500':'text-green-500'}`}>
                    {form.isPremium ? 'VIP ONLY' : 'GRATIS'}
                  </span>
                  <p className="text-zinc-600 text-xs mt-0.5">
                    {form.isPremium ? 'Hanya member VIP' : 'Semua orang bisa download'}
                  </p>
                </div>
                {form.isPremium ? <Lock size={15} className="text-yellow-500"/> : <Unlock size={15} className="text-green-500"/>}
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-white text-black hover:bg-zinc-100 font-black py-3 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
                {saving ? <><Loader2 size={14} className="animate-spin text-zinc-600"/> Menyimpan...</> : <><Save size={14}/> SIMPAN MOD</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;