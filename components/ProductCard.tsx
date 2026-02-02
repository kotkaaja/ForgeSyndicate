import React from 'react';
import { Download, Monitor, Smartphone, Globe, Lock, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ModItem } from '../types';

interface ProductCardProps {
  mod: ModItem;
}

const ProductCard: React.FC<ProductCardProps> = ({ mod }) => {
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'PC': return <Monitor size={14} className="mr-1" />;
      case 'Android': return <Smartphone size={14} className="mr-1" />;
      default: return <Globe size={14} className="mr-1" />;
    }
  };

  return (
    <div className="bg-[#1a1a1a] border border-zinc-800 rounded-lg overflow-hidden hover:border-green-600/50 transition-all duration-300 group flex flex-col h-full hover:shadow-lg hover:shadow-green-900/10">
      <div className="relative h-48 overflow-hidden bg-black">
        <img 
          src={mod.imageUrl} 
          alt={mod.title} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
        />
        
        {/* Badges */}
        <div className="absolute top-2 right-2 flex gap-2">
          {mod.isPremium && (
            <div className="bg-yellow-600/90 backdrop-blur text-white text-[10px] font-heading font-bold px-2 py-1 rounded border border-yellow-500/50 shadow-lg">
              VIP ONLY
            </div>
          )}
        </div>

        {/* Media Indicator */}
        {mod.mediaUrl && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="bg-black/50 p-3 rounded-full border border-white/20 backdrop-blur-sm">
              <PlayCircle className="text-white" size={32} />
            </div>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent flex gap-2">
            <span className="flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
                {getPlatformIcon(mod.platform)} {mod.platform}
            </span>
            <span className="bg-green-900/40 border border-green-800/50 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                {mod.category}
            </span>
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-grow relative">
        <h3 className="font-heading text-lg font-bold text-white mb-1 line-clamp-1 group-hover:text-green-400 transition-colors">{mod.title}</h3>
        <p className="text-xs text-zinc-500 mb-3">Oleh: <span className="text-zinc-300">{mod.author}</span></p>
        <p className="text-zinc-400 text-sm line-clamp-2 mb-4 flex-grow border-b border-zinc-800 pb-2">
          {mod.description}
        </p>
        
        <Link 
          to={`/mod/${mod.id}`}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded font-bold text-sm uppercase tracking-wider transition-all
            ${mod.isPremium 
              ? 'bg-zinc-800 text-yellow-500 border border-yellow-600/30 hover:bg-zinc-700' 
              : 'bg-green-700 hover:bg-green-600 text-white shadow-lg shadow-green-900/20'
            }`}
        >
          {mod.isPremium ? (
             <><Lock size={14} /> Detail VIP</>
          ) : (
             <><Download size={14} /> Download</>
          )}
        </Link>
      </div>
    </div>
  );
};

export default ProductCard;