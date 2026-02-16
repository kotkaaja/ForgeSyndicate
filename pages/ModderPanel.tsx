// pages/ModderPanel.tsx - Panel khusus untuk modder kelola mod mereka
// Fitur: Upload, Edit, Delete, View stats, dengan desain mirip admin panel

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Upload, Edit3, Trash2, Eye, Plus, RefreshCw, ArrowLeft, Loader2,
  Image, FileCode, Tag, X, CheckCircle, AlertTriangle, Package,
  BarChart3, Download, Star, Clock, Shield, ChevronDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import ProductCard from '../components/ProductCard';
import { CATEGORIES, PLATFORMS, PRESET_TAGS, CategoryType, PlatformType } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ModItem {
  id: string;
  title: string;
  description: string;
  category: CategoryType;
  platform: PlatformType;
  imageUrl: string;
  mediaUrl: string;
  downloadUrl: string;
  isPremium: boolean;
  dateAdded: string;
  author: string;
  downloadCount?: number;
  rating?: number;
  ratingCount?: number;
  tags: string[];
  created_at: string;
  approval_status: 'official' | 'verified' | 'unofficial' | 'pending';
  uploaded_by: string | null;
  // BARU: Original author untuk reshare
  original_author?: string;
  is_reshare?: boolean;
}

interface Stats {
  total: number;
  official: number;
  verified: number;
  unofficial: number;
  pending: number;
  totalDownloads: number;
  avgRating: number;
}

