import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Download, Lock, Share2, Calendar, User,
  Monitor, Smartphone, Globe, Star, Layers, Tag
} from 'lucide-react';
import { getModById, getUserRole, incrementDownload } from '../services/data';
import { ModItem, UserRole } from '../types';

// ── Fallback background (sama logika dengan ProductCard) ──────────────────
const getTitleStyle = (title: string) => {
  const styles = [
    { gradient: 'from-green-900/80 via-emerald-900/50 to-zinc-900', accent: 'text-green-400', glow: 'bg-green-500' },
    { gradient: 'from-indigo-900/80 via-violet-900/50 to-zinc-900', accent: 'text-indigo-400', glow: 'bg-indigo-500' },
    { gradient: 'from-rose-900/80 via-pink-900/50 to-zinc-900',     accent: 'text-rose-400',   glow: 'bg-rose-500'   },
    { gradient: 'from-amber-900/80 via-orange-900/50 to-zinc-900',  accent: 'text-amber-400',  glow: 'bg-amber-500'  },
    { gradient: 'from-cyan-900/80 via-teal-900/50 to-zinc-900',     accent: 'text-cyan-400',   glow: 'bg-cyan-500'   },
    { gradient: 'from-sky-900/80 via-blue-900/50 to-zinc-900',      accent: 'text-sky-400',    glow: 'bg-sky-500'    },
  ];
  return styles[title.charCodeAt(0) % styles.length];
};

const formatCount = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

