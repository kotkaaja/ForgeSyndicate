// components/ModManage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock, CheckCircle2, XCircle, Edit3, Trash2,
  RefreshCw, AlertTriangle, Plus, Eye,
} from 'lucide-react';
import ProductCard from './ProductCard';
import type { ModItem } from '../types';   // ✅ import dari types langsung

type Mod = ModItem;

interface ModManageProps {
  sessionId: string;
  discordId: string;
  isAdmin?: boolean;
}

interface StatusStat {
  label: string;
  count: number;
  color: string;
  icon:  React.ReactNode;
}

interface EditModalProps {
  mod:      Mod;
  onSave:   (data: Partial<Mod>) => void;
  onClose:  () => void;
  isSaving: boolean;
}

function EditModal({ mod, onSave, onClose, isSaving }: EditModalProps) {
  const [form, setForm] = useState({
    title:       mod.title,
    description: mod.description,
    category:    mod.category,
    platform:    mod.platform,
    downloadUrl: mod.downloadUrl,
    imageUrl:    mod.imageUrl || '',
    tags:        (mod.tags || []).join(', '),
  });

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-base font-semibold text-white">Edit Mod</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <XCircle size={20} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {[
            { label: 'Judul',        key: 'title',       type: 'text' },
            { label: 'URL Download', key: 'downloadUrl', type: 'url'  },
            { label: 'URL Gambar',   key: 'imageUrl',    type: 'url'  },
            { label: 'Tags (koma)',  key: 'tags',        type: 'text' },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="block text-xs text-gray-400 mb-1">{label}</label>
              <input
                type={type}
                value={(form as any)[key]}
                onChange={e => set(key, e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs text-gray-400 mb-1">Kategori</label>
            <select
              value={form.category}
              onChange={e => set('category', e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {['Moonloader', 'CLEO', 'Skin', 'Modpack', 'Client'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Deskripsi</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-700">
          <button onClick={onClose} disabled={isSaving}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors disabled:opacity-50">
            Batal
          </button>
          <button
            onClick={() => onSave({
              ...form,
              tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
            })}
            disabled={isSaving || !form.title.trim()}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? <><RefreshCw size={14} className="animate-spin" /> Menyimpan...</> : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  );
}

const ModManage: React.FC<ModManageProps> = ({ sessionId, discordId, isAdmin = false }) => {
  const [mods,         setMods]         = useState<Mod[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [editingMod,   setEditingMod]   = useState<Mod | null>(null);
  const [isSaving,     setIsSaving]     = useState(false);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchMods = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const endpoint = isAdmin
        ? `/api/admin?action=list-mods&sessionId=${sessionId}&status=${filterStatus}`
        : `/api/user?action=my-mods&sessionId=${sessionId}`;
      const res  = await fetch(endpoint);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat mod');
      setMods(data.mods || data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId, isAdmin, filterStatus]);

  useEffect(() => { fetchMods(); }, [fetchMods]);

  const handleEdit = async (updateData: Partial<Mod>) => {
    if (!editingMod) return;
    setIsSaving(true);
    try {
      const res  = await fetch('/api/admin?action=manage-mod', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, modId: editingMod.id, action: 'edit', data: updateData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMods(prev => prev.map(m => m.id === editingMod.id ? { ...m, ...updateData } : m));
      setEditingMod(null);
    } catch (err: any) {
      alert('Gagal edit mod: ' + err.message);
    } finally { setIsSaving(false); }
  };

  const handleDelete = async (mod: Mod) => {
    if (!confirm(`Yakin hapus mod "${mod.title}"?`)) return;
    setDeletingId(mod.id);
    try {
      const res  = await fetch('/api/admin?action=manage-mod', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, modId: mod.id, action: 'delete' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMods(prev => prev.filter(m => m.id !== mod.id));
    } catch (err: any) {
      alert('Gagal hapus mod: ' + err.message);
    } finally { setDeletingId(null); }
  };

  const handleApprove = async (mod: Mod, approveAs: 'verified' | 'unofficial') => {
    try {
      const res = await fetch('/api/admin?action=manage-mod', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, modId: mod.id, action: 'approve', data: { approval_status: approveAs } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMods(prev => prev.map(m => m.id === mod.id ? { ...m, approval_status: approveAs } : m));
    } catch (err: any) { alert('Gagal approve: ' + err.message); }
  };

  const handleReject = async (mod: Mod) => {
    if (!confirm(`Tolak & hapus mod "${mod.title}"?`)) return;
    try {
      const res = await fetch('/api/admin?action=manage-mod', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, modId: mod.id, action: 'reject' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMods(prev => prev.filter(m => m.id !== mod.id));
    } catch (err: any) { alert('Gagal reject: ' + err.message); }
  };

  const stats: StatusStat[] = [
    { label: 'Semua',      count: mods.length,                                                 color: 'text-gray-300',    icon: null },
    { label: 'Official',   count: mods.filter(m => m.approval_status === 'official').length,   color: 'text-blue-400',    icon: <CheckCircle2 size={14}/> },
    { label: 'Verified',   count: mods.filter(m => m.approval_status === 'verified').length,   color: 'text-emerald-400', icon: <CheckCircle2 size={14}/> },
    { label: 'Unofficial', count: mods.filter(m => m.approval_status === 'unofficial').length, color: 'text-gray-400',    icon: <CheckCircle2 size={14}/> },
    { label: 'Pending',    count: mods.filter(m => m.approval_status === 'pending').length,    color: 'text-amber-400',   icon: <Clock size={14}/> },
  ];

  const filterMap: Record<string, string> = {
    'Semua': 'all', 'Official': 'official', 'Verified': 'verified',
    'Unofficial': 'unofficial', 'Pending': 'pending',
  };

  const filteredMods = filterStatus === 'all'
    ? mods
    : mods.filter(m => m.approval_status === filterStatus);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">{isAdmin ? 'Semua Mod (Admin)' : 'Mod Saya'}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {isAdmin ? 'Kelola semua mod termasuk yang menunggu review' : 'Mod yang kamu upload — termasuk yang menunggu review admin'}
          </p>
        </div>
        <button onClick={fetchMods} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {stats.map(stat => (
          <button key={stat.label} onClick={() => setFilterStatus(filterMap[stat.label])}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              filterStatus === filterMap[stat.label] ? 'bg-white/10 border-white/30 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}>
            {stat.icon && <span className={stat.color}>{stat.icon}</span>}
            <span>{stat.label}</span>
            {stat.count > 0 && <span className={`${stat.color} font-bold`}>{stat.count}</span>}
          </button>
        ))}
      </div>

      {mods.some(m => m.approval_status === 'pending') && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-300">
              {isAdmin ? `${mods.filter(m => m.approval_status === 'pending').length} mod menunggu review` : 'Beberapa mod kamu sedang menunggu review'}
            </p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              {isAdmin ? 'Approve atau tolak mod di bawah ini agar bisa dipublish ke publik.' : 'Mod ini hanya bisa kamu lihat — tidak muncul di halaman publik sampai disetujui admin.'}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          <XCircle size={16} /> {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="rounded-xl bg-gray-800 animate-pulse aspect-[4/5]" />)}
        </div>
      )}

      {!loading && filteredMods.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Plus size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Belum ada mod{filterStatus !== 'all' ? ` dengan status ${filterStatus}` : ''}.</p>
        </div>
      )}

      {!loading && filteredMods.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMods.map(mod => (
            <div key={mod.id} className="relative group">
              <ProductCard mod={mod} showPendingBadge={true} />
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-b-xl">
                <div className="flex gap-2">
                  <button onClick={() => setEditingMod(mod)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600/80 hover:bg-blue-600 text-white transition-colors">
                    <Edit3 size={12} /> Edit
                  </button>
                  <button onClick={() => handleDelete(mod)} disabled={deletingId === mod.id}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600/80 hover:bg-red-600 text-white transition-colors disabled:opacity-50">
                    {deletingId === mod.id ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                  {isAdmin && mod.approval_status === 'pending' && (<>
                    <button onClick={() => handleApprove(mod, 'verified')} title="Approve sebagai Verified"
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/80 hover:bg-emerald-600 text-white transition-colors">
                      <CheckCircle2 size={12} /> V
                    </button>
                    <button onClick={() => handleApprove(mod, 'unofficial')} title="Approve sebagai Unofficial"
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-gray-600/80 hover:bg-gray-600 text-white transition-colors">
                      <Eye size={12} /> U
                    </button>
                    <button onClick={() => handleReject(mod)} title="Tolak mod"
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-red-800/80 hover:bg-red-800 text-white transition-colors">
                      <XCircle size={12} />
                    </button>
                  </>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingMod && (
        <EditModal mod={editingMod} onSave={handleEdit} onClose={() => setEditingMod(null)} isSaving={isSaving} />
      )}
    </div>
  );
};

export default ModManage;