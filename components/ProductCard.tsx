// components/ProductCard.tsx — FIXED
// Tambah badge: Official (biru), Verified (hijau), Unofficial (abu), Pending (kuning)

import React from 'react';
import { Download, Star, Crown, ShieldCheck, Shield, Clock } from 'lucide-react';
import type { Mod } from '../services/data';

interface ProductCardProps {
  mod: Mod;
  onClick?: () => void;
  showPendingBadge?: boolean; // true saat di halaman My Mods / Mod Manage
}

// ─── Badge config per status ──────────────────────────────────────────────────
const STATUS_CONFIG = {
  official: {
    label:  'Official',
    icon:   Crown,
    class:  'bg-blue-500/20 text-blue-400 border border-blue-500/40',
    dot:    'bg-blue-400',
  },
  verified: {
    label:  'Verified',
    icon:   ShieldCheck,
    class:  'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
    dot:    'bg-emerald-400',
  },
  unofficial: {
    label:  'Unofficial',
    icon:   Shield,
    class:  'bg-gray-500/20 text-gray-400 border border-gray-500/40',
    dot:    'bg-gray-400',
  },
  pending: {
    label:  'Pending Review',
    icon:   Clock,
    class:  'bg-amber-500/20 text-amber-400 border border-amber-500/40',
    dot:    'bg-amber-400',
  },
} as const;

function StatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const cfg  = STATUS_CONFIG[status] ?? STATUS_CONFIG.unofficial;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.class}`}>
      <Icon size={11} className="flex-shrink-0" />
      {cfg.label}
    </span>
  );
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star size={13} className="text-yellow-400 fill-yellow-400" />
      <span className="text-xs text-gray-300">{rating.toFixed(1)}</span>
      <span className="text-xs text-gray-500">({count})</span>
    </div>
  );
}

const ProductCard: React.FC<ProductCardProps> = ({ mod, onClick, showPendingBadge = false }) => {
  const isPending = mod.approval_status === 'pending';

  return (
    <div
      onClick={onClick}
      className={`
        group relative flex flex-col rounded-xl border bg-gray-900 overflow-hidden cursor-pointer
        transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5
        ${isPending
          ? 'border-amber-500/30 hover:border-amber-500/60 opacity-80'
          : 'border-gray-700/60 hover:border-gray-600'}
      `}
    >
      {/* ── Thumbnail ── */}
      <div className="relative w-full aspect-video bg-gray-800 overflow-hidden">
        {mod.image_url ? (
          <img
            src={mod.image_url}
            alt={mod.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-700">
            <span className="text-gray-500 text-sm">No Image</span>
          </div>
        )}

        {/* Premium badge (kanan atas) */}
        {mod.is_premium && !isPending && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-500/90 text-yellow-900">
              <Crown size={10} />
              Premium
            </span>
          </div>
        )}

        {/* Pending overlay kalau di mod-manage */}
        {isPending && showPendingBadge && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="flex flex-col items-center gap-1 bg-black/70 px-4 py-2 rounded-lg">
              <Clock size={18} className="text-amber-400" />
              <span className="text-amber-400 text-xs font-semibold">Menunggu Review</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        {/* Status badge */}
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={mod.approval_status as keyof typeof STATUS_CONFIG} />
          <span className="text-xs text-gray-500 truncate">{mod.category}</span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 group-hover:text-blue-300 transition-colors">
          {mod.title}
        </h3>

        {/* Author */}
        <p className="text-xs text-gray-500 truncate">oleh {mod.author}</p>

        {/* Footer: rating + downloads */}
        {!isPending ? (
          <div className="mt-auto flex items-center justify-between pt-1">
            <StarRating rating={mod.rating ?? 0} count={mod.rating_count ?? 0} />
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Download size={12} />
              <span>{(mod.download_count ?? 0).toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <div className="mt-auto pt-1">
            <p className="text-xs text-amber-400/70">
              Mod ini belum dipublish — sedang menunggu persetujuan admin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;