// ── Star Rating display ───────────────────────────────────────────────────
const StarRow: React.FC<{ rating: number; count: number }> = ({ rating, count }) => (
  <div className="flex items-center gap-1.5">
    {[1, 2, 3, 4, 5].map(s => (
      <Star
        key={s}
        size={16}
        className={s <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'}
      />
    ))}
    <span className="text-sm text-zinc-400 ml-1">{rating.toFixed(1)}</span>
    <span className="text-xs text-zinc-600">({count} rating)</span>
  </div>
);

const ModDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [mod, setMod] = useState<ModItem | null>(null);
  const [role, setRole] = useState<UserRole>('GUEST');
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setImgError(false);
      if (id) {
        const data = await getModById(id);
        setMod(data || null);
      }
      setRole(getUserRole());
      setLoading(false);
    };
    fetchData();
  }, [id]);

  // ── Embed URL helper ──────────────────────────────────────────────────
  const getEmbedUrl = (url?: string) => {
    if (!url || url.trim() === '') return null;
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('v=')
        ? url.split('v=')[1]?.split('&')[0]
        : url.split('/').pop();
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('tiktok.com')) {
      const match = url.match(/\/video\/(\d+)/);
      if (match?.[1]) return `https://www.tiktok.com/embed/v2/${match[1]}`;
    }
    return null;
  };

  const getPlatformIcon = (platform: string) => {
    if (platform === 'Android') return <Smartphone size={15} />;
    if (platform === 'PC') return <Monitor size={15} />;
    return <Globe size={15} />;
  };

  // ── Handle download click (increment counter) ─────────────────────────
  const handleDownload = async () => {
    if (mod?.id) {
      try { await incrementDownload(mod.id); } catch {}
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!mod) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-zinc-500">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">404 — Mod Not Found</h2>
          <Link to="/mods" className="text-green-500 hover:underline text-sm">Kembali ke Gudang Mod</Link>
        </div>
      </div>
    );
  }

  const embedUrl  = getEmbedUrl(mod.mediaUrl);
  const hasImage  = mod.imageUrl && mod.imageUrl.trim() !== '' && !imgError;
  const canDownload = !mod.isPremium || role === 'VIP' || role === 'ADMIN';
  const style = getTitleStyle(mod.title);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20">

      {/* ── Hero banner ──────────────────────────────────────────────── */}
      <div className="relative h-56 md:h-72 w-full overflow-hidden">
        {hasImage ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10" />
            <img
              src={mod.imageUrl}
              alt={mod.title}
              className="w-full h-full object-cover opacity-40 blur-sm scale-105"
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          /* Fallback gradient banner — sama seperti card */
          <div className={`w-full h-full bg-gradient-to-br ${style.gradient} relative overflow-hidden`}>
            <div className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)',
                backgroundSize: '28px 28px'
              }}
            />
            <div className={`absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl opacity-20 ${style.glow}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent z-10" />
          </div>
        )}

        {/* Back button */}
        <div className="absolute top-4 left-4 z-20">
          <Link to="/mods"
            className="flex items-center gap-1.5 text-zinc-300 hover:text-white bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10 text-sm transition-colors">
            <ArrowLeft size={15} /> Kembali
          </Link>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 -mt-16 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — media + info */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-[#141414] border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl">

              {/* Media area */}
              {embedUrl ? (
                /* Video embed */
                <div className="aspect-video w-full bg-black">
                  <iframe
                    src={embedUrl}
                    title="Video Preview"
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              ) : hasImage ? (
                /* Gambar normal */
                <div className="aspect-video w-full bg-zinc-900 relative overflow-hidden">
                  <img
                    src={mod.imageUrl}
                    alt={mod.title}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                  />
                </div>
              ) : (
                /* Fallback — judul ditampilkan besar di tengah */
                <div className={`aspect-video w-full bg-gradient-to-br ${style.gradient} flex flex-col items-center justify-center relative overflow-hidden`}>
                  <div className="absolute inset-0 opacity-[0.07]"
                    style={{
                      backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)',
                      backgroundSize: '28px 28px'
                    }}
                  />
                  <div className={`absolute -top-12 -right-12 w-56 h-56 rounded-full blur-3xl opacity-20 ${style.glow}`} />
                  <Layers size={36} className={`mb-4 opacity-50 ${style.accent}`} />
                  <p className={`font-heading font-black text-2xl md:text-3xl text-center uppercase tracking-wide px-8 leading-tight ${style.accent}`}>
                    {mod.title}
                  </p>
                  <p className="text-zinc-500 text-xs mt-3 uppercase tracking-widest">{mod.category}</p>
                </div>
              )}

              {/* Mod info */}
              <div className="p-6">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="bg-green-900/30 text-green-500 border border-green-800/50 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide">
                    {mod.category}
                  </span>
                  {mod.isPremium && (
                    <span className="bg-yellow-600/15 text-yellow-500 border border-yellow-600/40 px-2.5 py-0.5 rounded text-xs font-bold uppercase flex items-center gap-1">
                      <Lock size={10} /> Premium
                    </span>
                  )}
                  {/* Tags */}
                  {mod.tags?.map(tag => (
                    <span key={tag} className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
                      <Tag size={9} />{tag}
                    </span>
                  ))}
                </div>

                <h1 className="font-heading text-3xl md:text-4xl font-black text-white mb-3 leading-tight tracking-tight">
                  {mod.title}
                </h1>

                {/* Rating */}
                {mod.rating !== undefined && mod.ratingCount ? (
                  <div className="mb-4">
                    <StarRow rating={mod.rating} count={mod.ratingCount} />
                  </div>
                ) : null}

                {/* Download count */}
                {mod.downloadCount !== undefined && (
                  <p className="text-xs text-zinc-600 mb-4 flex items-center gap-1">
                    <Download size={11} />
                    <span className="text-zinc-400 font-semibold">{formatCount(mod.downloadCount)}</span> kali didownload
                  </p>
                )}

                <div className="border-t border-zinc-800/60 pt-5 text-zinc-400 text-sm leading-relaxed">
                  {mod.description}
                </div>
              </div>
            </div>
          </div>

          {/* Right — sidebar */}
          <div className="space-y-5">
            <div className="bg-[#141414] border border-zinc-800/80 p-5 rounded-2xl sticky top-20 shadow-xl">
              <h3 className="text-white font-heading font-black text-base mb-5 border-l-4 border-green-600 pl-3 uppercase tracking-wide">
                Informasi File
              </h3>

              <div className="space-y-3 mb-6 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-zinc-800/60">
                  <span className="text-zinc-500 flex items-center gap-2"><User size={14} /> Creator</span>
                  <span className="text-white font-medium">{mod.author}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-zinc-800/60">
                  <span className="text-zinc-500 flex items-center gap-2"><Calendar size={14} /> Diupload</span>
                  <span className="text-white font-medium">{mod.dateAdded}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-zinc-800/60">
                  <span className="text-zinc-500 flex items-center gap-2">{getPlatformIcon(mod.platform)} Platform</span>
                  <span className="text-green-500 font-medium">{mod.platform}</span>
                </div>
                {mod.downloadCount !== undefined && (
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800/60">
                    <span className="text-zinc-500 flex items-center gap-2"><Download size={14} /> Download</span>
                    <span className="text-white font-medium">{formatCount(mod.downloadCount)}×</span>
                  </div>
                )}
                {mod.rating !== undefined && mod.ratingCount && (
                  <div className="flex justify-between items-center py-2 border-b border-zinc-800/60">
                    <span className="text-zinc-500 flex items-center gap-2"><Star size={14} /> Rating</span>
                    <span className="text-yellow-400 font-medium flex items-center gap-1">
                      <Star size={12} className="fill-yellow-400" /> {mod.rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              {/* Download / Lock */}
              {canDownload ? (
                <a
                  href={mod.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-heading font-black text-base py-3.5 rounded-xl shadow-lg shadow-green-900/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Download size={20} /> DOWNLOAD SEKARANG
                </a>
              ) : (
                <div className="text-center bg-zinc-900/60 p-5 rounded-xl border border-yellow-900/30">
                  <Lock size={40} className="mx-auto text-zinc-700 mb-3" />
                  <h4 className="text-white font-bold text-sm mb-1.5">Konten Terkunci</h4>
                  <p className="text-zinc-600 text-xs mb-4 leading-relaxed">
                    Konten ini khusus VIP Member. Login dengan token untuk mengakses.
                  </p>
                  <Link
                    to="/login"
                    state={{ from: location }}
                    className="block w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm py-2.5 rounded-lg transition-colors"
                  >
                    Masuk / Input Token
                  </Link>
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-zinc-800/60 text-center">
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href); }}
                  className="text-zinc-600 hover:text-white flex items-center justify-center gap-1.5 w-full text-xs transition-colors"
                >
                  <Share2 size={13} /> Salin link mod ini
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