// ── Upload Helper ─────────────────────────────────────────────────────────────
async function uploadToStorage(file: File, bucket: string, folder: string): Promise<string> {
  const safeName = (file.name.split('/').pop() ?? file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
  const path     = `${folder}/${Date.now()}_${safeName}`;
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(`Upload gagal: ${error.message}`);
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}

// ── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { label: string; className: string }> = {
    official:   { label: '⭐ OFFICIAL',   className: 'bg-yellow-900/25 text-yellow-400 border-yellow-800/40' },
    verified:   { label: '✓ VERIFIED',   className: 'bg-blue-900/25 text-blue-400 border-blue-800/40' },
    unofficial: { label: 'UNOFFICIAL',   className: 'bg-zinc-800 text-zinc-500 border-zinc-700' },
    pending:    { label: '⏳ PENDING',   className: 'bg-amber-900/25 text-amber-400 border-amber-800/40' },
  };
  const { label, className } = config[status] || config.unofficial;
  return <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${className}`}>{label}</span>;
};

// ── Main Component ────────────────────────────────────────────────────────────
const ModderPanel: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [mods, setMods] = useState<ModItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'official' | 'verified' | 'unofficial' | 'pending'>('all');
  
  const [showUpload, setShowUpload] = useState(false);
  const [editingMod, setEditingMod] = useState<ModItem | null>(null);

  const canUpload = user?.guildRoles.some(r => 
    ['modder', 'verified modder', 'verified', 'admin', 'administrator', 'owner', 'founder'].includes(r.toLowerCase())
  ) ?? false;

  // ── Fetch mods ────────────────────────────────────────────────────────────
  const fetchMods = useCallback(async () => {
    if (!user?.discordId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mods')
        .select('*')
        .eq('uploaded_by', user.discordId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: ModItem[] = (data || []).map(m => ({
        id: m.id,
        title: m.title,
        description: m.description,
        category: m.category,
        platform: m.platform,
        imageUrl: m.image_url || '',
        mediaUrl: m.media_url || '',
        downloadUrl: m.download_url,
        isPremium: m.is_premium || false,
        dateAdded: new Date(m.created_at).toISOString().split('T')[0],
        author: m.author,
        downloadCount: m.download_count ?? 0,
        rating: m.rating ?? 0,
        ratingCount: m.rating_count ?? 0,
        tags: m.tags ?? [],
        created_at: m.created_at,
        approval_status: m.approval_status ?? 'unofficial',
        uploaded_by: m.uploaded_by,
        // BARU: Reshare fields
        original_author: m.original_author,
        is_reshare: m.is_reshare ?? false,
      }));

      setMods(mapped);

      // Calculate stats
      const totalDownloads = mapped.reduce((sum, m) => sum + (m.downloadCount || 0), 0);
      const ratingsSum = mapped.reduce((sum, m) => sum + ((m.rating || 0) * (m.ratingCount || 0)), 0);
      const ratingsCount = mapped.reduce((sum, m) => sum + (m.ratingCount || 0), 0);
      
      setStats({
        total: mapped.length,
        official: mapped.filter(m => m.approval_status === 'official').length,
        verified: mapped.filter(m => m.approval_status === 'verified').length,
        unofficial: mapped.filter(m => m.approval_status === 'unofficial').length,
        pending: mapped.filter(m => m.approval_status === 'pending').length,
        totalDownloads,
        avgRating: ratingsCount > 0 ? ratingsSum / ratingsCount : 0,
      });

    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.discordId, showToast]);

  useEffect(() => {
    fetchMods();
  }, [fetchMods]);

  // ── Delete mod ────────────────────────────────────────────────────────────
  const handleDelete = async (modId: string, title: string) => {
    if (!confirm(`Hapus mod "${title}"?`)) return;
    try {
      const sessionId = localStorage.getItem('ds_session_id');
      if (!sessionId) throw new Error('Session expired');

      const res = await fetch('/api/admin?action=manage-mod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, modId, action: 'delete' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMods(prev => prev.filter(m => m.id !== modId));
      showToast('Mod berhasil dihapus', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const filteredMods = filter === 'all' ? mods : mods.filter(m => m.approval_status === filter);

  // ── Access guard ──────────────────────────────────────────────────────────
  if (!user) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center space-y-4">
        <AlertTriangle size={40} className="text-yellow-500 mx-auto"/>
        <p className="text-zinc-400">Kamu harus <Link to="/login" className="text-green-400 underline">login</Link> dulu.</p>
      </div>
    </div>
  );

  if (!canUpload) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center space-y-3 max-w-sm px-4">
        <AlertTriangle size={40} className="text-yellow-500 mx-auto"/>
        <h2 className="text-white font-black text-lg">Akses Ditolak</h2>
        <p className="text-zinc-500 text-sm">Kamu butuh role <span className="text-green-400 font-bold">Modder</span> untuk mengakses panel ini.</p>
        <Link to="/mods" className="inline-block mt-2 text-sm text-zinc-500 hover:text-white underline">← Kembali ke Gudang Mod</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-16">
      {/* Header */}
      <div className="border-b border-zinc-800/60 bg-[#0d0d0d] px-4 py-5">
        <div className="max-w-7xl mx-auto">
          <Link to="/mods" className="text-zinc-600 hover:text-white flex items-center gap-1.5 text-xs mb-3 transition-colors">
            <ArrowLeft size={13}/> Kembali ke Gudang Mod
          </Link>
          
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                <Package size={20} className="text-green-500"/>
                PANEL MODDER
              </h1>
              <p className="text-zinc-600 text-xs mt-0.5">
                Kelola mod yang kamu upload • Reshared by: {user.username}
              </p>
            </div>
            
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded-xl transition-colors"
            >
              <Plus size={16}/>
              Upload Mod Baru
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#111] border border-zinc-800/70 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-400 mb-1">
                <Package size={14}/>
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Mod</span>
              </div>
              <p className="text-2xl font-black text-white">{stats.total}</p>
            </div>
            
            <div className="bg-[#111] border border-zinc-800/70 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-400 mb-1">
                <Download size={14}/>
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Download</span>
              </div>
              <p className="text-2xl font-black text-white">{stats.totalDownloads.toLocaleString()}</p>
            </div>
            
            <div className="bg-[#111] border border-zinc-800/70 rounded-xl p-4">
              <div className="flex items-center gap-2 text-yellow-400 mb-1">
                <Star size={14}/>
                <span className="text-[10px] font-bold uppercase tracking-wider">Avg Rating</span>
              </div>
              <p className="text-2xl font-black text-white">{stats.avgRating.toFixed(1)}</p>
            </div>
            
            <div className="bg-[#111] border border-zinc-800/70 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <Clock size={14}/>
                <span className="text-[10px] font-bold uppercase tracking-wider">Pending</span>
              </div>
              <p className="text-2xl font-black text-white">{stats.pending}</p>
            </div>
          </div>
        )}

        {/* Pending Banner */}
        {stats && stats.pending > 0 && (
          <div className="flex items-start gap-3 mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <Clock size={16} className="text-amber-400 flex-shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm font-medium text-amber-300">
                {stats.pending} mod menunggu review admin
              </p>
              <p className="text-xs text-amber-400/70 mt-0.5">
                Mod pending tidak muncul di halaman publik sampai disetujui.
              </p>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {(['all', 'official', 'verified', 'unofficial', 'pending'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                filter === f ? 'bg-green-700 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-white'
              }`}>
              {f} {stats && `(${stats[f === 'all' ? 'total' : f]})`}
            </button>
          ))}
          
          <button onClick={fetchMods} className="ml-auto p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/>
          </button>
        </div>

        {/* Mod Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-green-500"/>
          </div>
        ) : filteredMods.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-zinc-800/50 rounded-2xl">
            <Package size={40} className="text-zinc-700 mx-auto mb-3"/>
            <p className="text-zinc-600 text-sm">Belum ada mod{filter !== 'all' ? ` dengan status ${filter}` : ''}.</p>
            {filter === 'all' && (
              <button
                onClick={() => setShowUpload(true)}
                className="mt-4 text-green-400 hover:text-green-300 text-sm font-bold underline"
              >
                Upload mod pertamamu
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMods.map(mod => (
              <div key={mod.id} className="relative group">
                <ProductCard mod={mod} showPendingBadge={true}/>
                
                {/* Action overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-b-xl">
                  <div className="flex gap-2">
                    <Link to={`/mod/${mod.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-700/80 hover:bg-zinc-600 text-white transition-colors">
                      <Eye size={12}/> Lihat
                    </Link>
                    <button onClick={() => setEditingMod(mod)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-blue-700/80 hover:bg-blue-600 text-white transition-colors">
                      <Edit3 size={12}/> Edit
                    </button>
                    <button onClick={() => handleDelete(mod.id, mod.title)}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-700/80 hover:bg-red-600 text-white transition-colors">
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </div>

                {/* Reshare badge */}
                {mod.is_reshare && mod.original_author && (
                  <div className="absolute top-2 right-2 z-10 bg-purple-900/80 backdrop-blur-sm border border-purple-700/60 text-purple-300 text-[9px] font-bold px-2 py-1 rounded-lg shadow-lg">
                    Reshare by {mod.author}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal - Akan dibuat di file terpisah nanti */}
      {(showUpload || editingMod) && (
        <UploadEditModal
          editMod={editingMod}
          onClose={() => { setShowUpload(false); setEditingMod(null); }}
          onSuccess={() => { setShowUpload(false); setEditingMod(null); fetchMods(); }}
          user={user}
        />
      )}
    </div>
  );
};

// ── Upload/Edit Modal (simplified - full version would be separate) ──────────
const UploadEditModal: React.FC<{
  editMod: ModItem | null;
  onClose: () => void;
  onSuccess: () => void;
  user: any;
}> = ({ editMod, onClose, onSuccess, user }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90" onClick={onClose}>
      <div className="bg-[#111] border border-zinc-700 rounded-2xl max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-white uppercase">
            {editMod ? 'Edit Mod' : 'Upload Mod Baru'}
          </h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-white">
            <X size={20}/>
          </button>
        </div>
        
        <p className="text-zinc-500 text-sm mb-4">
          Form upload lengkap - implementasi sama seperti pages/UploadMod.tsx
        </p>
        
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700">
            Batal
          </button>
          <button className="flex-1 py-2 rounded-lg bg-green-700 text-white hover:bg-green-600">
            {editMod ? 'Simpan Perubahan' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModderPanel;