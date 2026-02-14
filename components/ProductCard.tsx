import React from 'react';
import { Download, Monitor, Smartphone, Globe, Lock, PlayCircle, Layers, Star, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ModItem } from '../types';

interface ProductCardProps {
  mod: ModItem;
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

const ProductCard: React.FC<ProductCardProps> = ({ mod }) => {
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'PC': return <Monitor size={11} className="mr-1" />;
      case 'Android': return <Smartphone size={11} className="mr-1" />;
      default: return <Globe size={11} className="mr-1" />;
    }
  };

  const hasImage = mod.imageUrl && mod.imageUrl.trim() !== '';
  const style = getTitleStyle(mod.title);

  return (
    <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden hover:border-green-600/60 transition-all duration-500 group flex flex-col h-full hover:shadow-xl hover:shadow-green-900/15 hover:-translate-y-1">

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
            <Layers size={24} className={`mb-2.5 opacity-60 ${style.accent}`} />
            <p className={`font-heading font-bold text-center text-base leading-tight uppercase tracking-wide ${style.accent} line-clamp-2`}>
              {mod.title}
            </p>
            <p className="text-zinc-500 text-[10px] mt-1.5 uppercase tracking-widest">{mod.category}</p>
          </div>
        )}

        {/* Tags row (top-left) */}
        {mod.tags && mod.tags.length > 0 && (
          <div className="absolute top-2 left-2 flex gap-1 flex-wrap z-10">
            {mod.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-[9px] font-black bg-black/70 text-white px-1.5 py-0.5 rounded backdrop-blur-sm border border-white/10">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* VIP badge */}
        {mod.isPremium && (
          <div className="absolute top-2 right-2 z-10">
            <div className="bg-yellow-500/90 backdrop-blur-sm text-black text-[9px] font-heading font-black px-2 py-0.5 rounded-sm shadow-lg tracking-widest">
              VIP
            </div>
          </div>
        )}

        {/* Play hint */}
        {mod.mediaUrl && hasImage && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-10">
            <div className="bg-black/60 p-2.5 rounded-full border border-white/20 backdrop-blur-sm scale-90 group-hover:scale-100 transition-transform duration-300">
              <PlayCircle className="text-white" size={26} />
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

        {/* Rating + Download count */}
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

        <p className="text-zinc-500 text-xs line-clamp-2 mb-3 flex-grow border-b border-zinc-800/60 pb-2.5 leading-relaxed">
          {mod.description}
        </p>

        <Link
          to={`/mod/${mod.id}`}
          className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest transition-all duration-300
            ${mod.isPremium
              ? 'bg-zinc-800/80 text-yellow-500 border border-yellow-600/20 hover:bg-yellow-900/20 hover:border-yellow-600/40'
              : 'bg-green-700 hover:bg-green-600 text-white shadow-md shadow-green-900/30'
            }`}
        >
          {mod.isPremium ? <><Lock size={11} /> Detail VIP</> : <><Download size={11} /> Download</>}
        </Link>
      </div>
    </div>
  );
};

export default ProductCard;