import React, { useState, useRef } from 'react';
import {
  Trash2, Edit, Plus, Save, X, Lock, Unlock, ArrowLeft, Shield,
  Search, ArrowUp, ArrowDown, History, Box, User, ShieldCheck, FileText,
  Image, Upload, Link as LinkIcon, FileCode, Eye, Loader2, Tag
} from 'lucide-react';
import { getMods, saveMod, deleteMod, checkAdmin } from '../services/data';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { ModItem, CATEGORIES, PLATFORMS, CategoryType, PlatformType, PRESET_TAGS } from '../types';
import { useToast } from '../contexts/ToastContext';

// ===================== TYPES =====================
interface HistoryItem {
  id: string;
  file_name: string;
  obfuscated_code: string;
  original_code: string;
  created_at: string;
  user_id: string | null;
}

// ===================== UPLOAD HELPERS =====================
async function uploadFileToSupabase(file: File, bucket: string, folder: string): Promise<string> {
  const rawName = file.name.split("/").pop()?.split("\\").pop() || file.name;
  const safeName = rawName.replace(/[^a-zA-Z0-9._\-]/g, "_");
  const fileName = `${folder}/${safeName}`;
  const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, { cacheControl: "3600", upsert: true });
  if (error) throw new Error(error.message);
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}

// ===================== IMAGE UPLOAD =====================
const ImageUploadField: React.FC<{ value: string; onChange: (url: string) => void }> = ({ value, onChange }) => {
  const [mode, setMode] = useState<'url' | 'upload'>('url');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFileToSupabase(file, 'mod-images', 'thumbnails');
      setPreview(url); onChange(url);
      showToast('Gambar berhasil diupload!');
    } catch (err: any) {
      showToast('Gagal upload: ' + err.message, 'error');
    } finally { setUploading(false); }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Image size={11} /> Gambar <span className="text-zinc-600 normal-case font-normal">(opsional)</span>
        </label>
        <div className="flex gap-1">
          {(['url', 'upload'] as const).map(m => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`text-[10px] px-2 py-0.5 rounded transition-all ${mode === m ? 'bg-zinc-700 text-white' : 'text-zinc-600 hover:text-white'}`}>
              {m === 'url' ? <><LinkIcon size={9} className="inline mr-0.5" />URL</> : <><Upload size={9} className="inline mr-0.5" />Upload</>}
            </button>
          ))}
        </div>
      </div>
      {mode === 'url' ? (
        <input type="url" placeholder="https://... (kosongkan jika tidak ada)" value={value}
          onChange={(e) => { onChange(e.target.value); setPreview(e.target.value); }}
          className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm focus:border-green-700 outline-none transition-colors" />
      ) : (
        <>
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
            className="w-full border-2 border-dashed border-zinc-800 hover:border-green-700 text-zinc-500 hover:text-green-400 py-3 rounded-lg text-xs transition-all flex items-center justify-center gap-2 bg-zinc-900/40">
            {uploading ? <><Loader2 size={13} className="animate-spin" /> Mengupload...</> : <><Upload size={13} /> Upload PNG / JPG / WEBP</>}
          </button>
        </>
      )}
      {preview && (
        <div className="relative mt-1.5 rounded-lg overflow-hidden border border-zinc-800 h-24 bg-black">
          <img src={preview} alt="preview" className="w-full h-full object-cover opacity-70" onError={() => setPreview('')} />
          <button type="button" onClick={() => { onChange(''); setPreview(''); }}
            className="absolute top-1 right-1 bg-black/70 text-red-400 rounded p-0.5 hover:bg-red-900/60 transition-colors">
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
};

// ===================== FILE UPLOAD =====================
const FileUploadField: React.FC<{ value: string; onChange: (url: string) => void }> = ({ value, onChange }) => {
  const [mode, setMode] = useState<'url' | 'upload'>('url');
  const [uploading, setUploading] = useState(false);
  const [uploadedName, setUploadedName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFileToSupabase(file, 'mod-files', 'scripts');
      onChange(url); setUploadedName(file.name);
      showToast('File berhasil diupload!');
    } catch (err: any) {
      showToast('Gagal upload: ' + err.message, 'error');
    } finally { setUploading(false); }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <FileCode size={11} /> File Mod <span className="text-red-500 ml-0.5">*</span>
        </label>
        <div className="flex gap-1">
          {(['url', 'upload'] as const).map(m => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`text-[10px] px-2 py-0.5 rounded transition-all ${mode === m ? 'bg-zinc-700 text-white' : 'text-zinc-600 hover:text-white'}`}>
              {m === 'url' ? <><LinkIcon size={9} className="inline mr-0.5" />URL</> : <><Upload size={9} className="inline mr-0.5" />Upload</>}
            </button>
          ))}
        </div>
      </div>
      {mode === 'url' ? (
        <input type="url" required placeholder="https://... link download" value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm focus:border-green-700 outline-none transition-colors" />
      ) : (
        <>
          <input ref={inputRef} type="file" onChange={handleFile} className="hidden" />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
            className="w-full border-2 border-dashed border-zinc-800 hover:border-green-700 text-zinc-500 hover:text-green-400 py-3 rounded-lg text-xs transition-all flex items-center justify-center gap-2 bg-zinc-900/40">
            {uploading
              ? <><Loader2 size={13} className="animate-spin" /> Mengupload...</>
              : uploadedName
              ? <><FileCode size={13} className="text-green-400" /><span className="text-green-400 truncate max-w-[200px]">{uploadedName}</span></>
              : <><Upload size={13} /> Upload file (.lua, .cs, .zip, dll)</>}
          </button>
        </>
      )}
    </div>
  );
};

// ===================== TAG SELECTOR =====================
const TagSelector: React.FC<{ value: string[]; onChange: (tags: string[]) => void }> = ({ value, onChange }) => {
  const [custom, setCustom] = useState('');

  const toggle = (tag: string) => {
    onChange(value.includes(tag) ? value.filter(t => t !== tag) : [...value, tag]);
  };

  const addCustom = () => {
    if (!custom.trim() || value.includes(custom.trim())) return;
    onChange([...value, custom.trim()]);
    setCustom('');
  };

  return (
    <div className="space-y-2">
      <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
        <Tag size={11} /> Tags <span className="text-zinc-600 normal-case font-normal">(opsional)</span>
      </label>
      <div className="flex flex-wrap gap-1.5">
        {PRESET_TAGS.map(tag => (
          <button key={tag} type="button" onClick={() => toggle(tag)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              value.includes(tag)
                ? 'bg-green-800/60 border border-green-600/60 text-green-300'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600'
            }`}>
            {tag}
          </button>
        ))}
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {value.map(tag => (
            <span key={tag} className="flex items-center gap-1 bg-zinc-800 text-zinc-300 text-xs px-2 py-0.5 rounded-md">
              {tag}
              <button type="button" onClick={() => toggle(tag)} className="text-zinc-500 hover:text-red-400 transition-colors">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input value={custom} onChange={e => setCustom(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())}
          placeholder="Tambah tag custom..."
          className="flex-1 bg-zinc-950 border border-zinc-800 text-white px-3 py-1.5 rounded-lg text-xs focus:border-zinc-600 outline-none transition-colors" />
        <button type="button" onClick={addCustom}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
          + Add
        </button>
      </div>
    </div>
  );
};

// ===================== MAIN ADMIN =====================
const Admin: React.FC = () => {
  const { showToast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'mods' | 'history'>('mods');

  const [mods, setMods] = useState<ModItem[]>([]);
  const [filteredMods, setFilteredMods] = useState<ModItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const emptyForm: ModItem = {
    id: '', title: '', description: '', category: 'Moonloader', platform: 'PC',
    imageUrl: '', mediaUrl: '', downloadUrl: '', isPremium: false, dateAdded: '', author: 'kotkaaja',
    tags: []
  };
  const [formData, setFormData] = useState<ModItem>(emptyForm);

  React.useEffect(() => {
    if (localStorage.getItem('forge_role') === 'ADMIN') setIsAuthenticated(true);
  }, []);

  React.useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'mods') refreshMods();
      if (activeTab === 'history') refreshHistory();
    }
  }, [isAuthenticated, activeTab]);

  const refreshMods = async () => {
    setIsLoading(true);
    const data = await getMods();
    setMods(data); setFilteredMods(data);
    setIsLoading(false); setIsDirty(false);
  };

  React.useEffect(() => {
    const lower = searchTerm.toLowerCase();
    setFilteredMods(searchTerm ? mods.filter(m =>
      m.title.toLowerCase().includes(lower) || m.category.toLowerCase().includes(lower)
    ) : mods);
  }, [searchTerm, mods]);

  const moveRow = (index: number, dir: 'up' | 'down') => {
    if (searchTerm) return;
    const arr = [...mods];
    const to = dir === 'up' ? index - 1 : index + 1;
    if (to < 0 || to >= arr.length) return;
    [arr[index], arr[to]] = [arr[to], arr[index]];
    setMods(arr); setFilteredMods(arr); setIsDirty(true);
  };

  const handleSaveMod = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const item = { ...formData };
      if (!item.id) delete (item as any).id;
      await saveMod(item);
      setIsEditing(false); setFormData(emptyForm);
      await refreshMods();
      showToast('Mod berhasil disimpan!');
    } catch { showToast('Gagal menyimpan mod.', 'error'); }
    finally { setIsLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus mod ini permanen?')) return;
    setIsLoading(true);
    await deleteMod(id);
    await refreshMods();
    setIsLoading(false);
    showToast('Mod dihapus.', 'info');
  };

  const refreshHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase.from('obfuscation_history').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setHistoryItems(data || []);
    } catch (err: any) {
      showToast('Gagal ambil history: ' + err.message, 'error');
    } finally { setHistoryLoading(false); }
  };

  const downloadHistory = (item: HistoryItem, type: 'raw' | 'protected') => {
    const content = type === 'raw' ? item.original_code : item.obfuscated_code;
    if (!content) { showToast('File kosong.', 'error'); return; }
    const el = document.createElement('a');
    el.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    el.download = `${type === 'raw' ? 'RAW_' : 'PROTECTED_'}${item.file_name}`;
    document.body.appendChild(el); el.click(); document.body.removeChild(el);
  };

  const deleteHistory = async (id: string) => {
    if (!confirm('Hapus history ini?')) return;
    try {
      const { error } = await supabase.from('obfuscation_history').delete().eq('id', id);
      if (error) throw error;
      setHistoryItems(h => h.filter(i => i.id !== id));
      showToast('History dihapus.', 'info');
    } catch (err: any) { showToast('Gagal: ' + err.message, 'error'); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const ok = await checkAdmin(password);
    if (ok) { setIsAuthenticated(true); localStorage.setItem('forge_role', 'ADMIN'); setLoginError(''); }
    else setLoginError('Password salah!');
    setIsLoading(false);
  };

  // LOGIN
  if (!isAuthenticated) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.04)_0%,transparent_70%)]" />
      <div className="absolute top-4 left-4">
        <Link to="/" className="text-zinc-600 hover:text-white flex items-center gap-1.5 transition-colors text-xs">
          <ArrowLeft size={14} /> Kembali
        </Link>
      </div>
      <div className="relative bg-[#111] p-7 rounded-2xl border border-red-900/25 max-w-xs w-full shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-700 to-transparent rounded-t-2xl" />
        <Shield size={36} className="text-red-500/80 mx-auto mb-4" />
        <h2 className="text-base font-black text-white text-center mb-1">Admin Terminal</h2>
        <p className="text-zinc-600 text-xs text-center mb-5">Restricted access</p>
        <form onSubmit={handleLogin} className="space-y-3">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full bg-black border border-zinc-800 text-red-400 px-4 py-2.5 rounded-lg text-center font-mono text-sm focus:border-red-700 outline-none transition-colors"
            placeholder="••••••••" autoFocus />
          {loginError && <p className="text-red-500 text-xs text-center">{loginError}</p>}
          <button type="submit" disabled={isLoading}
            className="w-full bg-red-900/80 hover:bg-red-800 text-white py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
            {isLoading ? <><Loader2 size={14} className="animate-spin" /> Auth...</> : 'UNLOCK TERMINAL'}
          </button>
        </form>
      </div>
    </div>
  );

  // DASHBOARD
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-4 py-7">
        {/* Header */}
        <div className="flex justify-between items-center mb-5 bg-[#111] px-5 py-4 rounded-xl border border-zinc-800/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-900/25 border border-red-900/40 flex items-center justify-center">
              <Shield size={17} className="text-red-500" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight">ADMIN PANEL</h1>
              <p className="text-zinc-600 text-xs">Super User Control Center</p>
            </div>
          </div>
          <button onClick={() => { localStorage.removeItem('forge_role'); setIsAuthenticated(false); }}
            className="text-xs text-red-500/60 hover:text-red-400 border border-red-900/25 hover:border-red-900/60 px-3 py-1.5 rounded-lg transition-all">
            LOGOUT
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/60 w-fit">
          {[
            { id: 'mods', label: 'KELOLA MODS', icon: <Box size={12} /> },
            { id: 'history', label: 'HISTORY OBFUSCATE', icon: <History size={12} /> },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 font-black text-[10px] tracking-wider flex items-center gap-1.5 rounded-lg transition-all ${
                activeTab === tab.id ? 'bg-zinc-800 text-white shadow' : 'text-zinc-600 hover:text-zinc-300'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* TAB: MODS */}
        {activeTab === 'mods' && (
          <div className="animate-in fade-in duration-200">
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                <input type="text" placeholder="Cari mod..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white pl-10 pr-4 py-2.5 rounded-lg text-sm focus:border-zinc-600 outline-none" />
              </div>
              <div className="flex gap-2">
                {isDirty && (
                  <button onClick={() => { setIsDirty(false); showToast('Urutan disimpan!'); }}
                    className="bg-yellow-600 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-black text-xs flex items-center gap-1.5 transition-colors animate-bounce">
                    <Save size={13} /> SAVE ORDER
                  </button>
                )}
                <button onClick={() => { setFormData(emptyForm); setIsEditing(true); }}
                  className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-black text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-green-900/30">
                  <Plus size={13} /> TAMBAH MOD
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
                  {filteredMods.map((mod, i) => (
                    <tr key={mod.id} className="hover:bg-zinc-800/15 transition-colors">
                      <td className="px-4 py-3 text-center">
                        {!searchTerm ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <button onClick={() => moveRow(i, 'up')} disabled={i === 0} className="text-zinc-700 hover:text-green-400 disabled:opacity-20 transition-colors"><ArrowUp size={11} /></button>
                            <button onClick={() => moveRow(i, 'down')} disabled={i === mods.length - 1} className="text-zinc-700 hover:text-red-400 disabled:opacity-20 transition-colors"><ArrowDown size={11} /></button>
                          </div>
                        ) : <span className="text-zinc-700">—</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-sm text-white">
                        {mod.title}
                        {mod.tags && mod.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {mod.tags.slice(0, 3).map(t => (
                              <span key={t} className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{t}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] bg-zinc-800/80 text-zinc-400 px-2 py-0.5 rounded font-medium">{mod.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        {mod.isPremium
                          ? <span className="text-[9px] bg-yellow-900/25 text-yellow-500 border border-yellow-800/40 px-2 py-0.5 rounded font-black">VIP</span>
                          : <span className="text-[9px] bg-green-900/25 text-green-500 border border-green-800/40 px-2 py-0.5 rounded font-black">Free</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => { setFormData(mod); setIsEditing(true); }}
                            className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-all"><Edit size={14} /></button>
                          <button onClick={() => handleDelete(mod.id)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredMods.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-700 text-sm">Tidak ada mod.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: HISTORY */}
        {activeTab === 'history' && (
          <div className="animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5"><History size={13} /> Database Riwayat Obfuscate</h3>
              <button onClick={refreshHistory} className="text-xs text-zinc-600 hover:text-white underline transition-colors">Refresh</button>
            </div>
            <div className="bg-[#111] border border-zinc-800/70 rounded-xl overflow-hidden">
              {historyLoading ? (
                <div className="py-10 text-center text-zinc-600 text-xs flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Memuat...</div>
              ) : historyItems.length === 0 ? (
                <div className="py-10 text-center text-zinc-700 text-sm">Belum ada history.</div>
              ) : (
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
                    {historyItems.map(item => (
                      <tr key={item.id} className="hover:bg-zinc-800/15 transition-colors">
                        <td className="px-4 py-3 text-zinc-600 text-xs">{new Date(item.created_at).toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3">
                          {item.user_id
                            ? <span className="text-green-500 text-xs flex items-center gap-1"><User size={11} /> Member</span>
                            : <span className="text-zinc-600 text-xs flex items-center gap-1"><User size={11} /> Guest</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-yellow-500/80 text-xs truncate max-w-[180px]">{item.file_name}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => downloadHistory(item, 'raw')}
                              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-colors border border-zinc-700">
                              <FileText size={9} /> RAW
                            </button>
                            <button onClick={() => downloadHistory(item, 'protected')}
                              className="bg-blue-900/25 hover:bg-blue-700 text-blue-400 hover:text-white px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all border border-blue-900/40">
                              <ShieldCheck size={9} /> SECURE
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => deleteHistory(item.id)}
                            className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"><Trash2 size={13} /></button>
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

      {/* MODAL EDIT / TAMBAH */}
      {isEditing && (
        <div className="fixed inset-0 z-[99] flex items-start justify-center bg-black/95 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#111] border border-zinc-700/70 rounded-2xl max-w-xl w-full p-6 relative shadow-2xl my-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-600 to-transparent rounded-t-2xl" />
            <button onClick={() => setIsEditing(false)}
              className="absolute top-4 right-4 text-zinc-600 hover:text-white bg-zinc-800 hover:bg-zinc-700 p-1.5 rounded-lg transition-all">
              <X size={14} />
            </button>
            <h2 className="text-base font-black text-white mb-5 uppercase tracking-wide">
              {formData.id ? '✏️ Edit Mod' : '➕ Tambah Mod Baru'}
            </h2>

            <form onSubmit={handleSaveMod} className="space-y-4">
              {/* Judul + Author */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Judul *</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm focus:border-green-700 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Author *</label>
                  <input required type="text" value={formData.author} onChange={e => setFormData({ ...formData, author: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm focus:border-green-700 outline-none" />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Deskripsi *</label>
                <textarea required rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm focus:border-green-700 outline-none resize-none" />
              </div>

              {/* Kategori + Platform */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Kategori</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as CategoryType })}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm outline-none">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Platform</label>
                  <div className="flex gap-3 py-2.5">
                    {PLATFORMS.map(p => (
                      <label key={p} className="flex items-center gap-1.5 text-zinc-300 text-xs cursor-pointer">
                        <input type="radio" checked={formData.platform === p} onChange={() => setFormData({ ...formData, platform: p as PlatformType })} className="accent-green-500" />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Upload fields */}
              <div className="border-t border-zinc-800/60 pt-4 space-y-4">
                <ImageUploadField value={formData.imageUrl} onChange={url => setFormData({ ...formData, imageUrl: url })} />
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Eye size={10} /> Preview Media <span className="text-zinc-700 normal-case font-normal">(opsional – YouTube/TikTok)</span>
                  </label>
                  <input type="url" placeholder="https://youtube.com/watch?v=..." value={formData.mediaUrl || ''}
                    onChange={e => setFormData({ ...formData, mediaUrl: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm focus:border-green-700 outline-none" />
                </div>
                <FileUploadField value={formData.downloadUrl} onChange={url => setFormData({ ...formData, downloadUrl: url })} />
              </div>

              {/* Tags */}
              <TagSelector value={formData.tags || []} onChange={tags => setFormData({ ...formData, tags })} />

              {/* Premium toggle */}
              <div onClick={() => setFormData({ ...formData, isPremium: !formData.isPremium })}
                className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${
                  formData.isPremium ? 'border-yellow-700/40 bg-yellow-900/10 hover:bg-yellow-900/20' : 'border-green-700/40 bg-green-900/10 hover:bg-green-900/20'
                }`}>
                <div>
                  <span className={`font-black text-sm ${formData.isPremium ? 'text-yellow-500' : 'text-green-500'}`}>
                    {formData.isPremium ? 'VIP ONLY' : 'GRATIS'}
                  </span>
                  <p className="text-zinc-600 text-xs mt-0.5">{formData.isPremium ? 'Hanya member VIP' : 'Semua orang bisa download'}</p>
                </div>
                {formData.isPremium ? <Lock size={15} className="text-yellow-500" /> : <Unlock size={15} className="text-green-500" />}
              </div>

              <button type="submit" disabled={isLoading}
                className="w-full bg-white text-black hover:bg-zinc-100 font-black py-3 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
                {isLoading ? <><Loader2 size={14} className="animate-spin text-zinc-600" /> Menyimpan...</> : <><Save size={14} /> SIMPAN MOD</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;