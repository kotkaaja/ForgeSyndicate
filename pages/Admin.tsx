import React, { useState, useRef } from 'react';
import {
  Trash2, Edit, Plus, Save, X, Lock, Unlock, ArrowLeft, Shield,
  Search, ArrowUp, ArrowDown, History, Box, User, ShieldCheck, FileText,
  Image, Upload, Link as LinkIcon, FileCode, Eye, Loader2, Tag, Cpu,
  AlertTriangle, CheckCircle, Clock, Star, ScrollText, RefreshCw,
} from 'lucide-react';
import { getMods, saveMod, deleteMod, checkAdmin } from '../services/data';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { ModItem, CATEGORIES, PLATFORMS, CategoryType, PlatformType, PRESET_TAGS } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ObfHistItem {
  id: string; file_name: string; original_code: string; obfuscated_code: string;
  created_at: string; discord_id: string | null; user_id: string | null;
}
interface CpHistItem {
  id: string; file_name: string; raw_script: string; arch: string;
  discord_id: string | null; created_at: string;
}
interface ReviewItem {
  id: string; mod_id: string; username: string; avatar_url: string;
  rating: number; comment: string | null; discord_id: string | null;
  created_at: string; role: string; is_hidden: boolean;
  mod_title?: string;
}
interface AuditLog {
  id: string; admin_id: string; admin_name: string; action: string;
  target_type: string; target_label: string; created_at: string;
  metadata: any;
}
interface UserMod extends ModItem {
  approvalStatus: 'official' | 'verified' | 'unofficial';
  uploadedBy: string | null;
  uploaderName?: string;
}
type CpError = '' | 'TABLE_MISSING' | 'RLS_BLOCK' | 'UNKNOWN';
type ActiveTab = 'mods' | 'usermods' | 'ratings' | 'obfuscate' | 'compiler' | 'audit';

// ─── Role Helpers ──────────────────────────────────────────────────────────────
const ADMIN_ROLES = ['admin', 'administrator', 'owner', 'founder', 'co-founder'];
const STAFF_ROLES = [...ADMIN_ROLES, 'moderator', 'developer'];
const isAdmin  = (r: string[]) => r.some(x => ADMIN_ROLES.includes(x.toLowerCase()));
const isStaff  = (r: string[]) => r.some(x => STAFF_ROLES.includes(x.toLowerCase()));

// ─── Upload Helper ─────────────────────────────────────────────────────────────
async function uploadFile(file: File, bucket: string, folder: string) {
  const safe = (file.name.split('/').pop() ?? file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
  const { data, error } = await supabase.storage.from(bucket)
    .upload(`${folder}/${safe}`, file, { cacheControl: '3600', upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;
}

// ─── Small Components ──────────────────────────────────────────────────────────
const TableLoader = () => <div className="py-12 flex items-center justify-center gap-2 text-zinc-600 text-xs"><Loader2 size={14} className="animate-spin"/> Memuat...</div>;
const TableEmpty  = ({ msg }: { msg: string }) => <div className="py-12 text-center text-zinc-700 text-sm">{msg}</div>;
const ErrBox      = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="py-12 text-center space-y-2">
    <AlertTriangle size={24} className="text-yellow-600 mx-auto"/>
    <p className="text-zinc-400 text-sm font-bold">{title}</p>
    {hint && <p className="text-zinc-700 text-xs max-w-sm mx-auto">{hint}</p>}
  </div>
);
const ApprovalBadge = ({ status }: { status: string }) => {
  if (status === 'official') return <span className="text-[9px] font-black px-2 py-0.5 rounded bg-yellow-900/25 text-yellow-400 border border-yellow-800/40">⭐ OFFICIAL</span>;
  if (status === 'verified') return <span className="text-[9px] font-black px-2 py-0.5 rounded bg-blue-900/25 text-blue-400 border border-blue-800/40">✓ VERIFIED</span>;
  return <span className="text-[9px] font-black px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">UNOFFICIAL</span>;
};

// ─── Image Upload ──────────────────────────────────────────────────────────────
const ImgField: React.FC<{ value: string; onChange: (u: string) => void }> = ({ value, onChange }) => {
  const [mode, setMode]   = useState<'url'|'upload'>('url');
  const [busy, setBusy]   = useState(false);
  const [prev, setPrev]   = useState(value || '');
  const ref               = useRef<HTMLInputElement>(null);
  const { showToast }     = useToast();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return; setBusy(true);
    try { const u = await uploadFile(f,'mod-images','thumbnails'); setPrev(u); onChange(u); showToast('✓ Gambar diupload'); }
    catch(e:any){ showToast(e.message,'error'); } finally{ setBusy(false); }
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1"><Image size={10}/> Gambar</label>
        <div className="flex gap-1">
          {(['url','upload'] as const).map(m=>(
            <button key={m} type="button" onClick={()=>setMode(m)}
              className={`text-[10px] px-2 py-0.5 rounded ${mode===m?'bg-zinc-700 text-white':'text-zinc-600 hover:text-white'}`}>
              {m==='url'?<><LinkIcon size={8} className="inline mr-0.5"/>URL</>:<><Upload size={8} className="inline mr-0.5"/>Upload</>}
            </button>
          ))}
        </div>
      </div>
      {mode==='url'
        ? <input type="url" placeholder="https://..." value={value} onChange={e=>{onChange(e.target.value);setPrev(e.target.value);}}
            className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm focus:border-green-700 outline-none"/>
        : (<><input ref={ref} type="file" accept="image/*" onChange={onFile} className="hidden"/>
          <button type="button" onClick={()=>ref.current?.click()} disabled={busy}
            className="w-full border-2 border-dashed border-zinc-800 hover:border-green-700 text-zinc-500 hover:text-green-400 py-3 rounded-lg text-xs flex items-center justify-center gap-2 bg-zinc-900/40">
            {busy?<><Loader2 size={12} className="animate-spin"/>Mengupload...</>:<><Upload size={12}/>PNG/JPG/WEBP</>}
          </button></>)}
      {prev && (<div className="relative rounded-lg overflow-hidden border border-zinc-800 h-20 bg-black">
        <img src={prev} className="w-full h-full object-cover opacity-70" onError={()=>setPrev('')} alt=""/>
        <button type="button" onClick={()=>{onChange('');setPrev('');}} className="absolute top-1 right-1 bg-black/70 text-red-400 rounded p-0.5"><X size={12}/></button>
      </div>)}
    </div>
  );
};

// ─── File Upload ───────────────────────────────────────────────────────────────
const FileField: React.FC<{ value: string; onChange: (u: string) => void }> = ({ value, onChange }) => {
  const [mode, setMode] = useState<'url'|'upload'>('url');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const ref             = useRef<HTMLInputElement>(null);
  const { showToast }   = useToast();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return; setBusy(true);
    try { const u = await uploadFile(f,'mod-files','scripts'); onChange(u); setName(f.name); showToast('✓ File diupload'); }
    catch(e:any){ showToast(e.message,'error'); } finally{ setBusy(false); }
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1"><FileCode size={10}/> File Mod <span className="text-red-500">*</span></label>
        <div className="flex gap-1">
          {(['url','upload'] as const).map(m=>(
            <button key={m} type="button" onClick={()=>setMode(m)}
              className={`text-[10px] px-2 py-0.5 rounded ${mode===m?'bg-zinc-700 text-white':'text-zinc-600 hover:text-white'}`}>
              {m==='url'?<><LinkIcon size={8} className="inline mr-0.5"/>URL</>:<><Upload size={8} className="inline mr-0.5"/>Upload</>}
            </button>
          ))}
        </div>
      </div>
      {mode==='url'
        ? <input type="url" required placeholder="https://..." value={value} onChange={e=>onChange(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm focus:border-green-700 outline-none"/>
        : (<><input ref={ref} type="file" onChange={onFile} className="hidden"/>
          <button type="button" onClick={()=>ref.current?.click()} disabled={busy}
            className="w-full border-2 border-dashed border-zinc-800 hover:border-green-700 text-zinc-500 hover:text-green-400 py-3 rounded-lg text-xs flex items-center justify-center gap-2 bg-zinc-900/40">
            {busy?<><Loader2 size={12} className="animate-spin"/>Mengupload...</>
              :name?<><FileCode size={12} className="text-green-400"/><span className="text-green-400 truncate max-w-xs">{name}</span></>
              :<><Upload size={12}/>Upload .lua/.cs/.zip</>}
          </button></>)}
    </div>
  );
};

// ─── Tag Selector ──────────────────────────────────────────────────────────────
const TagSel: React.FC<{ value: string[]; onChange: (t: string[]) => void }> = ({ value, onChange }) => {
  const [c, setC] = useState('');
  const tog = (t: string) => onChange(value.includes(t)?value.filter(x=>x!==t):[...value,t]);
  const add = () => { if(!c.trim()||value.includes(c.trim()))return; onChange([...value,c.trim()]); setC(''); };
  return (
    <div className="space-y-2">
      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1"><Tag size={10}/> Tags</label>
      <div className="flex flex-wrap gap-1.5">
        {PRESET_TAGS.map(tag=>(
          <button key={tag} type="button" onClick={()=>tog(tag)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${value.includes(tag)?'bg-green-800/60 border border-green-600/60 text-green-300':'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white'}`}>
            {tag}
          </button>
        ))}
      </div>
      {value.length>0&&<div className="flex flex-wrap gap-1">{value.map(t=>(
        <span key={t} className="flex items-center gap-1 bg-zinc-800 text-zinc-300 text-xs px-2 py-0.5 rounded">
          {t}<button type="button" onClick={()=>tog(t)}><X size={9} className="text-zinc-500 hover:text-red-400"/></button>
        </span>
      ))}</div>}
      <div className="flex gap-2">
        <input value={c} onChange={e=>setC(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),add())}
          placeholder="Custom tag..." className="flex-1 bg-zinc-950 border border-zinc-800 text-white px-3 py-1.5 rounded-lg text-xs outline-none"/>
        <button type="button" onClick={add} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-bold">+Add</button>
      </div>
    </div>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const Admin: React.FC = () => {
  const { showToast } = useToast();
  const { user }      = useAuth();

  const [authed, setAuthed]     = useState(false);
  const [pwd, setPwd]           = useState('');
  const [pwdErr, setPwdErr]     = useState('');
  const [tab, setTab]           = useState<ActiveTab>('mods');

  // Mods (admin katalog)
  const [mods, setMods]         = useState<ModItem[]>([]);
  const [filtered, setFiltered] = useState<ModItem[]>([]);
  const [search, setSearch]     = useState('');
  const [editing, setEditing]   = useState(false);
  const [dirty, setDirty]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const emptyMod: ModItem = {
  id:'', title:'', description:'', category:'Moonloader', platform:'PC',
  imageUrl:'', mediaUrl:'', downloadUrl:'', isPremium:false, dateAdded:'',
  author: user?.username||'Admin', tags:[], 
  created_at: new Date().toISOString(),
};
  const [form, setForm]         = useState<ModItem>(emptyMod);

  // User mods (semua mod yang diupload oleh user modder)
  const [userMods, setUserMods]   = useState<UserMod[]>([]);
  const [umLoading, setUmLoading] = useState(false);
  const [umSearch, setUmSearch]   = useState('');
  const [umFilter, setUmFilter]   = useState<'all'|'official'|'verified'|'unofficial'>('all');

  // Ratings
  const [reviews, setReviews]     = useState<ReviewItem[]>([]);
  const [revLoading, setRevLoad]  = useState(false);
  const [revSearch, setRevSearch] = useState('');

  // Obfuscate history
  const [obfItems, setObfItems]   = useState<ObfHistItem[]>([]);
  const [obfLoad, setObfLoad]     = useState(false);

  // Compile history
  const [cpItems, setCpItems]     = useState<CpHistItem[]>([]);
  const [cpLoad, setCpLoad]       = useState(false);
  const [cpErr, setCpErr]         = useState<CpError>('');

  // Audit log
  const [logs, setLogs]           = useState<AuditLog[]>([]);
  const [logLoad, setLogLoad]     = useState(false);

  // Akses
  const isPwdAdmin  = localStorage.getItem('forge_role') === 'ADMIN';
  const isDscAdmin  = user ? isAdmin(user.guildRoles)  : false;
  const isDscStaff  = user ? isStaff(user.guildRoles)  : false;
  const canHistory  = isPwdAdmin || isDscAdmin;

  // ── Auth ──────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (isPwdAdmin || isDscStaff) setAuthed(true);
  }, [user]); // eslint-disable-line

  React.useEffect(() => {
    if (!authed) return;
    if (tab === 'mods')       loadMods();
    if (tab === 'usermods')   loadUserMods();
    if (tab === 'ratings')    loadReviews();
    if (tab === 'obfuscate' && canHistory) loadObf();
    if (tab === 'compiler'  && canHistory) loadCp();
    if (tab === 'audit'     && canHistory) loadAudit();
  }, [authed, tab]); // eslint-disable-line

  // ── Mods ────────────────────────────────────────────────────────────────────
  const loadMods = async () => {
    const data = await getMods(); setMods(data); setFiltered(data); setDirty(false);
  };
  React.useEffect(()=>{
    const q = search.toLowerCase();
    setFiltered(search ? mods.filter(m=>m.title.toLowerCase().includes(q)||m.category.toLowerCase().includes(q)) : mods);
  },[search,mods]);
  const moveRow = (i:number, dir:'up'|'down') => {
    if(search)return; const arr=[...mods]; const to=dir==='up'?i-1:i+1;
    if(to<0||to>=arr.length)return; [arr[i],arr[to]]=[arr[to],arr[i]]; setMods(arr); setFiltered(arr); setDirty(true);
  };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { const it={...form}; if(!it.id) delete(it as any).id; await saveMod(it); setEditing(false); setForm(emptyMod); await loadMods(); showToast('✓ Mod disimpan'); }
    catch { showToast('Gagal simpan','error'); } finally{ setSaving(false); }
  };
  const handleDelete = async (id:string) => {
    if(!confirm('Hapus mod ini?'))return;
    await deleteMod(id); await loadMods(); showToast('Mod dihapus','info');
  };

  // ── User Mods ─────────────────────────────────────────────────────────────
  const loadUserMods = async () => {
    setUmLoading(true);
    try {
      const { data } = await supabase.from('mods').select('*')
        .not('uploaded_by','is',null).order('created_at',{ascending:false});
      const mapped: UserMod[] = (data||[]).map(m=>({
      id:m.id, title:m.title, description:m.description, category:m.category,
      platform:m.platform, imageUrl:m.image_url, mediaUrl:m.media_url,
      downloadUrl:m.download_url, isPremium:m.is_premium, dateAdded:m.created_at,
      author:m.author, downloadCount:m.download_count, rating:m.rating,
      ratingCount:m.rating_count, tags:m.tags,
      approvalStatus: m.approval_status, uploadedBy: m.uploaded_by,
      created_at: m.created_at,
    }));
      setUserMods(mapped);
    } catch(err:any){ showToast(err.message,'error'); }
    finally{ setUmLoading(false); }
  };

  const handleApprove = async (modId:string, newStatus:'verified'|'official') => {
    const sessionId = localStorage.getItem('ds_session_id');
    if(!sessionId)return;
    const res  = await fetch('/api/admin?action=manage-mod',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({sessionId, modId, action:'approve', data:{approval_status:newStatus}})});
    if(res.ok){ showToast('Mod diapprove!'); loadUserMods(); }
    else { const d=await res.json(); showToast(d.error,'error'); }
  };

  const handleDeleteUserMod = async (modId:string) => {
    if(!confirm('Hapus mod user ini?'))return;
    const sessionId = localStorage.getItem('ds_session_id');
    if(!sessionId)return;
    const res = await fetch('/api/admin?action=manage-mod',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({sessionId, modId, action:'delete'})});
    if(res.ok){ showToast('Mod dihapus','info'); loadUserMods(); }
    else { const d=await res.json(); showToast(d.error,'error'); }
  };

  const filteredUserMods = (umFilter==='all' ? userMods : userMods.filter(m=>m.approvalStatus===umFilter))
    .filter(m => umSearch ? m.title.toLowerCase().includes(umSearch.toLowerCase()) || m.author.toLowerCase().includes(umSearch.toLowerCase()) : true);

  // ── Reviews / Ratings ────────────────────────────────────────────────────
  const loadReviews = async () => {
    setRevLoad(true);
    try {
      const { data } = await supabase.from('mod_reviews')
        .select('*, mods(title)').order('created_at',{ascending:false});
      const mapped = (data||[]).map((r:any) => ({ ...r, mod_title: r.mods?.title }));
      setReviews(mapped);
    } catch(e:any){ showToast(e.message,'error'); } finally{ setRevLoad(false); }
  };

  const handleDeleteRating = async (ratingId:string, modId:string) => {
    if(!confirm('Hapus rating ini permanen?'))return;
    const sessionId = localStorage.getItem('ds_session_id');
    if(!sessionId){ showToast('Session tidak valid','error'); return; }
    const res = await fetch('/api/admin?action=delete-rating',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({sessionId, ratingId, modId})});
    if(res.ok){ showToast('Rating dihapus, rating mod diperbarui','info'); loadReviews(); }
    else { const d=await res.json(); showToast(d.error,'error'); }
  };

  const filteredReviews = revSearch
    ? reviews.filter(r => r.username.toLowerCase().includes(revSearch.toLowerCase()) || (r.mod_title||'').toLowerCase().includes(revSearch.toLowerCase()))
    : reviews;

  // ── Obfuscate history ────────────────────────────────────────────────────
  const loadObf = async () => {
    setObfLoad(true);
    try {
      const {data,error} = await supabase.from('obfuscation_history').select('*').order('created_at',{ascending:false});
      if(error) throw error; setObfItems(data||[]);
    } catch(e:any){ showToast(e.message,'error'); } finally{ setObfLoad(false); }
  };
  const dlObf = (item:ObfHistItem, type:'raw'|'protected') => {
    const code = type==='raw'?item.original_code:item.obfuscated_code;
    if(!code){ showToast('File kosong','error'); return; }
    const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([code],{type:'text/plain'})),download:`${type==='raw'?'RAW_':'PROTECTED_'}${item.file_name}`});
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };
  const delObf = async (id:string) => {
    if(!confirm('Hapus?'))return;
    const {error}=await supabase.from('obfuscation_history').delete().eq('id',id);
    if(!error){ setObfItems(h=>h.filter(i=>i.id!==id)); showToast('Dihapus','info'); }
  };

  // ── Compile history ───────────────────────────────────────────────────────
  const loadCp = async () => {
    setCpLoad(true); setCpErr('');
    try {
      const {data,error}=await supabase.from('compile_history').select('*').order('created_at',{ascending:false});
      if(error){ if(error.code==='42501'||error.message.includes('permission'))setCpErr('RLS_BLOCK');
                 else if(error.message.includes('does not exist'))setCpErr('TABLE_MISSING'); else throw error; return; }
      setCpItems(data||[]);
    } catch(e:any){ showToast(e.message,'error'); setCpErr('UNKNOWN'); } finally{ setCpLoad(false); }
  };
  const dlCp = (item:CpHistItem) => {
    const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([item.raw_script],{type:'text/plain'})),download:item.file_name});
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };
  const delCp = async (id:string) => {
    if(!confirm('Hapus?'))return;
    const {error}=await supabase.from('compile_history').delete().eq('id',id);
    if(!error){ setCpItems(h=>h.filter(i=>i.id!==id)); showToast('Dihapus','info'); }
  };

  // ── Audit Log ────────────────────────────────────────────────────────────
  const loadAudit = async () => {
    setLogLoad(true);
    try {
      const {data,error}=await supabase.from('admin_logs').select('*').order('created_at',{ascending:false}).limit(100);
      if(error) throw error; setLogs(data||[]);
    } catch(e:any){ showToast(e.message,'error'); } finally{ setLogLoad(false); }
  };

  const ACTION_COLORS: Record<string,string> = {
    delete_mod:    'text-red-400',    upload_mod:   'text-green-400',
    edit_mod:      'text-blue-400',   approve_mod:  'text-emerald-400',
    delete_rating: 'text-orange-400', reject_mod:   'text-red-500',
    verify_modder: 'text-purple-400',
  };

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const ok = await checkAdmin(pwd);
    if(ok){ setAuthed(true); localStorage.setItem('forge_role','ADMIN'); setPwdErr(''); }
    else setPwdErr('Password salah!');
    setSaving(false);
  };

  // ── TAB CONFIG ─────────────────────────────────────────────────────────────
  const tabs = [
    { id:'mods',      label:'KELOLA MODS',        icon:<Box size={11}/>,        always:true },
    { id:'usermods',  label:'MOD USER',            icon:<Upload size={11}/>,     always:true },
    { id:'ratings',   label:'RATING & ULASAN',     icon:<Star size={11}/>,       always:true },
    { id:'obfuscate', label:'HISTORY OBFUSCATE',   icon:<History size={11}/>,    always:false },
    { id:'compiler',  label:'HISTORY COMPILER',    icon:<Cpu size={11}/>,        always:false },
    { id:'audit',     label:'AUDIT LOG',           icon:<ScrollText size={11}/>, always:false },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // LOGIN SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.04)_0%,transparent_70%)]"/>
      <div className="absolute top-4 left-4">
        <Link to="/" className="text-zinc-600 hover:text-white flex items-center gap-1.5 text-xs"><ArrowLeft size={13}/> Kembali</Link>
      </div>
      <div className="relative bg-[#111] p-7 rounded-2xl border border-red-900/25 max-w-xs w-full shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-700 to-transparent rounded-t-2xl"/>
        <Shield size={34} className="text-red-500/80 mx-auto mb-4"/>
        <h2 className="text-base font-black text-white text-center mb-1">Admin Terminal</h2>
        <p className="text-zinc-600 text-xs text-center mb-5">Restricted access</p>
        {!user && (
          <div className="mb-4 bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-500 text-center">
            Punya role admin?{' '}<Link to="/login" className="text-indigo-400 hover:text-indigo-300">Login Discord dulu</Link>
          </div>
        )}
        {user && !isDscStaff && (
          <div className="mb-4 bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-500 text-center">
            Role tidak punya akses. Gunakan password.
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-3">
          <input type="password" value={pwd} onChange={e=>setPwd(e.target.value)} autoFocus
            className="w-full bg-black border border-zinc-800 text-red-400 px-4 py-2.5 rounded-lg text-center font-mono text-sm focus:border-red-700 outline-none"
            placeholder="••••••••"/>
          {pwdErr && <p className="text-red-500 text-xs text-center">{pwdErr}</p>}
          <button type="submit" disabled={saving}
            className="w-full bg-red-900/80 hover:bg-red-800 text-white py-2.5 rounded-lg font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
            {saving?<><Loader2 size={13} className="animate-spin"/>Auth...</>:'UNLOCK TERMINAL'}
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
                {user ? (<>{user.username}
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${canHistory?'bg-red-900/40 text-red-400':'bg-orange-900/40 text-orange-400'}`}>
                    {canHistory?'ADMIN':'MODERATOR'}
                  </span></>) : 'Super User'}
              </p>
            </div>
          </div>
          <button onClick={()=>{localStorage.removeItem('forge_role');setAuthed(false);}}
            className="text-xs text-red-500/60 hover:text-red-400 border border-red-900/25 hover:border-red-900/60 px-3 py-1.5 rounded-lg transition-all">
            LOGOUT
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/60 flex-wrap">
          {tabs.filter(t => t.always || canHistory).map(t => (
            <button key={t.id} onClick={() => setTab(t.id as ActiveTab)}
              className={`px-3 py-2 font-black text-[10px] tracking-wider flex items-center gap-1.5 rounded-lg transition-all ${
                tab===t.id?'bg-zinc-800 text-white shadow':'text-zinc-600 hover:text-zinc-300'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ─── TAB: KELOLA MODS (katalog admin) ──────────────────────── */}
        {tab==='mods' && (
          <div className="animate-in fade-in duration-200">
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" size={13}/>
                <input placeholder="Cari mod..." value={search} onChange={e=>setSearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white pl-10 pr-4 py-2.5 rounded-lg text-sm focus:border-zinc-600 outline-none"/>
              </div>
              <div className="flex gap-2">
                {dirty && (
                  <button onClick={()=>{setDirty(false);showToast('Urutan disimpan!');}}
                    className="bg-yellow-600 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-black text-xs flex items-center gap-1.5 animate-bounce">
                    <Save size={13}/> SAVE ORDER
                  </button>
                )}
                <button onClick={()=>{setForm(emptyMod);setEditing(true);}}
                  className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-black text-xs flex items-center gap-1.5 transition-colors">
                  <Plus size={13}/> TAMBAH MOD
                </button>
              </div>
            </div>
            <div className="bg-[#111] border border-zinc-800/70 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-black/40 text-zinc-600 uppercase text-[9px] tracking-widest border-b border-zinc-800">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center">Urut</th>
                    <th className="px-4 py-3">Nama Mod</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filtered.map((mod,i) => (
                    <tr key={mod.id} className="hover:bg-zinc-800/15">
                      <td className="px-4 py-3 text-center">
                        {!search ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <button onClick={()=>moveRow(i,'up')} disabled={i===0} className="text-zinc-700 hover:text-green-400 disabled:opacity-20"><ArrowUp size={10}/></button>
                            <button onClick={()=>moveRow(i,'down')} disabled={i===mods.length-1} className="text-zinc-700 hover:text-red-400 disabled:opacity-20"><ArrowDown size={10}/></button>
                          </div>
                        ):<span className="text-zinc-700">—</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-sm">{mod.title}
                        {mod.tags&&mod.tags.length>0&&<div className="flex gap-1 mt-1">{mod.tags.slice(0,3).map(t=><span key={t} className="text-[9px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">{t}</span>)}</div>}
                      </td>
                      <td className="px-4 py-3"><span className="text-[10px] bg-zinc-800/80 text-zinc-400 px-2 py-0.5 rounded">{mod.category}</span></td>
                      <td className="px-4 py-3">
                        {mod.isPremium?<span className="text-[9px] bg-yellow-900/25 text-yellow-500 border border-yellow-800/40 px-2 py-0.5 rounded font-black">VIP</span>
                          :<span className="text-[9px] bg-green-900/25 text-green-500 border border-green-800/40 px-2 py-0.5 rounded font-black">Free</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={()=>{setForm(mod);setEditing(true);}} className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg"><Edit size={13}/></button>
                          <button onClick={()=>handleDelete(mod.id)} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg"><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length===0&&<tr><td colSpan={5}><TableEmpty msg="Tidak ada mod."/></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB: MOD USER ──────────────────────────────────────────── */}
        {tab==='usermods' && (
          <div className="animate-in fade-in duration-200">
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" size={13}/>
                <input placeholder="Cari mod atau user..." value={umSearch} onChange={e=>setUmSearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white pl-10 pr-4 py-2.5 rounded-lg text-sm focus:border-zinc-600 outline-none"/>
              </div>
              <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
                {(['all','official','verified','unofficial'] as const).map(f=>(
                  <button key={f} onClick={()=>setUmFilter(f)}
                    className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all ${umFilter===f?'bg-zinc-700 text-white':'text-zinc-600 hover:text-zinc-300'}`}>
                    {f==='all'?`SEMUA (${userMods.length})`:f.toUpperCase()+` (${userMods.filter(m=>m.approvalStatus===f).length})`}
                  </button>
                ))}
              </div>
              <button onClick={loadUserMods} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-600 hover:text-white"><RefreshCw size={13}/></button>
            </div>
            <div className="bg-[#111] border border-zinc-800/70 rounded-xl overflow-hidden">
              {umLoading ? <TableLoader/>
                : filteredUserMods.length===0 ? <TableEmpty msg="Tidak ada mod dari user."/>
                : (
                  <table className="w-full text-left">
                    <thead className="bg-black/40 text-zinc-600 uppercase text-[9px] tracking-widest border-b border-zinc-800">
                      <tr>
                        <th className="px-4 py-3">Mod</th>
                        <th className="px-4 py-3">Uploader</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Waktu</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {filteredUserMods.map(mod => (
                        <tr key={mod.id} className="hover:bg-zinc-800/15">
                          <td className="px-4 py-3">
                            <p className="text-white text-sm font-semibold">{mod.title}</p>
                            <p className="text-zinc-600 text-[10px]">{mod.category}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Link to={`/user/${mod.uploadedBy}`} className="text-blue-400 hover:underline text-xs">
                              {mod.author}
                            </Link>
                          </td>
                          <td className="px-4 py-3"><ApprovalBadge status={mod.approvalStatus||'unofficial'}/></td>
                          <td className="px-4 py-3 text-zinc-600 text-xs">{new Date(mod.dateAdded).toLocaleDateString('id-ID')}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              {mod.approvalStatus==='unofficial' && (
                                <button onClick={()=>handleApprove(mod.id,'verified')}
                                  className="px-2.5 py-1 bg-blue-900/25 hover:bg-blue-700/40 text-blue-400 hover:text-white rounded text-[10px] font-bold border border-blue-900/40 transition-all flex items-center gap-1">
                                  <CheckCircle size={10}/> Approve
                                </button>
                              )}
                              <button onClick={()=>handleDeleteUserMod(mod.id)}
                                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg"><Trash2 size={13}/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
          </div>
        )}

        {/* ─── TAB: RATING & ULASAN ───────────────────────────────────── */}
        {tab==='ratings' && (
          <div className="animate-in fade-in duration-200">
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" size={13}/>
                <input placeholder="Cari username atau nama mod..." value={revSearch} onChange={e=>setRevSearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white pl-10 pr-4 py-2.5 rounded-lg text-sm focus:border-zinc-600 outline-none"/>
              </div>
              <button onClick={loadReviews} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-600 hover:text-white"><RefreshCw size={13}/></button>
            </div>
            <div className="bg-[#111] border border-zinc-800/70 rounded-xl overflow-hidden">
              {revLoading ? <TableLoader/>
                : filteredReviews.length===0 ? <TableEmpty msg="Belum ada ulasan."/>
                : (
                  <table className="w-full text-left">
                    <thead className="bg-black/40 text-zinc-600 uppercase text-[9px] tracking-widest border-b border-zinc-800">
                      <tr>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Mod</th>
                        <th className="px-4 py-3">Rating</th>
                        <th className="px-4 py-3">Komentar</th>
                        <th className="px-4 py-3">Waktu</th>
                        <th className="px-4 py-3 text-right">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {filteredReviews.map(rev => (
                        <tr key={rev.id} className={`hover:bg-zinc-800/15 ${rev.is_hidden?'opacity-40':''}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {rev.avatar_url && <img src={rev.avatar_url} className="w-6 h-6 rounded-full" alt=""/>}
                              <span className="text-zinc-300 text-xs font-semibold">{rev.username}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-zinc-500 text-xs truncate max-w-[140px]">{rev.mod_title||rev.mod_id}</td>
                          <td className="px-4 py-3">
                            <span className="text-yellow-400 text-sm font-black">{'★'.repeat(rev.rating)}</span>
                            <span className="text-zinc-700 text-xs ml-1">({rev.rating}/5)</span>
                          </td>
                          <td className="px-4 py-3 text-zinc-500 text-xs truncate max-w-[180px]">{rev.comment||'—'}</td>
                          <td className="px-4 py-3 text-zinc-700 text-xs">{new Date(rev.created_at).toLocaleDateString('id-ID')}</td>
                          <td className="px-4 py-3 text-right">
                            {canHistory && (
                              <button onClick={()=>handleDeleteRating(rev.id, rev.mod_id)}
                                className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all">
                                <Trash2 size={13}/>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
          </div>
        )}

        {/* ─── TAB: HISTORY OBFUSCATE ─────────────────────────────────── */}
        {tab==='obfuscate' && (
          <div className="animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5"><History size={13}/> Riwayat Lua Shield</h3>
              <button onClick={loadObf} className="text-xs text-zinc-600 hover:text-white underline">Refresh</button>
            </div>
            <div className="bg-[#111] border border-zinc-800/70 rounded-xl overflow-hidden">
              {obfLoad ? <TableLoader/> : obfItems.length===0 ? <TableEmpty msg="Belum ada history."/> : (
                <table className="w-full text-left">
                  <thead className="bg-black/40 text-zinc-600 uppercase text-[9px] tracking-widest border-b border-zinc-800">
                    <tr><th className="px-4 py-3">Waktu</th><th className="px-4 py-3">User</th><th className="px-4 py-3">File</th><th className="px-4 py-3 text-right">Download</th><th className="px-4 py-3 text-right">Del</th></tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {obfItems.map(item=>(
                      <tr key={item.id} className="hover:bg-zinc-800/15">
                        <td className="px-4 py-3 text-zinc-600 text-xs">{new Date(item.created_at).toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3">{(item.discord_id||item.user_id)?<span className="text-green-500 text-xs flex items-center gap-1"><User size={10}/>Member</span>:<span className="text-zinc-600 text-xs flex items-center gap-1"><User size={10}/>Guest</span>}</td>
                        <td className="px-4 py-3 font-mono text-yellow-500/80 text-xs truncate max-w-[180px]">{item.file_name}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button onClick={()=>dlObf(item,'raw')} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 border border-zinc-700"><FileText size={9}/>RAW</button>
                            <button onClick={()=>dlObf(item,'protected')} className="bg-blue-900/25 hover:bg-blue-700 text-blue-400 hover:text-white px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 border border-blue-900/40 transition-all"><ShieldCheck size={9}/>SECURE</button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right"><button onClick={()=>delObf(item.id)} className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg"><Trash2 size={13}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: HISTORY COMPILER ──────────────────────────────────── */}
        {tab==='compiler' && (
          <div className="animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-black text-orange-400 uppercase tracking-widest flex items-center gap-1.5"><Cpu size={13}/> Riwayat LuaJIT</h3>
              <div className="flex items-center gap-3">
                {cpItems.length>0&&<div className="flex gap-3 text-[10px] text-zinc-600">
                  <span><span className="text-white font-bold">{cpItems.length}</span> total</span>
                  <span><span className="text-green-400 font-bold">{cpItems.filter(i=>i.arch==='32').length}</span>×32-bit</span>
                  <span><span className="text-blue-400 font-bold">{cpItems.filter(i=>i.arch==='64').length}</span>×64-bit</span>
                </div>}
                <button onClick={loadCp} className="text-xs text-zinc-600 hover:text-white underline">Refresh</button>
              </div>
            </div>
            <div className="bg-[#111] border border-zinc-800/70 rounded-xl overflow-hidden">
              {cpLoad ? <TableLoader/>
                : cpErr==='TABLE_MISSING' ? <ErrBox title="Tabel belum dibuat" hint="Jalankan DATABASE_v3.sql di Supabase SQL Editor"/>
                : cpErr==='RLS_BLOCK'     ? <ErrBox title="RLS memblokir akses" hint="ALTER TABLE compile_history DISABLE ROW LEVEL SECURITY;"/>
                : cpErr==='UNKNOWN'       ? <ErrBox title="Error tidak diketahui" hint="Cek console browser"/>
                : cpItems.length===0      ? <TableEmpty msg="Belum ada history compile."/>
                : (
                  <table className="w-full text-left">
                    <thead className="bg-black/40 text-zinc-600 uppercase text-[9px] tracking-widest border-b border-zinc-800">
                      <tr><th className="px-4 py-3">Waktu</th><th className="px-4 py-3">User</th><th className="px-4 py-3">File</th><th className="px-4 py-3">Platform</th><th className="px-4 py-3 text-right">DL</th><th className="px-4 py-3 text-right">Del</th></tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {cpItems.map(item=>(
                        <tr key={item.id} className="hover:bg-zinc-800/15">
                          <td className="px-4 py-3 text-zinc-600 text-xs">{new Date(item.created_at).toLocaleString('id-ID')}</td>
                          <td className="px-4 py-3">{item.discord_id?<span className="text-green-500 text-xs flex items-center gap-1"><User size={10}/>Member</span>:<span className="text-zinc-600 text-xs flex items-center gap-1"><User size={10}/>Guest</span>}</td>
                          <td className="px-4 py-3 font-mono text-orange-400/80 text-xs truncate max-w-[160px]">{item.file_name}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${item.arch==='64'?'bg-blue-900/25 text-blue-400 border-blue-900/40':'bg-green-900/25 text-green-400 border-green-900/40'}`}>
                              {item.arch==='64'?'64-bit · Android':'32-bit · PC'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right"><button onClick={()=>dlCp(item)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-orange-400 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 border border-zinc-700 ml-auto transition-colors"><FileText size={9}/>RAW</button></td>
                          <td className="px-4 py-3 text-right"><button onClick={()=>delCp(item.id)} className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg"><Trash2 size={13}/></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
          </div>
        )}

        {/* ─── TAB: AUDIT LOG ─────────────────────────────────────────── */}
        {tab==='audit' && (
          <div className="animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-1.5"><ScrollText size={13}/> Audit Log (100 terbaru)</h3>
              <button onClick={loadAudit} className="text-xs text-zinc-600 hover:text-white underline">Refresh</button>
            </div>
            <div className="bg-[#111] border border-zinc-800/70 rounded-xl overflow-hidden">
              {logLoad ? <TableLoader/> : logs.length===0 ? <TableEmpty msg="Belum ada log."/> : (
                <table className="w-full text-left">
                  <thead className="bg-black/40 text-zinc-600 uppercase text-[9px] tracking-widest border-b border-zinc-800">
                    <tr><th className="px-4 py-3">Waktu</th><th className="px-4 py-3">Admin</th><th className="px-4 py-3">Aksi</th><th className="px-4 py-3">Target</th></tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {logs.map(log=>(
                      <tr key={log.id} className="hover:bg-zinc-800/15">
                        <td className="px-4 py-3 text-zinc-700 text-xs">{new Date(log.created_at).toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3 text-zinc-400 text-xs font-semibold">{log.admin_name}</td>
                        <td className="px-4 py-3">
                          <code className={`text-xs font-mono font-bold ${ACTION_COLORS[log.action]||'text-zinc-400'}`}>
                            {log.action}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 text-xs truncate max-w-[220px]">{log.target_label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL EDIT MOD ─────────────────────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 z-[99] flex items-start justify-center bg-black/95 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#111] border border-zinc-700/70 rounded-2xl max-w-xl w-full p-6 relative shadow-2xl my-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-600 to-transparent rounded-t-2xl"/>
            <button onClick={()=>setEditing(false)} className="absolute top-4 right-4 text-zinc-600 hover:text-white bg-zinc-800 p-1.5 rounded-lg"><X size={13}/></button>
            <h2 className="text-base font-black text-white mb-5 uppercase">{form.id?'✏️ Edit Mod':'➕ Tambah Mod'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Judul *</label>
                  <input required type="text" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm focus:border-green-700 outline-none"/>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Author *</label>
                  <input required type="text" value={form.author} onChange={e=>setForm({...form,author:e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm focus:border-green-700 outline-none"/>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Deskripsi *</label>
                <textarea required rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm focus:border-green-700 outline-none resize-none"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Kategori</label>
                  <select value={form.category} onChange={e=>setForm({...form,category:e.target.value as CategoryType})}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm outline-none">
                    {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Platform</label>
                  <div className="flex gap-3 py-2.5">
                    {PLATFORMS.map(p=>(
                      <label key={p} className="flex items-center gap-1.5 text-zinc-300 text-xs cursor-pointer">
                        <input type="radio" checked={form.platform===p} onChange={()=>setForm({...form,platform:p as PlatformType})} className="accent-green-500"/>
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="border-t border-zinc-800/60 pt-4 space-y-4">
                <ImgField value={form.imageUrl} onChange={u=>setForm({...form,imageUrl:u})}/>
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1 mb-1"><Eye size={9}/> Preview Media</label>
                  <input type="url" placeholder="https://youtube.com/..." value={form.mediaUrl||''} onChange={e=>setForm({...form,mediaUrl:e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm focus:border-green-700 outline-none"/>
                </div>
                <FileField value={form.downloadUrl} onChange={u=>setForm({...form,downloadUrl:u})}/>
              </div>
              <TagSel value={form.tags||[]} onChange={tags=>setForm({...form,tags})}/>
              <div onClick={()=>setForm({...form,isPremium:!form.isPremium})}
                className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center ${form.isPremium?'border-yellow-700/40 bg-yellow-900/10':'border-green-700/40 bg-green-900/10'}`}>
                <div>
                  <span className={`font-black text-sm ${form.isPremium?'text-yellow-500':'text-green-500'}`}>{form.isPremium?'VIP ONLY':'GRATIS'}</span>
                  <p className="text-zinc-600 text-xs mt-0.5">{form.isPremium?'Hanya member VIP':'Semua bisa download'}</p>
                </div>
                {form.isPremium?<Lock size={14} className="text-yellow-500"/>:<Unlock size={14} className="text-green-500"/>}
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-white text-black hover:bg-zinc-100 font-black py-3 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                {saving?<><Loader2 size={13} className="animate-spin text-zinc-600"/>Menyimpan...</>:<><Save size={13}/>SIMPAN MOD</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;