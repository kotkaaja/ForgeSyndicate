// pages/UserPanel.tsx — User Panel dengan Fitur Edit & Notifikasi Lengkap
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User, Settings, Package, Upload,
  Copy, Check, Loader2, X, Plus,
  ChevronRight, LogOut, Shield, Star,
  Link as LinkIcon, Image as ImageIcon, FileText,
  Play, Save, Share2, Lock,
  Trash2, Eye, Edit, Clock,
  ExternalLink, Crown, Download,
  RotateCcw, Gift, Zap, Key,
  RefreshCw, AlertTriangle, Search, Pencil,
  Calendar, Users, Monitor // ← Icon Monitor ditambahkan
} from 'lucide-react';
import toast from 'react-hot-toast'; // Notifikasi Toast
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import ProductCard from '../components/ProductCard';
import type { ModItem } from '../types';

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const UPLOAD_CATEGORIES = [
  'Moonloader', 'CLEO', 'ASI', 'Skin', 'Map', 'Sound',
  'Texture', 'Script', 'Tool', 'Other'
];

const DEFAULT_TAGS = [
  { label: 'Hot 🔥', value: 'hot' },
  { label: 'New ✨', value: 'new' },
  { label: 'Updated 🔄', value: 'updated' },
  { label: 'Trending 📈', value: 'trending' },
  { label: 'Popular ⭐', value: 'popular' },
  { label: 'Beta ✏️', value: 'beta' },
];

const UPLOAD_ROLES = [
  'modder', 'verified modder', 'verified', 'trusted modder',
  'admin', 'administrator', 'owner', 'founder', 'co-founder',
  'script maker', 'lua modder'
];

// ── Types ──────────────────────────────────────────────────────────────────
interface TokenEntry {
  token: string;
  expiry_timestamp: string | null;
  source_alias: string;
  hwid: string | null;
  is_current: boolean;
}

// TAMBAHAN: type untuk download history
interface DownloadHistoryItem {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  created_at: string;
}

type PanelTab = 'profile' | 'mods' | 'license';

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

// ── COMPONENT: MOD FORM MODAL (Create & Edit) ──────────────────────────────
interface ModFormModalProps {
  user: any;
  initialData?: ModItem | null; // Jika ada, berarti mode EDIT
  onClose: () => void;
  onSuccess: () => void;
}

const ModFormModal: React.FC<ModFormModalProps> = ({ user, initialData, onClose, onSuccess }) => {
  const isEditMode = !!initialData;
  
  // State Form
  const [isReshare, setIsReshare]           = useState(false);
  const [originalAuthor, setOriginalAuthor] = useState('');
  const [title, setTitle]                   = useState('');
  const [description, setDescription]       = useState('');
  const [category, setCategory]             = useState('Moonloader');
  const [platform, setPlatform]             = useState<'PC'|'Android'|'Universal'>('PC');
  const [isPremium, setIsPremium]           = useState(false);

  // Gambar
  const [imageMode, setImageMode]       = useState<'url'|'upload'>('url');
  const [imageUrl, setImageUrl]         = useState('');
  const [imageFile, setImageFile]       = useState<File|null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const imageRef = useRef<HTMLInputElement>(null);

  // File Mod
  const [fileMode, setFileMode] = useState<'url'|'upload'>('url');
  const [fileUrl, setFileUrl]   = useState('');
  const [modFile, setModFile]   = useState<File|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Preview & Tags
  const [previewMedia, setPreviewMedia]   = useState('');
  const [selectedTags, setSelectedTags]   = useState<string[]>([]);
  const [customTag, setCustomTag]         = useState('');
  const [submitting, setSubmitting]       = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // ── INIT DATA UNTUK EDIT ──
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      setCategory(initialData.category as any);
      setPlatform(initialData.platform as any);
      setIsPremium(initialData.isPremium);
      setImageUrl(initialData.imageUrl);
      setFileUrl(initialData.downloadUrl);
      setPreviewMedia(initialData.mediaUrl || '');
      setSelectedTags(initialData.tags || []);
      
      // Deteksi reshare (logika sederhana)
      if (initialData.author !== user.username) {
        setIsReshare(true);
        setOriginalAuthor(initialData.author);
      }
    }
  }, [initialData, user.username]);

  // Handlers
  const toggleTag = (v: string) => setSelectedTags(p => p.includes(v) ? p.filter(t => t !== v) : [...p, v]);
  const addCustomTag = () => { const t = customTag.trim(); if (!t || selectedTags.includes(t)) return; setSelectedTags(p => [...p, t]); setCustomTag(''); };
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; setImageFile(f); setImagePreview(URL.createObjectURL(f)); setImageMode('upload'); };
  const handleModFile = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 50 * 1024 * 1024) { toast.error('Maks 50MB. Gunakan URL eksternal.'); return; } setModFile(f); setFileMode('upload'); };

  const handleSubmit = async () => {
    const sessionId = localStorage.getItem('ds_session_id');
    if (!sessionId) return toast.error('Sesi habis, silakan login ulang.');

    if (!title.trim()) return toast.error('Judul wajib diisi!');
    if (!description.trim()) return toast.error('Deskripsi wajib diisi!');
    
    // Validasi URL basic
    if (fileMode === 'url' && fileUrl && !fileUrl.startsWith('http')) {
      return toast.error('URL File harus diawali http:// atau https://');
    }

    setSubmitting(true);
    const toastId = toast.loading(isEditMode ? 'Mengupdate mod...' : 'Mengupload mod...');

    try {
      let finalImg  = imageUrl;
      let finalFile = fileUrl;

      // Handle Image Upload
      if (imageMode === 'upload' && imageFile) {
        finalImg = await uploadToStorage(imageFile, 'mod-images', 'thumbnails');
      }

      // Handle File Upload
      if (fileMode === 'upload' && modFile) {
        setUploadingFile(true);
        finalFile = await uploadToStorage(modFile, 'mod-files', 'user-uploads');
        setUploadingFile(false);
      }

      // ── LOGIC SECURITY: DETEKSI PERUBAHAN KRISIAL ──
      let newStatus = undefined;
      if (isEditMode && initialData) {
        const fileChanged = finalFile !== initialData.downloadUrl;
        if (fileChanged) {
           newStatus = 'pending';
        }
      }

      const modPayload = {
        title: title.trim(),
        description: description.trim(),
        category,
        platform,
        image_url: finalImg || null,
        download_url: finalFile,
        media_url: previewMedia || null,
        tags: selectedTags,
        is_premium: isPremium,
        is_reshare: isReshare,
        original_author: isReshare ? originalAuthor.trim() : null,
        author: isReshare ? originalAuthor.trim() : user.username,
        ...(newStatus && { approval_status: newStatus }) 
      };

      if (isEditMode && initialData) {
        const { error } = await supabase
          .from('mods')
          .update(modPayload)
          .eq('id', initialData.id)
          .eq('uploaded_by', user.discordId);

        if (error) throw error;
        
        if (newStatus === 'pending') {
          toast.success('File berubah: Mod masuk status PENDING untuk review admin.', { id: toastId, duration: 5000 });
        } else {
          toast.success('Mod berhasil diperbarui!', { id: toastId });
        }
      
      } else {
        const res = await fetch('/api/mod', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            ...modPayload,
            imageUrl: finalImg,
            downloadUrl: finalFile,
            previewMedia: previewMedia,
            uploader_id: user.discordId,
            uploader_username: user.username,
          }),
        });

        const respData = await res.json();
        if (!res.ok) throw new Error(respData.error || respData.message || 'Gagal upload');
        toast.success(respData.message || 'Mod berhasil diupload!', { id: toastId });
      }

      onSuccess();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Terjadi kesalahan', { id: toastId });
    } finally {
      setSubmitting(false); setUploadingFile(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99] flex items-start justify-center bg-black/95 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#111] border border-zinc-700/70 rounded-2xl max-w-xl w-full p-6 relative shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-600 hover:text-white bg-zinc-800 p-1.5 rounded-lg"><X size={16}/></button>
        <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
          {isEditMode ? <><Edit size={20} className="text-blue-400"/> Edit Mod</> : <><Upload size={20} className="text-green-400"/> Upload Mod Baru</>}
        </h2>
        
        <div className="space-y-5">
           {/* Reshare Toggle */}
           <div onClick={() => { setIsReshare(p => !p); if (isReshare) setOriginalAuthor(''); }} className={`rounded-xl border p-4 cursor-pointer transition-all ${isReshare ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-800 bg-[#141414] hover:border-zinc-700'}`}>
            <div className="flex items-center justify-between">
              <div><p className="font-semibold text-white">Reshare Mod</p><p className="text-sm text-zinc-400">Centang jika ini mod orang lain</p></div>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isReshare ? 'bg-purple-500 border-purple-500' : 'border-zinc-500'}`}>{isReshare && <Check size={12} className="text-white" />}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-zinc-400 uppercase tracking-widest mb-1.5 block">Judul <span className="text-red-400">*</span></label><input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[#0f0f0f] border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"/></div>
            <div><label className="text-xs text-zinc-400 uppercase tracking-widest mb-1.5 block">Author <span className="text-red-400">*</span></label>{isReshare ? (<input value={originalAuthor} onChange={e => setOriginalAuthor(e.target.value)} className="w-full bg-[#0f0f0f] border border-purple-500/50 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"/>) : (<input value={user.username} disabled className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-400 text-sm cursor-not-allowed"/>)}</div>
          </div>

          <div><label className="text-xs text-zinc-400 uppercase tracking-widest mb-1.5 block">Deskripsi <span className="text-red-400">*</span></label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="w-full bg-[#0f0f0f] border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors resize-none"/></div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-zinc-400 uppercase tracking-widest mb-1.5 block">Kategori</label><select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-[#0f0f0f] border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors">{UPLOAD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="text-xs text-zinc-400 uppercase tracking-widest mb-1.5 block">Platform</label><div className="flex items-center gap-4 mt-2.5">{(['PC','Android','Universal'] as const).map(p => (<label key={p} className="flex items-center gap-1.5 cursor-pointer" onClick={() => setPlatform(p)}><div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${platform === p ? 'border-green-400' : 'border-zinc-500'}`}>{platform === p && <div className="w-2 h-2 rounded-full bg-green-400" />}</div><span className="text-sm text-zinc-300">{p}</span></label>))}</div></div>
          </div>

          {/* Image Upload */}
          <div><div className="flex items-center justify-between mb-1.5"><label className="text-xs text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><ImageIcon size={12} /> Gambar</label><div className="flex gap-1"><button onClick={() => setImageMode('url')} className={`text-xs px-2.5 py-1 rounded flex items-center gap-1 transition-colors ${imageMode === 'url' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}><LinkIcon size={11} /> URL</button><button onClick={() => { setImageMode('upload'); imageRef.current?.click(); }} className={`text-xs px-2.5 py-1 rounded flex items-center gap-1 transition-colors ${imageMode === 'upload' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}><Upload size={11} /> Upload</button></div></div><input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />{imageMode === 'url' ? (<input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." className="w-full bg-[#0f0f0f] border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"/>) : (<div onClick={() => imageRef.current?.click()} className="border border-dashed border-zinc-700 rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:border-purple-500 transition-colors min-h-[48px]">{imagePreview || imageUrl ? (<><img src={imagePreview || imageUrl} className="w-12 h-12 rounded object-cover" alt="" /><span className="text-sm text-zinc-300 truncate flex-1">{imageFile ? imageFile.name : 'Gambar saat ini'}</span><button className="text-zinc-500 hover:text-red-400" onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(''); setImageMode('url'); setImageUrl(''); }}><X size={14} /></button></>) : (<div className="flex items-center gap-2 text-zinc-500 text-sm"><Upload size={14} /><span>Klik untuk upload gambar</span></div>)}</div>)}</div>

          {/* Preview Media */}
          <div><label className="text-xs text-zinc-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 block"><Play size={12} /> Preview Media</label><input value={previewMedia} onChange={e => setPreviewMedia(e.target.value)} placeholder="https://youtube.com/..." className="w-full bg-[#0f0f0f] border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"/></div>

          {/* File Upload */}
          <div><div className="flex items-center justify-between mb-1.5"><label className="text-xs text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><FileText size={12} /> File Mod {isEditMode ? '(Opsional)' : <span className="text-red-400">*</span>}</label><div className="flex gap-1"><button onClick={() => setFileMode('url')} className={`text-xs px-2.5 py-1 rounded flex items-center gap-1 transition-colors ${fileMode === 'url' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}><LinkIcon size={11} /> URL</button><button onClick={() => { setFileMode('upload'); fileRef.current?.click(); }} className={`text-xs px-2.5 py-1 rounded flex items-center gap-1 transition-colors ${fileMode === 'upload' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}><Upload size={11} /> Upload</button></div></div><input ref={fileRef} type="file" className="hidden" onChange={handleModFile} />{fileMode === 'url' ? (<input value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://..." className="w-full bg-[#0f0f0f] border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"/>) : (<><div onClick={() => fileRef.current?.click()} className="border border-dashed border-zinc-700 rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:border-purple-500 transition-colors min-h-[48px]">{modFile || fileUrl ? (<><FileText size={18} className="text-purple-400 shrink-0" /><span className="text-sm text-zinc-300 truncate flex-1">{modFile ? modFile.name : 'File saat ini'}</span><span className="text-xs text-zinc-500 shrink-0">{modFile ? (modFile.size/1024/1024).toFixed(1) + ' MB' : 'URL Link'}</span><button className="text-zinc-500 hover:text-red-400 shrink-0" onClick={e => { e.stopPropagation(); setModFile(null); setFileMode('url'); setFileUrl(''); }}><X size={14} /></button></>) : (<div className="flex items-center gap-2 text-zinc-500 text-sm"><Upload size={14} /><span>Upload file mod</span></div>)}</div><p className="text-xs text-yellow-500 mt-1">⚠ Maks 50MB. File lebih besar? Gunakan URL eksternal.</p></>)}</div>
          
          {/* Tags */}
          <div><label className="text-xs text-zinc-400 uppercase tracking-widest mb-2 block">Tags</label><div className="flex flex-wrap gap-2 mb-2">{DEFAULT_TAGS.map(tag => (<button key={tag.value} onClick={() => toggleTag(tag.value)} className={`text-sm px-3 py-1.5 rounded-full border transition-all ${selectedTags.includes(tag.value) ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-[#141414] border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>{tag.label}</button>))}{selectedTags.filter(t => !DEFAULT_TAGS.map(d => d.value).includes(t)).map(ct => (<span key={ct} className="text-sm px-3 py-1.5 rounded-full border bg-purple-500/20 border-purple-500 text-purple-300 flex items-center gap-1.5">{ct}<button onClick={() => setSelectedTags(p => p.filter(t => t !== ct))}><X size={11} /></button></span>))}</div><div className="flex gap-2"><input value={customTag} onChange={e => setCustomTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomTag()} placeholder="Custom tag..." className="flex-1 bg-[#0f0f0f] border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"/><button onClick={addCustomTag} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white text-sm flex items-center gap-1 transition-colors"><Plus size={14} /> +Add</button></div></div>

          {/* Premium Toggle */}
          <div onClick={() => setIsPremium(!isPremium)} className={`rounded-xl border p-4 flex items-center justify-between cursor-pointer transition-all ${isPremium ? 'border-yellow-700/40 bg-yellow-900/10 hover:border-yellow-600/60' : 'border-green-700/40 bg-green-900/10 hover:border-green-600/60'}`}>
            <div><p className={`font-bold text-lg ${isPremium ? 'text-yellow-500' : 'text-green-400'}`}>{isPremium ? 'VIP ONLY' : 'GRATIS'}</p><p className="text-zinc-400 text-sm">{isPremium ? 'Hanya member VIP yang bisa download' : 'Semua bisa download'}</p></div>
            {isPremium ? <Lock size={24} className="text-yellow-500" /> : <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 018 0M5 11h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z" /></svg>}
          </div>

          <button onClick={handleSubmit} disabled={submitting} className="w-full py-3.5 rounded-xl bg-white text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            {submitting ? (
              <><Loader2 size={16} className="animate-spin" />{uploadingFile ? 'Mengupload file...' : 'Menyimpan...'}</>
            ) : (
              <>{isEditMode ? <Save size={16} /> : <Upload size={16}/>} {isEditMode ? 'UPDATE MOD' : 'UPLOAD MOD'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Tab: PROFILE ────────────────────────────────────────────────────────────
const ProfileTab: React.FC<{ user: any; isVIP: boolean }> = ({ user, isVIP }) => {
  const isAdmin = user?.guildRoles?.some((r: string) => ['Admin', 'Administrator', 'Owner', 'Founder', 'Co-Founder'].includes(r));
  const expiry = formatExpiry(user?.expiry);

  // ── TAMBAHAN: Download History state ──
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading]   = useState(false);
  const [showHistory, setShowHistory]         = useState(false);

  // ── TAMBAHAN: Format join date jika ada ──
  const joinDate = user?.guildJoinedAt
    ? new Date(user.guildJoinedAt).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
      })
    : null;

  // ── TAMBAHAN: Fetch download history dari API ──
  const fetchDownloadHistory = useCallback(async () => {
    if (!user?.discordId) return;
    setHistoryLoading(true);
    try {
      const sessionId = localStorage.getItem('ds_session_id');
      if (!sessionId) return;
      const res = await fetch(`/api/user?action=downloads&sessionId=${sessionId}`);
      if (res.ok) setDownloadHistory(await res.json());
    } catch (err) {
      console.error('Failed to fetch download history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [user?.discordId]);

  useEffect(() => {
    if (showHistory && downloadHistory.length === 0) fetchDownloadHistory();
  }, [showHistory, downloadHistory.length, fetchDownloadHistory]);

  return (
    <div className="space-y-4">
      {/* Profile card — sama persis dengan asli */}
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
            {/* BOX 1 */}
            <div className="bg-zinc-900/40 rounded-xl px-3 py-2.5">
              <p className="text-zinc-600 text-[10px] mb-0.5 flex items-center gap-1"><Clock size={9} /> Aktif hingga</p>
              <p className={`text-xs font-bold ${expiry.color}`}>{expiry.urgent && '⚠️ '}{expiry.text}</p>
            </div>
            {/* BOX 2 */}
            <div className="bg-zinc-900/40 rounded-xl px-3 py-2.5">
              <p className="text-zinc-600 text-[10px] mb-0.5 flex items-center gap-1"><Download size={9} /> Akses</p>
              <p className={`text-xs font-bold ${isVIP ? 'text-yellow-400' : 'text-green-400'}`}>{isVIP ? 'VIP + Free' : 'Free only'}</p>
            </div>
            {/* BOX 3 */}
            {joinDate && (
              <div className="bg-zinc-900/40 rounded-xl px-3 py-2.5">
                <p className="text-zinc-600 text-[10px] mb-0.5 flex items-center gap-1"><Calendar size={9} /> Bergabung</p>
                <p className="text-xs font-medium text-zinc-300">{joinDate}</p>
              </div>
            )}
            {/* BOX 4 */}
            <div className="bg-zinc-900/40 rounded-xl px-3 py-2.5">
              <p className="text-zinc-600 text-[10px] mb-0.5 flex items-center gap-1"><Users size={9} /> Roles</p>
              <p className="text-xs font-bold text-zinc-300">
                {user?.guildRoles?.filter((r: string) => r !== '@everyone').length || 0} role
              </p>
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

      {/* TAMBAHAN: Download History (collapsible) */}
      <div className="bg-[#141414] border border-zinc-800/80 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowHistory(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-900/40 transition-colors"
        >
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <Download size={10} /> Riwayat Download
          </span>
          <ChevronRight size={14} className={`text-zinc-600 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
        </button>
        {showHistory && (
          <div className="border-t border-zinc-800/50 p-4">
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-zinc-600" />
              </div>
            ) : downloadHistory.length === 0 ? (
              <p className="text-center text-zinc-700 text-xs py-6">Belum ada riwayat download.</p>
            ) : (
              <div className="space-y-2">
                {downloadHistory.map(mod => (
                  <Link
                    key={mod.id}
                    to={`/mod/${mod.id}`}
                    className="flex items-center gap-3 bg-zinc-900/40 hover:bg-zinc-800/50 border border-zinc-800/40 rounded-lg px-3 py-2 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-zinc-800 border border-zinc-700/50">
                      {mod.imageUrl
                        ? <img src={mod.imageUrl} alt={mod.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-zinc-700"><Download size={14} /></div>
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-zinc-300 font-semibold truncate group-hover:text-white transition-colors">{mod.title}</p>
                      <p className="text-[10px] text-zinc-600">{mod.category}</p>
                    </div>
                    <ExternalLink size={11} className="text-zinc-700 group-hover:text-zinc-400 flex-shrink-0 transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Tab: LISENSI ────────────────────────────────────────────────────────────
// PERUBAHAN: Tampilan HWID diubah menjadi "PERANGKAT TERIKAT" / "NON-BIND"
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

      // Cek cooldown dari last_claim_timestamp
      if (data.last_claim_timestamp) {
        const diff   = Date.now() - new Date(data.last_claim_timestamp).getTime();
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        if (diff < weekMs) {
          const rem     = weekMs - diff;
          const days    = Math.floor(rem / (24 * 3600000));
          const hours   = Math.floor((rem % (24 * 3600000)) / 3600000);
          const minutes = Math.floor((rem % 3600000) / 60000);
          setCooldown(days > 0 ? `${days}h ${hours}j` : `${hours}j ${minutes}m`);
        } else {
          setCooldown('');
        }
      } else {
        const last = localStorage.getItem(`last_claim_${user?.discordId}`);
        if (last) {
          const diff   = Date.now() - new Date(last).getTime();
          const weekMs = 7 * 24 * 60 * 60 * 1000;
          if (diff < weekMs) {
            const rem   = weekMs - diff;
            const days  = Math.floor(rem / (24 * 3600000));
            const hours = Math.floor((rem % (24 * 3600000)) / 3600000);
            setCooldown(`${days}h ${hours}j`);
          }
        }
      }
    } catch (err: any) {
      console.error('Token fetch error:', err);
    } finally { setLoading(false); }
  }, [user?.discordId]);

  useEffect(() => { fetchTokens(); }, [fetchTokens]);

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
    if (!confirm('Reset token ini? Token lama diganti baru tapi WAKTU EXPIRY TETAP SAMA (tidak direset).')) return;
    if (!sessionId) return;
    setRefunding(token);
    try {
      const res = await fetch('/api/token-manage?action=user-refund-token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message || 'Token di-reset!');
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
      localStorage.setItem(`last_claim_${user?.discordId}`, new Date().toISOString());
      showToast('✅ Token berhasil di-claim!');
      await fetchTokens();
    } catch (err: any) { showToast(err.message, 'error'); }
    finally { setClaiming(false); }
  };

  return (
    <div className="space-y-4">
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
          {/* Tampilan HWID Utama di Sini juga bisa diubah jika mau, tapi user minta di list token */}
          <code className="text-xs font-mono text-zinc-400 bg-black/30 px-2 py-1 rounded block truncate">
             {/* Jika ingin sembunyikan HWID global juga, ganti {hwid} dengan status. Tapi biasanya ini di list token yg penting. */}
             PERANGKAT TERIKAT (SYSTEM)
          </code>
        </div>
      )}

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

                  {/* ── PERUBAHAN TAMPILAN HWID DI SINI ── */}
                  <div className="flex items-center justify-between text-[9px] text-zinc-600 pt-1">
                    <div className="flex items-center gap-1.5">
                        <Monitor size={11} className="text-zinc-500" />
                        <span className={`font-bold ${entry.hwid ? 'text-green-500' : 'text-zinc-600'}`}>
                           {entry.hwid ? 'PERANGKAT TERIKAT' : 'NON-BIND'}
                        </span>
                    </div>

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
                          className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-500 hover:text-yellow-400 rounded text-[9px] font-bold border border-zinc-700 transition-all disabled:opacity-50">
                          {refunding === entry.token ? <Loader2 size={8} className="animate-spin" /> : <RotateCcw size={8} />}
                          Reset Token
                        </button>
                      )}
                    </div>
                  </div>
                  {/* ───────────────────────────────────── */}

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Tab: MOD SAYA (Dashboard + Filter Version) ─────────────────────────────
const MyModsTab: React.FC<{ user: any }> = ({ user }) => {
  const navigate = useNavigate();
  const [mods, setMods]       = useState<ModItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // States
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'live'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  const [showModal, setShowModal] = useState(false);
  const [editingMod, setEditingMod] = useState<ModItem | null>(null);

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
    const toastId = toast.loading('Menghapus mod...');
    try {
      const res = await fetch('/api/admin?action=manage-mod', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, modId: mod.id, action: 'delete' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMods(prev => prev.filter(m => m.id !== mod.id));
      toast.success('Mod berhasil dihapus!', { id: toastId });
    } catch (err: any) { 
      toast.error(err.message, { id: toastId });
    } finally { setDeleting(null); }
  };

  const handleEdit = (mod: ModItem) => {
    setEditingMod(mod);
    setShowModal(true);
  };

  // ── LOGIC STATS ──
  const totalDownloads = mods.reduce((acc, curr) => acc + (curr.downloadCount || 0), 0);
  const totalMods = mods.length;
  const pendingCount = mods.filter(m => (m as any).approval_status === 'pending').length;
  
  // ── LOGIC FILTER ──
  const filteredMods = mods.filter(m => {
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase());
    const status = (m as any).approval_status || 'unofficial';
    
    let matchStatus = true;
    if (filterStatus === 'pending') matchStatus = status === 'pending';
    if (filterStatus === 'live')    matchStatus = status !== 'pending';

    let matchCategory = true;
    if (filterCategory !== 'all') matchCategory = m.category === filterCategory;

    return matchSearch && matchStatus && matchCategory;
  });

  return (
    <div className="space-y-6">
      
      {/* ── 1. STATS DASHBOARD ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
             <Download size={20} />
          </div>
          <div>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Total Download</p>
            <p className="text-2xl font-black text-white">{totalDownloads.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
             <Package size={20} />
          </div>
          <div>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Total Mod</p>
            <p className="text-2xl font-black text-white">{totalMods}</p>
          </div>
        </div>
      </div>

      {/* ── 2. ACTIONS & FILTERS ── */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" size={14}/>
          <input 
            placeholder="Cari mod kamu..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-white pl-10 pr-4 py-2.5 rounded-xl text-sm focus:border-zinc-600 outline-none transition-colors"
          />
        </div>
        
        <div className="flex gap-2">
          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:border-zinc-600"
          >
            <option value="all">Semua Status</option>
            <option value="live">✅ Live / Aktif</option>
            <option value="pending">⏳ Pending</option>
          </select>

          <select 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:border-zinc-600 max-w-[120px]"
          >
            <option value="all">Semua Kategori</option>
            {UPLOAD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button 
            onClick={() => { setEditingMod(null); setShowModal(true); }}
            className="bg-green-700 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-lg shadow-green-900/20 whitespace-nowrap"
          >
            <Plus size={16}/> <span className="hidden sm:inline">Upload</span>
          </button>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <Clock size={14} className="text-amber-400" />
          <p className="text-sm text-amber-300 font-semibold">{pendingCount} mod kamu sedang menunggu review admin.</p>
        </div>
      )}

      {/* ── 3. MOD LIST ── */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-green-500" /></div>
      ) : filteredMods.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-800/50 rounded-2xl">
          <Package size={40} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-600 text-sm mb-4">
            {search || filterStatus !== 'all' ? 'Tidak ada mod yang cocok dengan filter.' : 'Belum ada mod yang diupload.'}
          </p>
          <button onClick={() => { setEditingMod(null); setShowModal(true); }} className="text-green-400 hover:text-green-300 text-xs font-bold underline">
            Upload mod pertamamu
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMods.map(mod => (
            <div key={mod.id} className="relative group">
              <ProductCard mod={mod} showPendingBadge />
              
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black via-black/90 to-transparent pt-8 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-end">
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/mod/${mod.id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-colors">
                    <Eye size={14} /> Lihat
                  </button>
                  <button onClick={() => handleEdit(mod)}
                    className="flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                    title="Edit Mod">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(mod)} disabled={deleting === mod.id}
                    className="flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
                    title="Hapus Mod">
                    {deleting === mod.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ModFormModal 
          user={user} 
          initialData={editingMod} 
          onClose={() => setShowModal(false)} 
          onSuccess={() => { setShowModal(false); fetchMods(); }} 
        />
      )}
    </div>
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

  const isAdmin = user.guildRoles?.some((r: string) => ['Admin','Administrator','Owner','Founder','Co-Founder'].includes(r));
  const isModder = user.guildRoles?.some((r: string) => ['Modder','Verified Modder','Verified','Trusted Modder','Script Maker','Lua Modder','Admin','Administrator','Owner','Founder','Co-Founder'].includes(r));

  const tabs = [
    { id: 'profile', label: 'Profil',     icon: <User size={13} /> },
    { id: 'license', label: 'Lisensi',    icon: <Key size={13} /> },
    ...(isModder ? [{ id: 'mods',   label: 'Mod Saya',   icon: <Package size={13} /> }] : []),
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
      </div>
    </div>
  );
};

export default UserPanel;