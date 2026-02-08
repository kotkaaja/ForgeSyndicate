import React, { useState, useEffect } from 'react';
import { 
  Trash2, Edit, Plus, Save, X, LogIn, Lock, Unlock, ArrowLeft, Shield, 
  Search, ArrowUp, ArrowDown, Loader2, FileCode, Download, History, Box, User, ShieldCheck, FileText
} from 'lucide-react';
import { getMods, saveMod, deleteMod, checkAdmin } from '../services/data';
import { supabase } from '../lib/supabase'; 
import { Link } from 'react-router-dom';
// NAVBAR DIHAPUS DARI SINI AGAR TIDAK DOUBLE
import { ModItem, CATEGORIES, PLATFORMS, CategoryType, PlatformType } from '../types';

// Update Tipe Data History (Tambah original_code)
interface HistoryItem {
  id: string;
  file_name: string;
  obfuscated_code: string;
  original_code: string; // Data code asli
  created_at: string;
  user_id: string | null;
}

const Admin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'mods' | 'history'>('mods');

  // --- STATE UNTUK MODS ---
  const [mods, setMods] = useState<ModItem[]>([]);
  const [filteredMods, setFilteredMods] = useState<ModItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false); 

  // --- STATE UNTUK HISTORY ---
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // --- UI STATE ---
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // --- FORM MOD ---
  const emptyForm: ModItem = {
    id: '', title: '', description: '', category: 'Moonloader', platform: 'PC',
    imageUrl: '', mediaUrl: '', downloadUrl: '', isPremium: false, dateAdded: '', author: 'Admin'
  };
  const [formData, setFormData] = useState<ModItem>(emptyForm);

  // AUTH CHECK
  useEffect(() => {
    if (localStorage.getItem('forge_role') === 'ADMIN') {
        setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'mods') refreshMods();
      if (activeTab === 'history') refreshHistory();
    }
  }, [isAuthenticated, activeTab]);

  // ==========================================
  // LOGIC: MOD MANAGEMENT
  // ==========================================
  const refreshMods = async () => {
    setIsLoading(true);
    const data = await getMods();
    setMods(data);
    setFilteredMods(data);
    setIsLoading(false);
    setIsDirty(false);
  };

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredMods(mods);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredMods(mods.filter(m => 
        m.title.toLowerCase().includes(lower) || 
        m.category.toLowerCase().includes(lower)
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
      alert('Mod berhasil disimpan!');
    } catch (err) {
      alert('Gagal menyimpan mod.');
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
    }
  };

  const handleSaveOrder = async () => {
      setIsDirty(false);
      alert("Urutan berhasil disimpan!");
  };

  // ==========================================
  // LOGIC: HISTORY MANAGEMENT
  // ==========================================
  const refreshHistory = async () => {
    setHistoryLoading(true);
    try {
        const { data, error } = await supabase
            .from('obfuscation_history')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        setHistoryItems(data || []);
    } catch (err: any) {
        console.error(err);
        alert("Gagal mengambil history: " + err.message);
    } finally {
        setHistoryLoading(false);
    }
  };

  // LOGIC DOWNLOAD BARU (BISA PILIH TIPE)
  const handleDownloadHistory = (item: HistoryItem, type: 'raw' | 'protected') => {
    const content = type === 'raw' ? item.original_code : item.obfuscated_code;
    const prefix = type === 'raw' ? 'RAW_' : 'PROTECTED_';
    
    if (!content) {
        alert("File kosong atau tidak ditemukan.");
        return;
    }

    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${prefix}${item.file_name}`;
    document.body.appendChild(element); 
    element.click();
    document.body.removeChild(element);
  };

  const handleDeleteHistory = async (id: string) => {
      if(!confirm("Hapus file history ini dari database?")) return;
      try {
          const { error } = await supabase.from('obfuscation_history').delete().eq('id', id);
          if(error) throw error;
          setHistoryItems(historyItems.filter(h => h.id !== id));
      } catch (err: any) {
          alert("Gagal hapus: " + err.message);
      }
  };

  // ==========================================
  // LOGIC: LOGIN
  // ==========================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const isValid = await checkAdmin(password);
    if (isValid) {
      setIsAuthenticated(true);
      localStorage.setItem('forge_role', 'ADMIN');
      setError('');
    } else {
      setError('Password Salah!');
    }
    setIsLoading(false);
  };

  // RENDER LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] relative px-4">
        <div className="absolute top-4 left-4">
          <Link to="/" className="text-zinc-500 hover:text-white flex items-center gap-2 transition-colors">
            <ArrowLeft size={20} /> Kembali ke Home
          </Link>
        </div>
        <div className="bg-[#1a1a1a] p-8 rounded-lg border border-red-900/30 max-w-md w-full shadow-2xl relative">
          <Shield size={60} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2 text-center uppercase">Admin Access</h2>
          <form onSubmit={handleLogin} className="space-y-4 mt-6">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-zinc-800 text-red-500 px-4 py-3 rounded text-center focus:border-red-600 outline-none"
              placeholder="Enter Passkey" autoFocus />
            {error && <div className="text-red-500 text-xs text-center">{error}</div>}
            <button type="submit" disabled={isLoading} className="w-full bg-red-900 hover:bg-red-800 text-white py-3 rounded font-bold">
              {isLoading ? "Authenticating..." : "UNLOCK TERMINAL"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // RENDER DASHBOARD
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-sans">
      {/* NAVBAR SUDAH DIHAPUS DARI SINI */}
      
      <div className="max-w-7xl mx-auto px-4 py-8 mt-4">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-[#1a1a1a] p-6 rounded-xl border border-zinc-800">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
                    <Shield className="text-red-600" /> ADMIN <span className="text-zinc-600">PANEL</span>
                </h1>
                <p className="text-zinc-500 text-sm mt-1">Super User Control Center</p>
            </div>
            <button onClick={() => { localStorage.removeItem('forge_role'); setIsAuthenticated(false); }} className="text-red-500 text-sm hover:underline">
                LOGOUT
            </button>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex gap-4 mb-6 border-b border-zinc-800">
            <button 
                onClick={() => setActiveTab('mods')}
                className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'mods' ? 'text-red-500 border-b-2 border-red-500' : 'text-zinc-500 hover:text-white'}`}
            >
                <Box size={18} /> KELOLA MODS
            </button>
            <button 
                onClick={() => setActiveTab('history')}
                className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'history' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-zinc-500 hover:text-white'}`}
            >
                <History size={18} /> HISTORY OBFUSCATE (ALL)
            </button>
        </div>

        {/* === TAB 1: KELOLA MODS === */}
        {activeTab === 'mods' && (
            <div className="animate-in fade-in duration-300">
                {/* TOOLBAR */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                        <input 
                            type="text" 
                            placeholder="Cari mod..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black border border-zinc-800 text-white pl-12 pr-4 py-3 rounded-lg focus:border-red-600 outline-none"
                        />
                    </div>
                    <div className="flex gap-2">
                        {isDirty && (
                            <button onClick={handleSaveOrder} className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 animate-bounce">
                                <Save size={18} /> SAVE ORDER
                            </button>
                        )}
                        <button onClick={() => { setFormData(emptyForm); setIsEditing(true); }} className="bg-red-700 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2">
                            <Plus size={18} /> TAMBAH MOD
                        </button>
                    </div>
                </div>

                {/* TABLE MODS */}
                <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-black text-zinc-400 font-bold uppercase text-xs border-b border-zinc-800">
                                <tr>
                                    <th className="px-6 py-4 w-20 text-center">Urutan</th>
                                    <th className="px-6 py-4">Nama Mod</th>
                                    <th className="px-6 py-4">Kategori</th>
                                    <th className="px-6 py-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {filteredMods.map((mod, index) => (
                                    <tr key={mod.id} className="hover:bg-zinc-800/30">
                                        <td className="px-6 py-4 text-center">
                                            {searchTerm === '' ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <button onClick={() => moveRow(index, 'up')} disabled={index === 0} className="hover:text-green-400 disabled:opacity-20"><ArrowUp size={14} /></button>
                                                    <button onClick={() => moveRow(index, 'down')} disabled={index === mods.length - 1} className="hover:text-red-400 disabled:opacity-20"><ArrowDown size={14} /></button>
                                                </div>
                                            ) : (
                                                <span className="text-zinc-600">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-white">{mod.title}</td>
                                        <td className="px-6 py-4 text-zinc-400">{mod.category}</td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button onClick={() => { setFormData(mod); setIsEditing(true); }} className="p-2 text-blue-400 hover:bg-blue-900/20 rounded"><Edit size={18} /></button>
                                            <button onClick={() => handleDeleteMod(mod.id)} className="p-2 text-red-500 hover:bg-red-900/20 rounded"><Trash2 size={18} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* === TAB 2: HISTORY (GLOBAL) === */}
        {activeTab === 'history' && (
            <div className="animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-blue-500 flex items-center gap-2">
                        <History /> DATABASE RIWAYAT OBFUSCATE
                    </h3>
                    <button onClick={refreshHistory} className="text-zinc-400 hover:text-white text-sm underline">
                        Refresh Data
                    </button>
                </div>

                <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
                    {historyLoading ? (
                        <div className="p-10 text-center text-zinc-500">Memuat data history...</div>
                    ) : historyItems.length === 0 ? (
                        <div className="p-10 text-center text-zinc-500">Belum ada history.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-black text-zinc-400 font-bold uppercase text-xs border-b border-zinc-800">
                                    <tr>
                                        <th className="px-6 py-4">Waktu</th>
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4">Nama File</th>
                                        <th className="px-6 py-4 text-right">Download Options</th>
                                        <th className="px-6 py-4 text-right">Hapus</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {historyItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-zinc-800/30">
                                            <td className="px-6 py-4 text-zinc-400 text-xs">
                                                {new Date(item.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-white text-sm">
                                                {item.user_id ? (
                                                    <span className="flex items-center gap-1 text-green-500">
                                                        <User size={14} /> Member
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-zinc-500">
                                                        <User size={14} /> Guest
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-yellow-500 text-sm">
                                                {item.file_name}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {/* TOMBOL DOWNLOAD RAW (ASLI) */}
                                                    <button 
                                                        onClick={() => handleDownloadHistory(item, 'raw')}
                                                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all border border-zinc-700"
                                                        title="Download Source Code Asli"
                                                    >
                                                        <FileText size={12} /> RAW
                                                    </button>
                                                    
                                                    {/* TOMBOL DOWNLOAD PROTECTED (OBFUSCATED) */}
                                                    <button 
                                                        onClick={() => handleDownloadHistory(item, 'protected')}
                                                        className="bg-blue-900/40 hover:bg-blue-600 text-blue-400 hover:text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all border border-blue-900/50"
                                                        title="Download Hasil Obfuscate"
                                                    >
                                                        <ShieldCheck size={12} /> SECURE
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => handleDeleteHistory(item.id)}
                                                    className="bg-red-900/30 hover:bg-red-600 text-red-400 hover:text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all ml-auto"
                                                >
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

      {/* --- MODAL EDIT MOD --- */}
      {isEditing && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#1a1a1a] border border-zinc-700 rounded-xl max-w-3xl w-full p-8 relative shadow-2xl my-auto">
            <button onClick={() => setIsEditing(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-800 p-2 rounded-full">
              <X size={20} />
            </button>
            <h2 className="text-2xl font-black text-white mb-6 border-b border-zinc-800 pb-4">
                {formData.id ? 'EDIT MOD' : 'TAMBAH MOD BARU'}
            </h2>
            <form onSubmit={handleSaveMod} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-zinc-500 block mb-1">Judul</label>
                        <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-black border border-zinc-700 text-white px-3 py-2 rounded focus:border-red-600 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs text-zinc-500 block mb-1">Author</label>
                        <input required type="text" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full bg-black border border-zinc-700 text-white px-3 py-2 rounded focus:border-red-600 outline-none" />
                    </div>
                </div>
                <div>
                    <label className="text-xs text-zinc-500 block mb-1">Deskripsi</label>
                    <textarea required rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-black border border-zinc-700 text-white px-3 py-2 rounded focus:border-red-600 outline-none"></textarea>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-zinc-500 block mb-1">Kategori</label>
                        <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as CategoryType})} className="w-full bg-black border border-zinc-700 text-white px-3 py-2 rounded">
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-zinc-500 block mb-1">Platform</label>
                        <div className="flex gap-2">
                            {PLATFORMS.map(p => (
                                <label key={p} className="flex items-center gap-1 text-zinc-300 text-sm"><input type="radio" checked={formData.platform === p} onChange={() => setFormData({...formData, platform: p as PlatformType})} /> {p}</label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="space-y-2 bg-zinc-900 p-4 rounded">
                    <input required type="url" placeholder="URL Gambar" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="w-full bg-black border border-zinc-700 text-white px-3 py-2 rounded text-sm" />
                    <input required type="url" placeholder="URL Download" value={formData.downloadUrl} onChange={e => setFormData({...formData, downloadUrl: e.target.value})} className="w-full bg-black border border-zinc-700 text-white px-3 py-2 rounded text-sm" />
                </div>
                <div onClick={() => setFormData({...formData, isPremium: !formData.isPremium})} className={`p-3 rounded border cursor-pointer flex justify-between items-center ${formData.isPremium ? 'border-yellow-600 bg-yellow-900/20' : 'border-green-600 bg-green-900/20'}`}>
                    <span className={formData.isPremium ? 'text-yellow-500 font-bold' : 'text-green-500 font-bold'}>{formData.isPremium ? 'PREMIUM CONTENT' : 'FREE CONTENT'}</span>
                    {formData.isPremium ? <Lock size={18} className="text-yellow-500"/> : <Unlock size={18} className="text-green-500"/>}
                </div>
                <button type="submit" disabled={isLoading} className="w-full bg-white text-black font-bold py-3 rounded hover:bg-zinc-200">SIMPAN PERUBAHAN</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;