import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Star, ShieldCheck, Zap, UserCog, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { getMods } from '../services/data';
import { ModItem } from '../types';

// Skeleton card untuk loading
const SkeletonCard = () => (
  <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden animate-pulse flex-shrink-0 w-72">
    <div className="h-44 bg-zinc-800/60" />
    <div className="p-3.5 space-y-2.5">
      <div className="h-3.5 bg-zinc-800 rounded w-3/4" />
      <div className="h-2.5 bg-zinc-800/60 rounded w-1/2" />
      <div className="h-2.5 bg-zinc-800/60 rounded w-full" />
      <div className="h-9 bg-zinc-800 rounded-lg mt-3" />
    </div>
  </div>
);

// Horizontal Scroll Carousel
const ModCarousel: React.FC<{ mods: ModItem[]; loading: boolean }> = ({ mods, loading }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();
    return () => el.removeEventListener('scroll', checkScroll);
  }, [mods]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  return (
    <div className="relative group/carousel">
      <button
        onClick={() => scroll('left')}
        className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-xl transition-all duration-300
          ${canScrollLeft ? 'opacity-100 hover:bg-zinc-800 hover:border-green-700' : 'opacity-0 pointer-events-none'}`}
      >
        <ChevronLeft size={20} className="text-white" />
      </button>

      <button
        onClick={() => scroll('right')}
        className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-xl transition-all duration-300
          ${canScrollRight ? 'opacity-100 hover:bg-zinc-800 hover:border-green-700' : 'opacity-0 pointer-events-none'}`}
      >
        <ChevronRight size={20} className="text-white" />
      </button>

      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto pb-3 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-3 w-16 bg-gradient-to-r from-[#0f0f0f] to-transparent z-10 pointer-events-none" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-3 w-16 bg-gradient-to-l from-[#0f0f0f] to-transparent z-10 pointer-events-none" />
        )}

        {loading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          : mods.map((mod, i) => (
            <div
              key={mod.id}
              className="flex-shrink-0 w-72 animate-in fade-in slide-in-from-bottom-3 duration-400"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
            >
              <ProductCard mod={mod} />
            </div>
          ))
        }
      </div>
    </div>
  );
};

// ── Feature Item — compact horizontal layout untuk mobile ──
interface FeatureItemProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, desc }) => (
  <div className="flex items-start gap-3 bg-[#1a1a1a] border border-zinc-800 hover:border-green-800/50 rounded-xl p-4 transition-all duration-300 group">
    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-green-900/20 border border-green-900/30 flex items-center justify-center group-hover:bg-green-900/30 transition-colors">
      {icon}
    </div>
    <div className="min-w-0">
      <h3 className="text-sm font-black text-white tracking-tight">{title}</h3>
      <p className="text-zinc-500 text-xs leading-relaxed mt-0.5">{desc}</p>
    </div>
  </div>
);

const Home: React.FC = () => {
  const [featuredMods, setFeaturedMods] = useState<ModItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allMods = await getMods();
        setFeaturedMods(allMods.slice(0, 8));
      } catch (error) {
        console.error('Gagal memuat data home', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Hero Section */}
      <section className="relative h-[520px] md:h-[560px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/80 to-transparent z-10" />
          <img
            src="https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=1920&auto=format&fit=crop"
            alt="GTA Background"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 z-10 opacity-10"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '48px 48px'
            }}
          />
        </div>

        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto mt-10">
          <div className="inline-flex items-center gap-2 text-green-600 text-xs font-bold uppercase tracking-widest mb-4 bg-green-900/20 border border-green-900/40 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            GTA SA Modding Community
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tighter leading-none">
            SA <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">FORGE</span>
          </h1>
          <p className="text-zinc-400 text-sm md:text-base mb-7 max-w-xl mx-auto leading-relaxed px-2">
            Koleksi modifikasi visual, script Lua, dan tools eksklusif untuk <b className="text-zinc-200">Personal Player</b> GTA San Andreas Multiplayer.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/mods"
              className="px-7 py-3 bg-green-700 hover:bg-green-600 text-white font-black rounded-xl uppercase tracking-widest transition-all shadow-[0_0_24px_rgba(21,128,61,0.35)] hover:shadow-[0_0_32px_rgba(21,128,61,0.5)] flex items-center justify-center gap-2 text-sm"
            >
              Cari Mod <ArrowRight size={16} />
            </Link>
            <Link
              to="/services"
              className="px-7 py-3 bg-transparent border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 text-white font-black rounded-xl uppercase tracking-widest transition-all flex items-center justify-center text-sm"
            >
              Request Script
            </Link>
          </div>
        </div>
      </section>

      {/* Features — compact horizontal cards (mobile friendly) */}
      <section className="py-10 md:py-16 bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto px-4">

          {/* Feature Cards: horizontal list on mobile, 3-col grid on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-12">
            <FeatureItem
              icon={<Zap className="text-green-500" size={18} />}
              title="Lightweight & Fast"
              desc="Script efisien, ringan di PC & Android kentang, tanpa FPS drop."
            />
            <FeatureItem
              icon={<ShieldCheck className="text-green-500" size={18} />}
              title="Safe for Daily Use"
              desc="Mod aman (legit) untuk aktivitas sehari-hari di berbagai server SAMP."
            />
            <FeatureItem
              icon={<UserCog className="text-green-500" size={18} />}
              title="Personal Custom"
              desc="Request script khusus sesuai gaya bermainmu."
            />
          </div>

          {/* New Release Carousel */}
          <div className="mb-6">
            <div className="flex justify-between items-end border-b border-zinc-800/60 pb-4 mb-6">
              <div>
                <h2 className="text-xl md:text-3xl font-black text-white flex items-center gap-2.5 tracking-tight">
                  <Star className="text-yellow-500 fill-yellow-500" size={20} /> New Release
                </h2>
                <p className="text-zinc-600 text-xs mt-0.5">Update terbaru untuk koleksimu</p>
              </div>
              <Link
                to="/mods"
                className="text-green-500 hover:text-green-400 font-bold text-xs uppercase tracking-widest flex items-center gap-1 transition-colors"
              >
                Lihat Semua <ArrowRight size={13} />
              </Link>
            </div>

            <ModCarousel mods={featuredMods} loading={loading} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;