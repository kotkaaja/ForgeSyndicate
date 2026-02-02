import React, { useState, useEffect } from 'react';
import { Trash2, Edit, Plus, Save, X, LogIn, Youtube, Lock, Unlock, ArrowLeft, Shield, ExternalLink, Loader2 } from 'lucide-react';
import { getMods, saveMod, deleteMod, checkAdmin } from '../services/data';
import { Link } from 'react-router-dom';
import { ModItem, CATEGORIES, PLATFORMS, CategoryType, PlatformType } from '../types';

const Admin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [mods, setMods] = useState<ModItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const emptyForm: ModItem = {
    id: '',
    title: '',
    description: '',
    category: 'Moonloader',
    platform: 'PC',
    imageUrl: '',
    mediaUrl: '',
    downloadUrl: '',
    isPremium: false,
    dateAdded: '',
    author: 'Admin'
  };
  const [formData, setFormData] = useState<ModItem>(emptyForm);

  useEffect(() => {
    if (localStorage.getItem('forge_role') === 'ADMIN') {
        setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
    }
  }, [isAuthenticated]);

  const refreshData = async () => {
    setIsLoading(true);
    const data = await getMods();
    setMods(data);
    setIsLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Cek password ke database
    const isValid = await checkAdmin(password);
    
    if (isValid) {
      setIsAuthenticated(true);
      localStorage.setItem('forge_role', 'ADMIN');
      setError('');
    } else {
      setError('Password salah atau user tidak ditemukan di database.');
    }
    setIsLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Clone form data
      const itemToSave = { ...formData };
      
      // Jika ID kosong (Mod baru), hapus properti ID agar Supabase generate UUID baru
      if (!itemToSave.id) {
         delete (itemToSave as any).id;
      }

      await saveMod(itemToSave);
      
      setIsEditing(false);
      setFormData(emptyForm);
      await refreshData();
      alert('Data berhasil disimpan ke Database!');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan data. Cek console.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (mod: ModItem) => {
    setFormData(mod);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus mod ini dari Database?')) {
      setIsLoading(true);
      try {
        await deleteMod(id);
        await refreshData();
      } catch (err) {
        alert('Gagal menghapus data.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] relative px-4">
        <div className="absolute top-4 left-4">
          <Link to="/login" className="text-zinc-500 hover:text-white flex items-center gap-2 transition-colors">
            <ArrowLeft size={20} /> Kembali ke Login Member
          </Link>
        </div>

        <div className="bg-[#1a1a1a] p-8 rounded-lg border border-red-900/30 max-w-md w-full shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Shield size={100} className="text-red-500" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2 text-center tracking-widest uppercase relative z-10">Admin Terminal</h2>
          <p className="text-zinc-500 text-xs text-center mb-6 uppercase tracking-wide">Authorized Personnel Only</p>
          
          <form onSubmit={handleLogin} className="space-y-4 relative z-10">
            <div>
              <label className="block text-zinc-500 text-xs font-bold mb-2 uppercase">Root Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-zinc-800 text-red-500 font-mono px-4 py-3 rounded focus:outline-none focus:border-red-600 transition-colors"
                placeholder="************"
                autoFocus
                disabled={isLoading}
              />
            </div>
            {error && (
              <div className="bg-red-900/20 border border-red-900/50 p-2 rounded text-red-400 text-xs text-center">
                {error}
              </div>
            )}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-red-900/80 hover:bg-red-800 text-white py-3 rounded font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(153,27,27,0.3)] disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
              AUTHENTICATE
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen bg-[#0f0f0f]">
      <div className="flex justify-between items-center mb-8 p-4 bg-[#1a1a1a] rounded border border-zinc-800">
        <div>
           <h1 className="text-2xl font-bold text-white uppercase tracking-wider">CMS Dashboard</h1>
           <p className="text-zinc-500 text-xs">Connected to Supabase</p>
        </div>
        <button 
          onClick={() => { setFormData(emptyForm); setIsEditing(true); }}
          className="bg-green-700 hover:bg-green-600 text-white px-6 py-2 rounded flex items-center gap-2 font-bold uppercase text-sm tracking-wide transition-all shadow-lg"
        >
          <Plus size={18} /> Upload Mod
        </button>
      </div>

      {/* Editor Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#1a1a1a] border border-zinc-700 rounded-lg max-w-3xl w-full p-8 relative shadow-2xl my-auto">
            <button onClick={() => setIsEditing(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-800 p-1 rounded-full">
              <X size={24} />
            </button>
            <h2 className="text-xl font-bold text-white mb-6 border-b border-zinc-800 pb-4">
                {formData.id ? 'Edit Data Mod' : 'Input Mod Baru'}
            </h2>
            
            <form onSubmit={handleSave} className="space-y-6">
              {/* Form Input Fields - Sama seperti sebelumnya, hanya memastikan value terikat */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-zinc-400 text-xs font-bold uppercase mb-2">Judul Mod</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-black border border-zinc-700 text-white px-4 py-3 rounded focus:border-green-600 outline-none" />
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs font-bold uppercase mb-2">Penulis (Author)</label>
                  <input required type="text" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full bg-black border border-zinc-700 text-white px-4 py-3 rounded focus:border-green-600 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-zinc-400 text-xs font-bold uppercase mb-2">Kategori</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as CategoryType})} className="w-full bg-black border border-zinc-700 text-white px-4 py-3 rounded focus:border-green-600 outline-none">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 text-xs font-bold uppercase mb-2">Platform</label>
                  <div className="flex gap-4 pt-2">
                     {PLATFORMS.map(p => (
                        <label key={p} className="flex items-center gap-2 cursor-pointer text-zinc-300">
                           <input 
                              type="radio" 
                              name="platform"
                              checked={formData.platform === p}
                              onChange={() => setFormData({...formData, platform: p as PlatformType})}
                              className="text-green-600 focus:ring-green-600 bg-black border-zinc-700"
                           />
                           <span className="text-sm">{p}</span>
                        </label>
                     ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-bold uppercase mb-2">Deskripsi</label>
                <textarea required rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-black border border-zinc-700 text-white px-4 py-3 rounded focus:border-green-600 outline-none"></textarea>
              </div>

              <div className="space-y-4 bg-zinc-900/50 p-4 rounded border border-zinc-800">
                  <h3 className="text-white text-sm font-bold uppercase">Media Links</h3>
                  <div>
                    <label className="block text-zinc-500 text-xs mb-1">URL Gambar (Wajib)</label>
                    <input required type="url" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="w-full bg-black border border-zinc-700 text-white px-3 py-2 rounded focus:border-green-600 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-zinc-500 text-xs mb-1">URL Video Preview</label>
                    <input type="url" value={formData.mediaUrl || ''} onChange={e => setFormData({...formData, mediaUrl: e.target.value})} className="w-full bg-black border border-zinc-700 text-white px-3 py-2 rounded focus:border-green-600 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-zinc-500 text-xs mb-1">Link Download</label>
                    <input required type="url" value={formData.downloadUrl} onChange={e => setFormData({...formData, downloadUrl: e.target.value})} className="w-full bg-black border border-zinc-700 text-white px-3 py-2 rounded focus:border-green-600 outline-none text-sm" />
                  </div>
              </div>

              <div 
                onClick={() => setFormData({...formData, isPremium: !formData.isPremium})}
                className={`p-4 rounded border cursor-pointer transition-all flex items-center justify-between ${formData.isPremium ? 'bg-yellow-900/20 border-yellow-600/50' : 'bg-green-900/20 border-green-600/50'}`}
              >
                 <div className="flex items-center gap-3">
                    {formData.isPremium ? <Lock className="text-yellow-500" /> : <Unlock className="text-green-500" />}
                    <div>
                        <h4 className={`font-bold ${formData.isPremium ? 'text-yellow-500' : 'text-green-500'}`}>
                            {formData.isPremium ? 'Status: PREMIUM' : 'Status: FREE'}
                        </h4>
                    </div>
                 </div>
              </div>

              <button type="submit" disabled={isLoading} className="w-full bg-white text-black hover:bg-zinc-200 py-3 rounded font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg">
                {isLoading ? <Loader2 className="animate-spin" /> : <Save size={18} />} Simpan
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Table - Menampilkan Loading State */}
      <div className="bg-[#1a1a1a] border border-zinc-800 rounded-lg overflow-hidden shadow-xl">
        {isLoading && !isEditing ? (
           <div className="p-8 text-center text-zinc-500">Memuat data dari database...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead className="bg-black text-zinc-200 font-heading uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-4">Judul Mod</th>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4">Akses</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {mods.map(mod => (
                  <tr key={mod.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{mod.title}</td>
                    <td className="px-6 py-4">{mod.category}</td>
                    <td className="px-6 py-4">
                      {mod.isPremium ? <span className="text-yellow-500 font-bold text-xs">PREMIUM</span> : <span className="text-green-500 font-bold text-xs">FREE</span>}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-3">
                      <button onClick={() => handleEdit(mod)} className="text-blue-400 p-2"><Edit size={18} /></button>
                      <button onClick={() => handleDelete(mod.id)} className="text-red-500 p-2"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;