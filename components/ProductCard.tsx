import React from 'react';
import { Download, Monitor, Smartphone, Globe, Lock, PlayCircle, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ModItem } from '../types';

interface ProductCardProps {
  mod: ModItem;
}

// Generate a deterministic gradient based on mod title
const getTitleGradient = (title: string) => {
  const gradients = [
    'from-green-900/80 via-emerald-900/60 to-zinc-900',
    'from-indigo-900/80 via-violet-900/60 to-zinc-900',
    'from-rose-900/80 via-pink-900/60 to-zinc-900',
    'from-amber-900/80 via-orange-900/60 to-zinc-900',
    'from-cyan-900/80 via-teal-900/60 to-zinc-900',
    'from-sky-900/80 via-blue-900/60 to-zinc-900',
  ];
  const accentColors = [
    'text-green-400', 'text-indigo-400', 'text-rose-400',
    'text-amber-400', 'text-cyan-400', 'text-sky-400',
  ];
  const borderColors = [
    'border-green-700/40', 'border-indigo-700/40', 'border-rose-700/40',
    'border-amber-700/40', 'border-cyan-700/40', 'border-sky-700/40',
  ];
  const idx = title.charCodeAt(0) % gradients.length;
  return { gradient: gradients[idx], accent: accentColors[idx], border: borderColors[idx] };
};

const ProductCard: React.FC<ProductCardProps> = ({ mod }) => {
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'PC': return <Monitor size={13} className="mr-1" />;
      case 'Android': return <Smartphone size={13} className="mr-1" />;
      default: return <Globe size={13} className="mr-1" />;
    }
  };

  const hasImage = mod.imageUrl && mod.imageUrl.trim() !== '';
  const { gradient, accent, border } = getTitleGradient(mod.title);

  return (
    <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden hover:border-green-600/60 transition-all duration-500 group flex flex-col h-full hover:shadow-xl hover:shadow-green-900/15 hover:-translate-y-1">
      
      {/* Thumbnail / Fallback */}
      <div className="relative h-48 overflow-hidden bg-black">
        {hasImage ? (
          <>
            <img
              src={mod.imageUrl}
              alt={mod.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </>
        ) : (
          // Fallback: gradient + title overlay
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center p-4 relative overflow-hidden`}>
            {/* Decorative grid pattern */}
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            />
            {/* Glowing orb */}
            <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-20 bg-current ${accent}`} />
            
            <Layers size={28} className={`mb-3 opacity-50 ${accent}`} />
            <p className={`font-heading font-bold text-center text-lg leading-tight uppercase tracking-wide ${accent}`}>
              {mod.title}
            </p>
            <p className="text-zinc-500 text-xs mt-2 uppercase tracking-widest">{mod.category}</p>
          </div>
        )}

        {/* VIP Badge */}
        <div className="absolute top-2.5 right-2.5 flex gap-2 z-10">
          {mod.isPremium && (
            <div className="bg-yellow-500/90 backdrop-blur-sm text-black text-[9px] font-heading font-black px-2 py-0.5 rounded-sm shadow-lg tracking-widest">
              VIP ONLY
            </div>
          )}
        </div>

        {/* Play icon if has media */}
        {mod.mediaUrl && hasImage && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-10">
            <div className="bg-black/60 p-3 rounded-full border border-white/20 backdrop-blur-sm scale-90 group-hover:scale-100 transition-transform duration-300">
              <PlayCircle className="text-white" size={30} />
            </div>
          </div>
        )}

        {/* Bottom badges */}
        <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2 bg-gradient-to-t from-black/80 to-transparent flex gap-1.5 z-10">
          <span className="flex items-center px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider bg-zinc-900/90 text-zinc-300 border border-zinc-700/80 backdrop-blur-sm">
            {getPlatformIcon(mod.platform)}{mod.platform}
          </span>
          <span className="bg-green-900/60 border border-green-800/60 text-green-400 text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider backdrop-blur-sm">
            {mod.category}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-heading text-base font-bold text-white mb-0.5 line-clamp-1 group-hover:text-green-400 transition-colors duration-300 tracking-wide">
          {mod.title}
        </h3>
        <p className="text-[11px] text-zinc-500 mb-2.5">
          Oleh: <span className="text-zinc-400 font-medium">{mod.author}</span>
        </p>
        <p className="text-zinc-400 text-xs line-clamp-2 mb-4 flex-grow border-b border-zinc-800/80 pb-3 leading-relaxed">
          {mod.description}
        </p>

        <Link
          to={`/mod/${mod.id}`}
          className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest transition-all duration-300
            ${mod.isPremium
              ? 'bg-zinc-800/80 text-yellow-500 border border-yellow-600/25 hover:bg-yellow-900/20 hover:border-yellow-600/50'
              : 'bg-green-700 hover:bg-green-600 text-white shadow-md shadow-green-900/30 hover:shadow-green-800/40'
            }`}
        >
          {mod.isPremium ? (
            <><Lock size={12} /> Detail VIP</>
          ) : (
            <><Download size={12} /> Download</>
          )}
        </Link>
      </div>
    </div>
  );
};

export default ProductCard;