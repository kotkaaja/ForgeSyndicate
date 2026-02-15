// pages/UploadMod.tsx
import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, FileCode, Image, Tag, X, ArrowLeft, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { CATEGORIES, PLATFORMS, PRESET_TAGS, CategoryType, PlatformType } from '../types';

const SESSION_KEY = 'ds_session_id';

// Role check
const UPLOAD_ROLES = ['modder', 'verified modder', 'verified', 'trusted modder',
                      'admin', 'administrator', 'owner', 'founder', 'co-founder', 'script maker', 'lua modder'];
const canUpload = (roles: string[]) =>
  roles.some(r => UPLOAD_ROLES.includes(r.toLowerCase()));

// ─── Upload to Storage ────────────────────────────────────────────────────────
async function uploadToStorage(file: File, bucket: string, folder: string): Promise<string> {
  const safe = (file.name.split('/').pop() ?? file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${Date.now()}_${safe}`;
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const UploadMod: React.FC = () => {
  const { user }      = useAuth();
  const { showToast } = useToast();
  const navigate      = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [uploadedModId, setUploadedModId] = useState('');

  // Form state
  const [title, setTitle]           = useState('');
  const [description, setDesc]      = useState('');
  const [category, setCategory]     = useState<CategoryType>('Moonloader');
  const [platform, setPlatform]     = useState<PlatformType>('PC');
  const [version, setVersion]       = useState('1.0.0');
  const [tags, setTags]             = useState<string[]>([]);
  const [customTag, setCustomTag]   = useState('');
  const [downloadUrl, setDlUrl]     = useState('');
  const [imageUrl, setImgUrl]       = useState('');
  const [mediaUrl, setMediaUrl]     = useState('');

  // File upload state
  const [imgFile, setImgFile]       = useState<File | null>(null);
  const [modFile, setModFile]       = useState<File | null>(null);
  const [imgUploading, setImgUpl]   = useState(false);
  const [modUploading, setModUpl]   = useState(false);
  const [imgPreview, setImgPreview] = useState('');

  const imgRef = useRef<HTMLInputElement>(null);
  const modRef = useRef<HTMLInputElement>(null);

  // Cek akses
  if (!user) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center space-y-4">
        <AlertTriangle size={40} className="text-yellow-500 mx-auto"/>
        <p className="text-zinc-400">Kamu harus <Link to="/login" className="text-green-400 underline">login</Link> dulu.</p>
      </div>
    </div>
  );

  if (!canUpload(user.guildRoles)) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center space-y-3 max-w-sm px-4">
        <AlertTriangle size={40} className="text-yellow-500 mx-auto"/>
        <h2 className="text-white font-black text-lg">Akses Ditolak</h2>
        <p className="text-zinc-500 text-sm">Kamu butuh role <span className="text-green-400 font-bold">Modder</span> untuk bisa upload mod.</p>
        <p className="text-zinc-700 text-xs">Hubungi admin di Discord untuk request role Modder.</p>
        <Link to="/mods" className="inline-block mt-2 text-sm text-zinc-500 hover:text-white underline">← Kembali ke Gudang Mod</Link>
      </div>
    </div>
  );

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleImgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setImgFile(f); setImgUpl(true);
    setImgPreview(URL.createObjectURL(f));
    try {
      const url = await uploadToStorage(f, 'mod-images', 'thumbnails');
      setImgUrl(url); showToast('Gambar diupload!');
    } catch (err: any) { showToast('Gagal upload gambar: ' + err.message, 'error'); }
    finally { setImgUpl(false); }
  };

  const handleModFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setModFile(f); setModUpl(true);
    try {
      const url = await uploadToStorage(f, 'mod-files', 'user-uploads');
      setDlUrl(url); showToast('File mod diupload!');
    } catch (err: any) { showToast('Gagal upload file: ' + err.message, 'error'); }
    finally { setModUpl(false); }
  };

  const toggleTag = (tag: string) =>
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const addCustomTag = () => {
    if (!customTag.trim() || tags.includes(customTag.trim())) return;
    setTags(prev => [...prev, customTag.trim()]); setCustomTag('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadUrl) { showToast('Upload file mod dulu!', 'error'); return; }

    setSubmitting(true);
    try {
      const sessionId = localStorage.getItem(SESSION_KEY);
      if (!sessionId) { showToast('Session expired, login ulang', 'error'); return; }

      const res  = await fetch('/api/mods/upload', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId, title, description, category, platform,
          version, tags, downloadUrl, imageUrl, mediaUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Upload gagal', 'error'); return; }

      setSuccess(true); setUploadedModId(data.mod?.id || '');
      showToast(data.message || 'Mod berhasil diupload! 🎉');
    } catch { showToast('Terjadi error, coba lagi', 'error'); }
    finally { setSubmitting(false); }
  };

  // ── Success screen ────────────────────────────────────────────────────────────
  if (success) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="text-center space-y-5 max-w-sm">
        <div className="w-20 h-20 bg-green-900/25 border border-green-800/40 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle size={40} className="text-green-500"/>
        </div>
        <h2 className="text-white font-black text-xl">Mod Berhasil Diupload!</h2>
        <p className="text-zinc-500 text-sm">
          Modmu sudah masuk ke database. {!['admin','administrator','owner','founder','co-founder'].some(r =>
            user.guildRoles.map(x => x.toLowerCase()).includes(r)
          ) && 'Admin akan mereview dan mengapprove modmu.'}
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/mods"
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors">
            Ke Gudang Mod
          </Link>
          <button onClick={() => { setSuccess(false); setTitle(''); setDesc(''); setDlUrl(''); setImgUrl(''); setTags([]); }}
            className="bg-green-700 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors">
            Upload Lagi
          </button>
        </div>
        {uploadedModId && (
          <Link to={`/mod/${uploadedModId}`} className="text-zinc-600 text-xs underline hover:text-zinc-400">
            Lihat mod →
          </Link>
        )}
      </div>
    </div>
  );

  // ── Form ──────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-16">
      <div className="border-b border-zinc-800/60 bg-[#0d0d0d] px-4 py-5">
        <div className="max-w-2xl mx-auto">
          <Link to="/mods" className="text-zinc-600 hover:text-white flex items-center gap-1.5 text-xs mb-3 transition-colors">
            <ArrowLeft size={13}/> Kembali
          </Link>
          <h1 className="text-xl font-black tracking-tight">UPLOAD MOD</h1>
          <p className="text-zinc-600 text-xs mt-0.5">Share mod kamu ke komunitas</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Judul Mod *</label>
              <input required type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Contoh: ESP Player Detection Script"
                className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-2.5 rounded-xl text-sm focus:border-green-700 outline-none transition-colors"/>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Versi</label>
              <input type="text" value={version} onChange={e => setVersion(e.target.value)}
                placeholder="1.0.0"
                className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-2.5 rounded-xl text-sm focus:border-green-700 outline-none transition-colors"/>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Deskripsi *</label>
            <textarea required rows={4} value={description} onChange={e => setDesc(e.target.value)}
              placeholder="Jelaskan fitur mod..."
              className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-2.5 rounded-xl text-sm focus:border-green-700 outline-none transition-colors resize-none"/>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Kategori</label>
              <select value={category} onChange={e => setCategory(e.target.value as CategoryType)}
                className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-2.5 rounded-xl text-sm outline-none">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Platform</label>
              <div className="flex gap-4 py-2.5">
                {PLATFORMS.map(p => (
                  <label key={p} className="flex items-center gap-2 text-zinc-300 text-sm cursor-pointer">
                    <input type="radio" checked={platform === p} onChange={() => setPlatform(p as PlatformType)} className="accent-green-500"/>
                    {p}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <Tag size={10}/> Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_TAGS.map(tag => (
                <button key={tag} type="button" onClick={() => toggleTag(tag)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    tags.includes(tag)
                      ? 'bg-green-800/60 border border-green-600/60 text-green-300'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white'}`}>
                  {tag}
                </button>
              ))}
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 bg-zinc-800 text-zinc-300 text-xs px-2.5 py-1 rounded-lg">
                    {tag}
                    <button type="button" onClick={() => toggleTag(tag)}><X size={10} className="text-zinc-500 hover:text-red-400"/></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input value={customTag} onChange={e => setCustomTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                placeholder="Tag custom..."
                className="flex-1 bg-zinc-900 border border-zinc-800 text-white px-3 py-2 rounded-xl text-xs outline-none"/>
              <button type="button" onClick={addCustomTag}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-xl text-xs font-bold">+ Add</button>
            </div>
          </div>

          <div className="border-t border-zinc-800/60 pt-6 space-y-5">
            <div>
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Image size={10}/> Thumbnail <span className="text-zinc-700 font-normal normal-case">(opsional)</span>
              </label>
              <input ref={imgRef} type="file" accept="image/*" onChange={handleImgFile} className="hidden"/>
              {imgPreview ? (
                <div className="relative rounded-xl overflow-hidden h-36 bg-zinc-900 border border-zinc-800">
                  <img src={imgPreview} className="w-full h-full object-cover" alt="preview"/>
                  <button type="button" onClick={() => { setImgUrl(''); setImgFile(null); setImgPreview(''); }}
                    className="absolute top-2 right-2 bg-black/70 text-red-400 rounded-lg p-1.5 hover:bg-red-900/50">
                    <X size={14}/>
                  </button>
                  {imgUploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 size={24} className="animate-spin text-white"/>
                    </div>
                  )}
                </div>
              ) : (
                <button type="button" onClick={() => imgRef.current?.click()} disabled={imgUploading}
                  className="w-full border-2 border-dashed border-zinc-800 hover:border-green-700 text-zinc-600 hover:text-green-400 py-8 rounded-xl text-sm transition-all flex flex-col items-center gap-2 bg-zinc-900/20">
                  {imgUploading ? <><Loader2 size={18} className="animate-spin"/> Mengupload...</> : <><Image size={18}/> Upload Thumbnail</>}
                </button>
              )}
              <div className="mt-2">
                <input type="url" placeholder="Atau paste URL gambar..." value={imageUrl}
                  onChange={e => { setImgUrl(e.target.value); setImgPreview(e.target.value); }}
                  className="w-full bg-zinc-900/50 border border-zinc-800/60 text-zinc-400 px-3 py-2 rounded-xl text-xs outline-none placeholder:text-zinc-700"/>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <FileCode size={10}/> File Mod *
              </label>
              <input ref={modRef} type="file" onChange={handleModFile} className="hidden"/>
              <button type="button" onClick={() => modRef.current?.click()} disabled={modUploading}
                className={`w-full border-2 border-dashed py-8 rounded-xl text-sm transition-all flex flex-col items-center gap-2 ${
                  downloadUrl
                    ? 'border-green-700/60 bg-green-900/10 text-green-400'
                    : 'border-zinc-800 hover:border-green-700 text-zinc-600 hover:text-green-400 bg-zinc-900/20'}`}>
                {modUploading ? <><Loader2 size={18} className="animate-spin"/> Mengupload...</>
                  : downloadUrl ? <><FileCode size={18}/> {modFile?.name || 'File siap'} ✓</>
                  : <><Upload size={18}/> Upload File Mod (.lua, .cs, .zip, dll)</>}
              </button>
              <div className="mt-2">
                <input type="url" placeholder="Atau paste URL download langsung..." value={downloadUrl}
                  onChange={e => setDlUrl(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800/60 text-zinc-400 px-3 py-2 rounded-xl text-xs outline-none placeholder:text-zinc-700"/>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">
                Preview Video <span className="text-zinc-700 font-normal normal-case">(opsional)</span>
              </label>
              <input type="url" placeholder="https://youtube.com/watch?v=..." value={mediaUrl}
                onChange={e => setMediaUrl(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-2.5 rounded-xl text-xs outline-none placeholder:text-zinc-700"/>
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={submitting || modUploading || imgUploading || !downloadUrl}
              className="w-full bg-green-700 hover:bg-green-600 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-900/20">
              {submitting
                ? <><Loader2 size={16} className="animate-spin"/> Mengupload Mod...</>
                : modUploading || imgUploading
                ? <><Loader2 size={16} className="animate-spin"/> Mengupload File...</>
                : !downloadUrl
                ? 'Upload File Mod Dulu'
                : <><Upload size={16}/> PUBLISH MOD</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadMod;