import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Download, Lock, Share2, Calendar, User,
  Monitor, Smartphone, Globe, Star, Layers, Tag,
  Send, MessageSquare, CheckCircle
} from 'lucide-react';
import { getModById, incrementDownload } from '../services/data';
import { supabase } from '../lib/supabase';
import { ModItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import UserProfileCard from '../components/UserProfileCard';

// ── Helpers ───────────────────────────────────────────────────────────────
const getTitleStyle = (title: string) => {
  const s = [
    { gradient: 'from-green-900/80 via-emerald-900/50 to-zinc-900', accent: 'text-green-400',  glow: 'bg-green-500'  },
    { gradient: 'from-indigo-900/80 via-violet-900/50 to-zinc-900', accent: 'text-indigo-400', glow: 'bg-indigo-500' },
    { gradient: 'from-rose-900/80 via-pink-900/50 to-zinc-900',     accent: 'text-rose-400',   glow: 'bg-rose-500'   },
    { gradient: 'from-amber-900/80 via-orange-900/50 to-zinc-900',  accent: 'text-amber-400',  glow: 'bg-amber-500'  },
    { gradient: 'from-cyan-900/80 via-teal-900/50 to-zinc-900',     accent: 'text-cyan-400',   glow: 'bg-cyan-500'   },
    { gradient: 'from-sky-900/80 via-blue-900/50 to-zinc-900',      accent: 'text-sky-400',    glow: 'bg-sky-500'    },
  ];
  return s[title.charCodeAt(0) % s.length];
};

const formatCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

// ── Types ─────────────────────────────────────────────────────────────────
interface Review {
  id:          string;
  discord_id:  string;
  username:    string | null;
  avatar_url:  string | null;
  role:        string | null;
  rating:      number;
  comment:     string | null;
  created_at:  string;
}

// ── Star selector ─────────────────────────────────────────────────────────
const StarSelector: React.FC<{ value: number; onChange: (v: number) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => {
  const [hover, setHover] = useState(0);
  const labels = ['', 'Sangat Buruk 😞', 'Buruk 😐', 'Cukup 🙂', 'Bagus 😊', 'Luar Biasa 🔥'];
  return (
    <div>
      <div className="flex gap-1 mb-1.5">
        {[1,2,3,4,5].map(s => (
          <button key={s} type="button" disabled={disabled}
            onClick={() => onChange(s)}
            onMouseEnter={() => !disabled && setHover(s)}
            onMouseLeave={() => !disabled && setHover(0)}
            className="transition-transform hover:scale-125 disabled:cursor-default">
            <Star size={28} className={`transition-colors ${s <= (hover || value) ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'}`} />
          </button>
        ))}
      </div>
      {(hover || value) > 0 && <p className="text-xs text-zinc-500 h-4">{labels[hover || value]}</p>}
    </div>
  );
};

// ── Tier badge colors ─────────────────────────────────────────────────────
const tierBadge: Record<string, string> = {
  VIP:   'bg-yellow-500/15 text-yellow-400 border-yellow-600/30',
  BASIC: 'bg-blue-500/15 text-blue-400 border-blue-600/30',
};

// ── Review card ───────────────────────────────────────────────────────────
const ReviewCard: React.FC<{ review: Review }> = ({ review }) => {
  const badge = tierBadge[(review.role || '').toUpperCase()] ?? 'bg-zinc-700/30 text-zinc-500 border-zinc-600/30';
  const initials = (review.username || 'U').slice(0,2).toUpperCase();

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
      <div className="flex items-start gap-3 mb-2">
        <div className="flex-shrink-0">
          {review.avatar_url ? (
            <img src={review.avatar_url} alt={review.username || ''}
              className="w-9 h-9 rounded-xl object-cover border border-zinc-700" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 font-bold text-sm">
              {initials}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-zinc-200 truncate">{review.username || 'Member'}</p>
            {review.role && (
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${badge}`}>
                {review.role}
              </span>
            )}
          </div>
          <p className="text-[10px] text-zinc-600">
            {new Date(review.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}
          </p>
        </div>
        <div className="flex gap-0.5 flex-shrink-0 pt-0.5">
          {[1,2,3,4,5].map(s => (
            <Star key={s} size={11} className={s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'} />
          ))}
        </div>
      </div>
      {review.comment && (
        <p className="text-zinc-400 text-sm leading-relaxed pl-12">{review.comment}</p>
      )}
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────
const ModDetail: React.FC = () => {
  const { id }      = useParams<{ id: string }>();
  const location    = useLocation();
  const { user, isVIP, login } = useAuth();

  const [mod, setMod]           = useState<ModItem | null>(null);
  const [loading, setLoading]   = useState(true);
  const [imgError, setImgError] = useState(false);

  const [reviews, setReviews]           = useState<Review[]>([]);
  const [revLoading, setRevLoading]     = useState(false);
  const [myRating, setMyRating]         = useState(0);
  const [myComment, setMyComment]       = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [submitError, setSubmitError]   = useState('');
  const [refreshKey, setRefreshKey]     = useState(0);

  // Logged in = BASIC or VIP
  const isLoggedIn  = !!user;
  const canDownload = !mod?.isPremium || isVIP;
  const canReview   = isLoggedIn;

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true); setImgError(false);
      setMod((await getModById(id)) || null);
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setRevLoading(true);
      const { data } = await supabase
        .from('mod_reviews').select('*').eq('mod_id', id).order('created_at', { ascending: false });
      setReviews(data || []);
      setRevLoading(false);
    })();
  }, [id, refreshKey]);

  const avgRating   = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : mod?.rating;
  const ratingCount = reviews.length || mod?.ratingCount || 0;

  const getEmbedUrl = (url?: string) => {
    if (!url?.trim()) return null;
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const vid = url.includes('v=') ? url.split('v=')[1]?.split('&')[0] : url.split('/').pop();
      return `https://www.youtube.com/embed/${vid}`;
    }
    if (url.includes('tiktok.com')) {
      const m = url.match(/\/video\/(\d+)/);
      if (m?.[1]) return `https://www.tiktok.com/embed/v2/${m[1]}`;
    }
    return null;
  };

  const handleDownload = async () => {
    if (mod?.id) await incrementDownload(mod.id, user?.discordId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myRating) { setSubmitError('Pilih bintang dulu.'); return; }
    if (!id || !user) return;
    setSubmitting(true); setSubmitError('');
    try {
      const { error } = await supabase.from('mod_reviews').upsert({
        mod_id:     id,
        discord_id: user.discordId,
        username:   user.username,
        avatar_url: user.avatarUrl,
        role:       user.tier,
        rating:     myRating,
        comment:    myComment.trim() || null,
      }, { onConflict: 'mod_id,discord_id' });
      if (error) throw error;
      setSubmitted(true); setMyRating(0); setMyComment('');
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      setSubmitError('Gagal: ' + err.message);
    } finally { setSubmitting(false); }
  };

  // ── Loading / 404 ─────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!mod) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-2">404 — Mod Not Found</h2>
        <Link to="/mods" className="text-green-500 hover:underline text-sm">Kembali ke Gudang Mod</Link>
      </div>
    </div>
  );

  const embedUrl = getEmbedUrl(mod.mediaUrl);
  const hasImage = !!(mod.imageUrl?.trim()) && !imgError;
  const style    = getTitleStyle(mod.title);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">

      {/* Hero */}
      <div className="relative h-52 md:h-64 w-full overflow-hidden">
        {hasImage ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10" />
            <img src={mod.imageUrl} alt={mod.title}
              className="w-full h-full object-cover opacity-40 blur-sm scale-105"
              onError={() => setImgError(true)} />
          </>
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${style.gradient} relative overflow-hidden`}>
            <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
            <div className={`absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl opacity-20 ${style.glow}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent z-10" />
          </div>
        )}
        <div className="absolute top-4 left-4 z-20">
          <Link to="/mods" className="flex items-center gap-1.5 text-zinc-300 hover:text-white bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10 text-sm transition-colors">
            <ArrowLeft size={15} /> Kembali
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-12 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT */}
          <div className="lg:col-span-2 space-y-5">
            {/* Media + info */}
            <div className="bg-[#141414] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl">
              {embedUrl ? (
                <div className="aspect-video bg-black">
                  <iframe src={embedUrl} title="Video" className="w-full h-full" allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                </div>
              ) : hasImage ? (
                <div className="aspect-video bg-zinc-900 overflow-hidden">
                  <img src={mod.imageUrl} alt={mod.title} className="w-full h-full object-cover" onError={() => setImgError(true)} />
                </div>
              ) : (
                <div className={`aspect-video bg-gradient-to-br ${style.gradient} flex flex-col items-center justify-center relative overflow-hidden`}>
                  <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
                  <div className={`absolute -top-12 -right-12 w-56 h-56 rounded-full blur-3xl opacity-20 ${style.glow}`} />
                  <Layers size={36} className={`mb-4 opacity-50 ${style.accent}`} />
                  <p className={`font-heading font-black text-2xl md:text-3xl text-center uppercase tracking-wide px-8 leading-tight ${style.accent}`}>{mod.title}</p>
                  <p className="text-zinc-500 text-xs mt-3 uppercase tracking-widest">{mod.category}</p>
                </div>
              )}

              <div className="p-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="bg-green-900/30 text-green-500 border border-green-800/50 px-2.5 py-0.5 rounded text-xs font-bold uppercase">{mod.category}</span>
                  {mod.isPremium && (
                    <span className="bg-yellow-600/15 text-yellow-500 border border-yellow-600/40 px-2.5 py-0.5 rounded text-xs font-bold flex items-center gap-1"><Lock size={10}/> Premium</span>
                  )}
                  {mod.tags?.map(t => (
                    <span key={t} className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-[10px] flex items-center gap-1"><Tag size={9}/>{t}</span>
                  ))}
                </div>

                <h1 className="font-heading text-3xl md:text-4xl font-black text-white mb-3 leading-tight tracking-tight">{mod.title}</h1>

                {avgRating !== undefined && ratingCount > 0 && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => <Star key={s} size={14} className={s <= Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'} />)}
                    </div>
                    <span className="text-sm text-zinc-300 font-semibold">{avgRating.toFixed(1)}</span>
                    <span className="text-xs text-zinc-600">({ratingCount} ulasan)</span>
                  </div>
                )}

                {mod.downloadCount !== undefined && (
                  <p className="text-xs text-zinc-600 mb-4 flex items-center gap-1.5">
                    <Download size={11}/> <span className="text-zinc-400 font-semibold">{formatCount(mod.downloadCount)}</span> kali didownload
                  </p>
                )}

                <div className="border-t border-zinc-800/60 pt-5 text-zinc-400 text-sm leading-relaxed">{mod.description}</div>
              </div>
            </div>

            {/* Reviews */}
            <div className="bg-[#141414] border border-zinc-800/80 rounded-2xl p-6 shadow-xl">
              <h2 className="text-sm font-black text-white uppercase tracking-widest mb-5 flex items-center gap-2">
                <MessageSquare size={16} className="text-green-500"/> Ulasan & Rating
                {ratingCount > 0 && <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full font-normal normal-case">{ratingCount}</span>}
              </h2>

              {canReview ? (
                submitted ? (
                  <div className="bg-green-900/20 border border-green-800/40 rounded-xl p-4 flex items-center gap-3 mb-5 text-green-400 text-sm">
                    <CheckCircle size={17}/> Review berhasil dikirim!
                    <button onClick={() => setSubmitted(false)} className="ml-auto text-xs text-zinc-500 hover:text-white underline">Tulis lagi</button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5 mb-5 space-y-4">
                    {/* Profil preview */}
                    <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800/50">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-lg object-cover border border-zinc-700" />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs font-bold">
                          {(user?.username || 'U').slice(0,2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-zinc-300 font-semibold">{user?.username}</p>
                        <p className="text-[10px] text-zinc-600">Review akan tampil atas nama ini</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-zinc-500 mb-2">Rating <span className="text-red-500">*</span></p>
                      <StarSelector value={myRating} onChange={setMyRating} disabled={submitting} />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-2">Komentar <span className="text-zinc-700">(opsional)</span></p>
                      <textarea rows={3} value={myComment} onChange={e => setMyComment(e.target.value)} disabled={submitting}
                        placeholder="Bagikan pengalamanmu..."
                        className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2.5 rounded-lg text-sm focus:border-green-700 outline-none transition-colors resize-none placeholder:text-zinc-700" />
                    </div>
                    {submitError && <p className="text-red-400 text-xs">{submitError}</p>}
                    <button type="submit" disabled={submitting || !myRating}
                      className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors">
                      {submitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Mengirim...</> : <><Send size={13}/> Kirim Ulasan</>}
                    </button>
                  </form>
                )
              ) : (
                <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-xl p-5 mb-5 text-center">
                  <div className="w-12 h-12 bg-[#5865F2]/10 border border-[#5865F2]/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg viewBox="0 0 24 24" fill="#5865F2" className="w-6 h-6">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.042.032.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                    </svg>
                  </div>
                  <p className="text-zinc-400 text-sm mb-3">Login Discord untuk memberi rating & komentar.</p>
                  <button onClick={login}
                    className="inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors">
                    Login dengan Discord
                  </button>
                </div>
              )}

              {revLoading ? (
                <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin"/></div>
              ) : reviews.length > 0 ? (
                <div className="space-y-3">{reviews.map(r => <ReviewCard key={r.id} review={r} />)}</div>
              ) : (
                <div className="text-center py-8 text-zinc-700 text-sm">Belum ada ulasan. Jadilah yang pertama!</div>
              )}
            </div>
          </div>

          {/* RIGHT sidebar */}
          <div className="space-y-0">
            {/* Profile card kalau sudah login */}
            {isLoggedIn && <UserProfileCard />}

            <div className="bg-[#141414] border border-zinc-800/80 p-5 rounded-2xl sticky top-20 shadow-xl">
              <h3 className="text-white font-heading font-black text-sm mb-5 border-l-4 border-green-600 pl-3 uppercase tracking-wide">Informasi File</h3>

              <div className="divide-y divide-zinc-800/50 mb-6 text-sm">
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-zinc-500 flex items-center gap-2"><User size={13}/> Creator</span>
                  <span className="text-white font-medium">{mod.author}</span>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-zinc-500 flex items-center gap-2"><Calendar size={13}/> Diupload</span>
                  <span className="text-white font-medium">{mod.dateAdded}</span>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-zinc-500 flex items-center gap-2">
                    {mod.platform === 'Android' ? <Smartphone size={13}/> : mod.platform === 'PC' ? <Monitor size={13}/> : <Globe size={13}/>} Platform
                  </span>
                  <span className="text-green-500 font-medium">{mod.platform}</span>
                </div>
                {mod.downloadCount !== undefined && (
                  <div className="flex justify-between items-center py-2.5">
                    <span className="text-zinc-500 flex items-center gap-2"><Download size={13}/> Download</span>
                    <span className="text-white font-medium">{formatCount(mod.downloadCount)}×</span>
                  </div>
                )}
                {avgRating !== undefined && ratingCount > 0 && (
                  <div className="flex justify-between items-center py-2.5">
                    <span className="text-zinc-500 flex items-center gap-2"><Star size={13}/> Rating</span>
                    <span className="text-yellow-400 font-semibold flex items-center gap-1">
                      <Star size={11} className="fill-yellow-400"/> {avgRating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              {canDownload ? (
                <a href={mod.downloadUrl} target="_blank" rel="noopener noreferrer" onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-heading font-black text-sm py-3.5 rounded-xl shadow-lg shadow-green-900/25 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  <Download size={18}/> DOWNLOAD SEKARANG
                </a>
              ) : (
                <div className="text-center bg-zinc-900/60 p-5 rounded-xl border border-yellow-900/30">
                  <Lock size={36} className="mx-auto text-zinc-700 mb-3"/>
                  <h4 className="text-white font-bold text-sm mb-1">Konten VIP</h4>
                  <p className="text-zinc-600 text-xs mb-4 leading-relaxed">
                    {isLoggedIn ? 'Role VIP diperlukan untuk mengakses mod ini.' : 'Login Discord untuk download mod premium.'}
                  </p>
                  {!isLoggedIn && (
                    <button onClick={login}
                      className="w-full flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-sm py-2.5 rounded-lg transition-colors">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.042.032.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                      </svg>
                      Login Discord
                    </button>
                  )}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-zinc-800/50 text-center">
                <button onClick={() => navigator.clipboard.writeText(window.location.href)}
                  className="text-zinc-600 hover:text-white flex items-center justify-center gap-1.5 w-full text-xs transition-colors">
                  <Share2 size={12}/> Salin link mod ini
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModDetail;