// components/ProductCard.tsx — SAFE VERSION with null checks
// Prevents "Cannot read properties of undefined" errors

import React from 'react';
import { Download, Monitor, Smartphone, Globe, Star, Crown, ShieldCheck, Shield, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ModItem } from '../types';

interface ProductCardProps {
  mod: ModItem;
  onClick?: () => void;
  showPendingBadge?: boolean;
}

const getTitleStyle = (title: string) => {
  const styles = [
    { gradient: 'from-green-900/80 via-emerald-900/50 to-zinc-900', accent: 'text-green-400', glow: 'bg-green-500' },
    { gradient: 'from-indigo-900/80 via-violet-900/50 to-zinc-900', accent: 'text-indigo-400', glow: 'bg-indigo-500' },
    { gradient: 'from-rose-900/80 via-pink-900/50 to-zinc-900', accent: 'text-rose-400', glow: 'bg-rose-500' },
    { gradient: 'from-amber-900/80 via-orange-900/50 to-zinc-900', accent: 'text-amber-400', glow: 'bg-amber-500' },
    { gradient: 'from-cyan-900/80 via-teal-900/50 to-zinc-900', accent: 'text-cyan-400', glow: 'bg-cyan-500' },
    { gradient: 'from-sky-900/80 via-blue-900/50 to-zinc-900', accent: 'text-sky-400', glow: 'bg-sky-500' },
  ];
  return styles[title.charCodeAt(0) % styles.length];
};

const formatCount = (n: number): string => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

const StarRating: React.FC<{ rating: number; count: number }> = ({ rating, count }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map(s => (
      <Star
        key={s}
        size={10}
        className={s <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'}
      />
    ))}
    <span className="text-[10px] text-zinc-500 ml-0.5">{rating.toFixed(1)} ({count})</span>
  </div>
);

