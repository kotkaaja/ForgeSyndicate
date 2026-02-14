import React, { useState, useRef } from 'react';
import {
  Trash2, Edit, Plus, Save, X, Lock, Unlock, ArrowLeft, Shield,
  Search, ArrowUp, ArrowDown, History, Box, User, ShieldCheck, FileText,
  Image, Upload, Link as LinkIcon, FileCode, Eye, EyeOff, Loader2
} from 'lucide-react';
import { getMods, saveMod, deleteMod, checkAdmin } from '../services/data';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { ModItem, CATEGORIES, PLATFORMS, CategoryType, PlatformType } from '../types';

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
async function uploadFileToSupabase(
  file: File,
  bucket: string,
  folder: string
): Promise<string> {
  const ext = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}

// ===================== TOAST =====================
const Toast: React.FC<{ message: string; type: 'success' | 'error' | 'info'; onClose: () => void }> = ({ message, type, onClose }) => {
  const colors = {
    success: 'border-green-600 bg-green-900/30 text-green-400',
    error: 'border-red-600 bg-red-900/30 text-red-400',
    info: 'border-blue-600 bg-blue-900/30 text-blue-400',
  };
  React.useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-lg border text-sm font-semibold shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${colors[type]}`}>
      {message}
    </div>
  );
};

// ===================== IMAGE UPLOAD FIELD =====================
interface ImageFieldProps {
  value: string;
  onChange: (url: string) => void;
}
const ImageUploadField: React.FC<ImageFieldProps> = ({ value, onChange }) => {
  const [mode, setMode] = useState<'url' | 'upload'>('url');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFileToSupabase(file, 'mod-images', 'thumbnails');
      setPreview(url);
      onChange(url);
    } catch (err: any) {
      alert('Gagal upload gambar: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Image size={12} /> Gambar Thumbnail <span className="text-zinc-600 font-normal normal-case">(opsional)</span>
        </label>
        <div className="flex gap-1">
          <button type="button" onClick={() => setMode('url')}
            className={`text-xs px-2 py-0.5 rounded transition-all ${mode === 'url' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}>
            <LinkIcon size={10} className="inline mr-1" />URL
          </button>
          <button type="button" onClick={() => setMode('upload')}
            className={`text-xs px-2 py-0.5 rounded transition-all ${mode === 'upload' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}>
            <Upload size={10} className="inline mr-1" />Upload
          </button>
        </div>
      </div>

      {mode === 'url' ? (
        <input
          type="url"
          placeholder="https://... (kosongkan jika tidak ada gambar)"
          value={value}
          onChange={(e) => { onChange(e.target.value); setPreview(e.target.value); }}
          className="w-full bg-zinc-950 border border-zinc-700 text-white px-3 py-2 rounded-lg text-sm focus:border-green-600 outline-none transition-colors"
        />
      ) : (
        <div>
          <input ref={inputRef} type="file" accept="image/png,image/jpg,image/jpeg,image/webp,image/gif" onChange={handleFileChange} className="hidden" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-zinc-700 hover:border-green-600 text-zinc-400 hover:text-green-400 py-3 rounded-lg text-sm transition-all flex items-center justify-center gap-2 bg-zinc-900/50"
          >
            {uploading ? <><Loader2 size={14} className="animate-spin" /> Mengupload...</> : <><Upload size={14} /> Klik untuk upload gambar (PNG, JPG, WEBP)</>}
          </button>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="relative mt-2 rounded-lg overflow-hidden border border-zinc-700 h-28 bg-black">
          <img src={preview} alt="preview" className="w-full h-full object-cover opacity-70" onError={() => setPreview('')} />
          <button type="button" onClick={() => { onChange(''); setPreview(''); }}
            className="absolute top-1 right-1 bg-black/70 text-red-400 rounded p-0.5 hover:bg-red-900/50 transition-colors">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

// ===================== FILE UPLOAD FIELD =====================
interface FileFieldProps {
  value: string;
  onChange: (url: string) => void;
}
const FileUploadField: React.FC<FileFieldProps> = ({ value, onChange }) => {
  const [mode, setMode] = useState<'url' | 'upload'>('url');
  const [uploading, setUploading] = useState(false);
  const [uploadedName, setUploadedName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFileToSupabase(file, 'mod-files', 'scripts');
      onChange(url);
      setUploadedName(file.name);
    } catch (err: any) {
      alert('Gagal upload file: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <FileCode size={12} /> File Mod / Script <span className="text-red-500 ml-1">*</span>
        </label>
        <div className="flex gap-1">
          <button type="button" onClick={() => setMode('url')}
            className={`text-xs px-2 py-0.5 rounded transition-all ${mode === 'url' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}>
            <LinkIcon size={10} className="inline mr-1" />URL
          </button>
          <button type="button" onClick={() => setMode('upload')}
            className={`text-xs px-2 py-0.5 rounded transition-all ${mode === 'upload' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}>
            <Upload size={10} className="inline mr-1" />Upload
          </button>
        </div>
      </div>

      {mode === 'url' ? (
        <input
          type="url"
          required
          placeholder="https://... link download file"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-700 text-white px-3 py-2 rounded-lg text-sm focus:border-green-600 outline-none transition-colors"
        />
      ) : (
        <div>
          <input ref={inputRef} type="file" onChange={handleFileChange} className="hidden" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-zinc-700 hover:border-green-600 text-zinc-400 hover:text-green-400 py-3 rounded-lg text-sm transition-all flex items-center justify-center gap-2 bg-zinc-900/50"
          >
            {uploading
              ? <><Loader2 size={14} className="animate-spin" /> Mengupload...</>
              : uploadedName
              ? <><FileCode size={14} className="text-green-400" /> <span className="text-green-400">{uploadedName}</span></>
              : <><Upload size={14} /> Klik untuk upload file mod (.lua, .cs, .zip, dll)</>
            }
          </button>
        </div>
      )}

      {value && mode === 'url' && (
        <p className="text-xs text-green-500 truncate flex items-center gap-1">
          <FileCode size={10} /> {value}
        </p>
      )}
    </div>
  );
};

// ===================== MAIN ADMIN COMPONENT =====================
const Admin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'mods' | 'history'>('mods');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [mods, setMods] = useState<ModItem[]>([]);
  const [filteredMods, setFilteredMods] = useState<ModItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const emptyForm: ModItem = {
    id: '', title: '', description: '', category: 'Moonloader', platform: 'PC',
    imageUrl: '', mediaUrl: '', downloadUrl: '', isPremium: false, dateAdded: '', author: 'kotkaaja'
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
    setMods(data);
    setFilteredMods(data);
    setIsLoading(false);
    setIsDirty(false);
  };

  React.useEffect(() => {
    if (searchTerm === '') setFilteredMods(mods);
    else {
      const lower = searchTerm.toLowerCase();
      setFilteredMods(mods.filter(m =>
        m.title.toLowerCase().includes(lower) || m.category.toLowerCase().includes(lower)
      ));
    }
  }, [searchTerm, mods]);

  const moveRow = (index: number, direction: 'up' | 'down') => {
    if (searchTerm !== '') return;
    const newMods = [...mods];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newMods.length) return;
    [newMods[index], newMods[targetIndex]] = [newMods[targetIndex], newMods[index]];
    setMods(newMods);
    setFilteredMods(newMods);
    setIsDirty(true);
  };

  const handleSaveMod = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const itemToSave = { ...formData };
      if (!itemToSave.id) delete (itemToSave as any).id;
      await saveMod(itemToSave);
      setIsEditing(false);
      setFormData(emptyForm);
      await refreshMods();
      showToast('Mod berhasil disimpan!', 'success');
    } catch (err) {
      showToast('Gagal menyimpan mod.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMod = async (id: string) => {
    if (confirm('Hapus mod ini permanen?')) {
      setIsLoading(true);
      await deleteMod(id);
      await refreshMods();
      setIsLoading(false);
      showToast('Mod dihapus.', 'info');
    }
  };

  const handleSaveOrder = async () => {
    setIsDirty(false);
    showToast('Urutan berhasil disimpan!', 'success');
  };

  const refreshHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase.from('obfuscation_history').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setHistoryItems(data || []);
    } catch (err: any) {
      showToast('Gagal ambil history: ' + err.message, 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDownloadHistory = (item: HistoryItem, type: 'raw' | 'protected') => {
    const content = type === 'raw' ? item.original_code : item.obfuscated_code;
    const prefix = type === 'raw' ? 'RAW_' : 'PROTECTED_';
    if (!content) { showToast('File kosong.', 'error'); return; }
    const el = document.createElement('a');
    el.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    el.download = `${prefix}${item.file_name}`;
    document.body.appendChild(el); el.click(); document.body.removeChild(el);
  };

  const handleDeleteHistory = async (id: string) => {
    if (!confirm('Hapus history ini?')) return;
    try {
      const { error } = await supabase.from('obfuscation_history').delete().eq('id', id);
      if (error) throw error;
      setHistoryItems(historyItems.filter(h => h.id !== id));
      showToast('History dihapus.', 'info');
    } catch (err: any) {
      showToast('Gagal hapus: ' + err.message, 'error');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const isValid = await checkAdmin(password);
    if (isValid) {
      setIsAuthenticated(true);
      localStorage.setItem('forge_role', 'ADMIN');
      setError('');
    } else {
      setError('Password salah!');
    }
    setIsLoading(false);
  };

  // ---- LOGIN SCREEN ----
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.05)_0%,transparent_70%)]" />
        <div className="absolute top-4 left-4">
          <Link to="/" className="text-zinc-500 hover:text-white flex items-center gap-2 transition-colors text-sm">
            <ArrowLeft size={16} /> Kembali
          </Link>
        </div>
        <div className="relative bg-[#111] p-8 rounded-2xl border border-red-900/30 max-w-sm w-full shadow-2xl">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-600 to-transparent rounded-t-2xl" />
          <Shield size={44} className="text-red-500 mx-auto mb-4 opacity-90" />
          <h2 className="text-xl font-bold text-white mb-1 text-center">Admin Terminal</h2>
          <p className="text-zinc-600 text-xs text-center mb-6">Restricted access only</p>
          <form onSubmit={handleLogin} className="space-y-3">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-zinc-800 text-red-400 px-4 py-3 rounded-lg text-center font-mono text-sm focus:border-red-600 outline-none transition-colors"
              placeholder="••••••••" autoFocus />
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            <button type="submit" disabled={isLoading}
              className="w-full bg-red-900 hover:bg-red-800 text-white py-3 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2">
              {isLoading ? <><Loader2 size={16} className="animate-spin" /> Authenticating...</> : 'UNLOCK TERMINAL'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---- DASHBOARD ----
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-[#111] p-5 rounded-xl border border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-900/30 border border-red-900/50 flex items-center justify-center">
              <Shield size={20} className="text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">ADMIN PANEL</h1>
              <p className="text-zinc-600 text-xs">Super User Control Center</p>
            </div>
          </div>
          <button onClick={() => { localStorage.removeItem('forge_role'); setIsAuthenticated(false); }}
            className="text-xs text-red-500/70 hover:text-red-400 border border-red-900/30 hover:border-red-800 px-3 py-1.5 rounded-lg transition-all">
            LOGOUT
          </button>
        </div>

        {/* TABS */}
        <div className="flex gap-1 mb-6 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 w-fit">
          <button onClick={() => setActiveTab('mods')}
            className={`px-4 py-2 font-bold text-xs flex items-center gap-2 rounded-lg transition-all ${activeTab === 'mods' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <Box size={14} /> KELOLA MODS
          </button>
          <button onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-bold text-xs flex items-center gap-2 rounded-lg transition-all ${activeTab === 'history' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <History size={14} /> HISTORY OBFUSCATE
          </button>
        </div>

        {/* === TAB 1: KELOLA MODS === */}
        {activeTab === 'mods' && (
          <div className="animate-in fade-in duration-300">
            {/* TOOLBAR */}
            <div className="flex flex-col md:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                <input type="text" placeholder="Cari mod..." value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white pl-10 pr-4 py-2.5 rounded-lg text-sm focus:border-zinc-600 outline-none transition-colors" />
              </div>
              <div className="flex gap-2">
                {isDirty && (
                  <button onClick={handleSaveOrder}
                    className="bg-yellow-600 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors">
                    <Save size={14} /> SAVE ORDER
                  </button>
                )}
                <button onClick={() => { setFormData(emptyForm); setIsEditing(true); }}
                  className="bg-green-700 hover:bg-green-600 text-white px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-green-900/30">
                  <Plus size={14} /> TAMBAH MOD
                </button>
              </div>
            </div>

            {/* TABLE */}
            <div className="bg-[#111] border border-zinc-800/80 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-black/50 text-zinc-500 uppercase text-[10px] tracking-widest border-b border-zinc-800">
                    <tr>
                      <th className="px-5 py-3 w-16 text-center">Order</th>
                      <th className="px-5 py-3">Nama Mod</th>
                      <th className="px-5 py-3">Kategori</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredMods.map((mod, index) => (
                      <tr key={mod.id} className="hover:bg-zinc-800/20 transition-colors group">
                        <td className="px-5 py-3 text-center">
                          {searchTerm === '' ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <button onClick={() => moveRow(index, 'up')} disabled={index === 0}
                                className="text-zinc-600 hover:text-green-400 disabled:opacity-20 transition-colors p-0.5">
                                <ArrowUp size={12} />
                              </button>
                              <button onClick={() => moveRow(index, 'down')} disabled={index === mods.length - 1}
                                className="text-zinc-600 hover:text-red-400 disabled:opacity-20 transition-colors p-0.5">
                                <ArrowDown size={12} />
                              </button>
                            </div>
                          ) : <span className="text-zinc-700 text-xs">—</span>}
                        </td>
                        <td className="px-5 py-3 font-semibold text-white text-sm">{mod.title}</td>
                        <td className="px-5 py-3">
                          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-medium uppercase tracking-wide">{mod.category}</span>
                        </td>
                        <td className="px-5 py-3">
                          {mod.isPremium ? (
                            <span className="text-[10px] bg-yellow-900/30 text-yellow-500 border border-yellow-800/50 px-2 py-0.5 rounded font-bold uppercase tracking-wide">VIP</span>
                          ) : (
                            <span className="text-[10px] bg-green-900/30 text-green-500 border border-green-800/50 px-2 py-0.5 rounded font-bold uppercase tracking-wide">Free</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => { setFormData(mod); setIsEditing(true); }}
                              className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-all">
                              <Edit size={15} />
                            </button>
                            <button onClick={() => handleDeleteMod(mod.id)}
                              className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredMods.length === 0 && (
                      <tr><td colSpan={5} className="px-5 py-10 text-center text-zinc-600 text-sm">Tidak ada mod ditemukan.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* === TAB 2: HISTORY === */}
        {activeTab === 'history' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2 uppercase tracking-wide">
                <History size={16} /> Database Riwayat Obfuscate
              </h3>
              <button onClick={refreshHistory} className="text-zinc-500 hover:text-white text-xs underline transition-colors">Refresh</button>
            </div>
            <div className="bg-[#111] border border-zinc-800/80 rounded-xl overflow-hidden">
              {historyLoading ? (
                <div className="p-10 text-center text-zinc-600 text-sm flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Memuat data...
                </div>
              ) : historyItems.length === 0 ? (
                <div className="p-10 text-center text-zinc-600 text-sm">Belum ada history.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-black/50 text-zinc-500 uppercase text-[10px] tracking-widest border-b border-zinc-800">
                      <tr>
                        <th className="px-5 py-3">Waktu</th>
                        <th className="px-5 py-3">User</th>
                        <th className="px-5 py-3">File</th>
                        <th className="px-5 py-3 text-right">Download</th>
                        <th className="px-5 py-3 text-right">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {historyItems.map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="px-5 py-3 text-zinc-500 text-xs">{new Date(item.created_at).toLocaleString('id-ID')}</td>
                          <td className="px-5 py-3">
                            {item.user_id
                              ? <span className="text-green-500 text-xs flex items-center gap-1"><User size={12} /> Member</span>
                              : <span className="text-zinc-600 text-xs flex items-center gap-1"><User size={12} /> Guest</span>}
                          </td>
                          <td className="px-5 py-3 font-mono text-yellow-500/90 text-xs">{item.file_name}</td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button onClick={() => handleDownloadHistory(item, 'raw')}
                                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors border border-zinc-700">
                                <FileText size={10} /> RAW
                              </button>
                              <button onClick={() => handleDownloadHistory(item, 'protected')}
                                className="bg-blue-900/30 hover:bg-blue-600 text-blue-400 hover:text-white px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition-all border border-blue-900/50">
                                <ShieldCheck size={10} /> SECURE
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button onClick={() => handleDeleteHistory(item.id)}
                              className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===== MODAL EDIT / TAMBAH MOD ===== */}
      {isEditing && (
        <div className="fixed inset-0 z-[99] flex items-start justify-center bg-black/95 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#111] border border-zinc-700/80 rounded-2xl max-w-2xl w-full p-7 relative shadow-2xl my-8">
            {/* Top accent line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-600 to-transparent rounded-t-2xl" />

            <button onClick={() => setIsEditing(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white bg-zinc-800 hover:bg-zinc-700 p-1.5 rounded-lg transition-all">
              <X size={16} />
            </button>
            <h2 className="text-lg font-black text-white mb-6 uppercase tracking-wider">
              {formData.id ? '✏️ Edit Mod' : '➕ Tambah Mod Baru'}
            </h2>

            <form onSubmit={handleSaveMod} className="space-y-5">
              {/* Judul + Author */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider block mb-1.5">Judul <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 text-white px-3 py-2 rounded-lg text-sm focus:border-green-600 outline-none transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider block mb-1.5">Author <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.author}
                    onChange={e => setFormData({ ...formData, author: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 text-white px-3 py-2 rounded-lg text-sm focus:border-green-600 outline-none transition-colors" />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider block mb-1.5">Deskripsi <span className="text-red-500">*</span></label>
                <textarea required rows={3} value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 text-white px-3 py-2 rounded-lg text-sm focus:border-green-600 outline-none transition-colors resize-none" />
              </div>

              {/* Kategori + Platform */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider block mb-1.5">Kategori</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as CategoryType })}
                    className="w-full bg-zinc-950 border border-zinc-700 text-white px-3 py-2 rounded-lg text-sm focus:border-green-600 outline-none">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider block mb-1.5">Platform</label>
                  <div className="flex gap-3 py-2">
                    {PLATFORMS.map(p => (
                      <label key={p} className="flex items-center gap-1.5 text-zinc-300 text-sm cursor-pointer">
                        <input type="radio" checked={formData.platform === p}
                          onChange={() => setFormData({ ...formData, platform: p as PlatformType })}
                          className="accent-green-500" />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-zinc-800 pt-4 space-y-4">
                {/* Gambar - opsional, bisa upload atau URL */}
                <ImageUploadField value={formData.imageUrl} onChange={(url) => setFormData({ ...formData, imageUrl: url })} />

                {/* Media Preview - opsional */}
                <div>
                  <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Eye size={12} /> Link Preview Media <span className="text-zinc-600 font-normal normal-case">(opsional – YouTube / TikTok)</span>
                  </label>
                  <input type="url" placeholder="https://youtube.com/watch?v=... atau TikTok"
                    value={formData.mediaUrl || ''}
                    onChange={e => setFormData({ ...formData, mediaUrl: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 text-white px-3 py-2 rounded-lg text-sm focus:border-green-600 outline-none transition-colors" />
                </div>

                {/* File Download - bisa upload atau URL */}
                <FileUploadField value={formData.downloadUrl} onChange={(url) => setFormData({ ...formData, downloadUrl: url })} />
              </div>

              {/* Premium toggle */}
              <div onClick={() => setFormData({ ...formData, isPremium: !formData.isPremium })}
                className={`p-3.5 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${formData.isPremium ? 'border-yellow-600/50 bg-yellow-900/15 hover:bg-yellow-900/25' : 'border-green-700/50 bg-green-900/15 hover:bg-green-900/25'}`}>
                <div>
                  <span className={`font-bold text-sm ${formData.isPremium ? 'text-yellow-500' : 'text-green-500'}`}>
                    {formData.isPremium ? 'PREMIUM / VIP ONLY' : 'KONTEN GRATIS'}
                  </span>
                  <p className="text-zinc-600 text-xs mt-0.5">{formData.isPremium ? 'Hanya bisa diakses member VIP' : 'Semua orang bisa download'}</p>
                </div>
                {formData.isPremium ? <Lock size={16} className="text-yellow-500" /> : <Unlock size={16} className="text-green-500" />}
              </div>

              <button type="submit" disabled={isLoading}
                className="w-full bg-white text-black hover:bg-zinc-100 font-black py-3 rounded-xl transition-colors text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg">
                {isLoading ? <><Loader2 size={16} className="animate-spin text-zinc-600" /> Menyimpan...</> : <><Save size={16} /> SIMPAN MOD</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;