const ProductCard: React.FC<ProductCardProps> = ({ mod, onClick, showPendingBadge = false }) => {
  // SAFETY CHECK - prevent crashes
  if (!mod) {
    console.error('ProductCard: mod prop is undefined!');
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 text-center">
        <p className="text-red-400 text-xs">Error: Mod data missing</p>
      </div>
    );
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'PC': return <Monitor size={11} className="mr-1" />;
      case 'Android': return <Smartphone size={11} className="mr-1" />;
      default: return <Globe size={11} className="mr-1" />;
    }
  };

  // Get approval status from mod (with safe fallback)
  const approvalStatus = (mod as any).approval_status || 'unofficial';
  const isPending = approvalStatus === 'pending';
  
  // Status badge config
  const getStatusBadge = () => {
    switch (approvalStatus) {
      case 'official':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/40">
            <Crown size={10} /> Official
          </span>
        );
      case 'verified':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <ShieldCheck size={10} /> Verified
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <Clock size={10} /> Pending
          </span>
        );
      default: // unofficial
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-zinc-600/20 text-zinc-400 border border-zinc-600/40">
            <Shield size={10} /> Unofficial
          </span>
        );
    }
  };

  const hasImage = mod.imageUrl && mod.imageUrl.trim() !== '';
  const style = getTitleStyle(mod.title || 'Untitled');

  return (
    <div 
      className={`bg-[#1a1a1a] border rounded-xl overflow-hidden transition-all duration-500 group flex flex-col h-full hover:shadow-xl hover:-translate-y-1 ${
        isPending 
          ? 'border-amber-500/30 hover:border-amber-500/60 opacity-90' 
          : 'border-zinc-800 hover:border-green-600/60 hover:shadow-green-900/15'
      }`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Thumbnail / Fallback */}
      <div className="relative h-44 overflow-hidden bg-black flex-shrink-0">
        {hasImage ? (
          <>
            <img
              src={mod.imageUrl}
              alt={mod.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-75 group-hover:opacity-95"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          </>
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${style.gradient} flex flex-col items-center justify-center p-4 relative overflow-hidden`}>
            <div className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}
            />
            <div className={`absolute -top-6 -right-6 w-28 h-28 rounded-full blur-3xl opacity-25 ${style.glow}`} />
            <p className={`font-heading font-bold text-center text-base leading-tight uppercase tracking-wide ${style.accent} line-clamp-2 px-2`}>
              {mod.title}
            </p>
            <p className="text-zinc-500 text-[10px] mt-1.5 uppercase tracking-widest">{mod.category}</p>
          </div>
        )}

        {/* Status Badge (top-left) */}
        <div className="absolute top-2 left-2 z-10">
          {getStatusBadge()}
        </div>

        {/* VIP badge (top-right) */}
        {mod.isPremium && (
          <div className="absolute top-2 right-2 z-10">
            <div className="bg-yellow-500/90 backdrop-blur-sm text-black text-[9px] font-heading font-black px-2 py-0.5 rounded-sm shadow-lg tracking-widest">
              VIP
            </div>
          </div>
        )}

        {(mod as any).is_reshare && (mod as any).original_author && (
        <div className="absolute bottom-8 right-2 z-10">
          <div className="bg-purple-900/80 backdrop-blur-sm text-purple-300 text-[8px] font-bold px-2 py-0.5 rounded border border-purple-700/60">
            by {(mod as any).original_author}
          </div>
        </div>
      )}

        {/* Pending overlay */}
        {isPending && showPendingBadge && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
            <div className="flex flex-col items-center gap-1 bg-black/80 px-4 py-2 rounded-lg border border-amber-500/50">
              <Clock size={18} className="text-amber-400" />
              <span className="text-amber-400 text-xs font-semibold">Menunggu Review</span>
            </div>
          </div>
        )}

        {/* Bottom badges */}
        <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/80 to-transparent flex gap-1.5 z-10">
          <span className="flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-zinc-900/90 text-zinc-300 border border-zinc-700/80">
            {getPlatformIcon(mod.platform)}{mod.platform}
          </span>
          <span className="bg-green-900/60 border border-green-800/60 text-green-400 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
            {mod.category}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3.5 flex flex-col flex-grow">
        <h3 className="font-heading text-sm font-bold text-white mb-0.5 line-clamp-1 group-hover:text-green-400 transition-colors duration-300 tracking-wide">
          {mod.title}
        </h3>
        <p className="text-[11px] text-zinc-600 mb-1.5">
          Oleh: <span className="text-zinc-400">{mod.author}</span>
        </p>
        {(mod as any).is_reshare && (
        <p className="text-[10px] text-purple-400/70 mb-1">
          📦 Reshare by <span className="font-semibold">{mod.author}</span>
        </p>
      )}
         {/* Rating + Download count (hide for pending) */}
        {!isPending && (
          <div className="flex items-center justify-between mb-2">
            {mod.rating !== undefined && mod.ratingCount ? (
              <StarRating rating={mod.rating} count={mod.ratingCount} />
            ) : (
              <span className="text-[10px] text-zinc-700">Belum ada rating</span>
            )}
            {mod.downloadCount !== undefined && (
              <span className="text-[10px] text-zinc-600 flex items-center gap-0.5">
                <Download size={9} />
                {formatCount(mod.downloadCount)}
              </span>
            )}
          </div>
        )}

        {isPending && (
          <p className="text-xs text-amber-400/70 mb-2">
            Mod ini belum dipublish — sedang menunggu persetujuan admin.
          </p>
        )}

        <p className="text-zinc-500 text-xs line-clamp-2 mb-3 flex-grow border-b border-zinc-800/60 pb-2.5 leading-relaxed">
          {mod.description}
        </p>

        {/* Button - only show if not pending */}
        {!isPending && (
          <Link
            to={`/mod/${mod.id}`}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest transition-all duration-300 bg-green-700 hover:bg-green-600 text-white shadow-md shadow-green-900/30"
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={11} /> Lihat Detail
          </Link>
        )}
      </div>
    </div>
  );
};

export default ProductCard;