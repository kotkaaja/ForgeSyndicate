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
      {/* Left arrow */}
      <button
        onClick={() => scroll('left')}
        className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-xl transition-all duration-300
          ${canScrollLeft ? 'opacity-100 hover:bg-zinc-800 hover:border-green-700' : 'opacity-0 pointer-events-none'}`}
      >
        <ChevronLeft size={20} className="text-white" />
      </button>

      {/* Right arrow */}
      <button
        onClick={() => scroll('right')}
        className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-xl transition-all duration-300
          ${canScrollRight ? 'opacity-100 hover:bg-zinc-800 hover:border-green-700' : 'opacity-0 pointer-events-none'}`}
      >
        <ChevronRight size={20} className="text-white" />
      </button>

      {/* Scrollable track */}
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto pb-3 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Fade edges */}
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

const Home: React.FC = () => {
  const [featuredMods, setFeaturedMods] = useState<ModItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allMods = await getMods();
        setFeaturedMods(allMods.slice(0, 8)); // Ambil lebih banyak buat carousel
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
      <section className="relative h-[560px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/80 to-transparent z-10" />
          <img
            src="https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=1920&auto=format&fit=crop"
            alt="GTA Background"
            className="w-full h-full object-cover opacity-30"
          />
          {/* Subtle grid overlay */}
          <div className="absolute inset-0 z-10 opacity-10"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '48px 48px'
            }}
          />
        </div>

        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto mt-10">
          <div className="inline-flex items-center gap-2 text-green-600 text-xs font-bold uppercase tracking-widest mb-5 bg-green-900/20 border border-green-900/40 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            GTA SA Modding Community
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-5 tracking-tighter leading-none">
            FORGE <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">SYNDICATE</span>
          </h1>
          <p className="text-zinc-400 text-base md:text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
            Koleksi modifikasi visual, script Lua, dan tools eksklusif untuk <b className="text-zinc-200">Personal Player</b> GTA San Andreas Multiplayer. Bikin gameplay lebih nyaman dan estetik.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/mods"
              className="px-8 py-3 bg-green-700 hover:bg-green-600 text-white font-black rounded-xl uppercase tracking-widest transition-all shadow-[0_0_24px_rgba(21,128,61,0.35)] hover:shadow-[0_0_32px_rgba(21,128,61,0.5)] flex items-center justify-center gap-2 text-sm"
            >
              Cari Mod <ArrowRight size={18} />
            </Link>
            <Link
              to="/services"
              className="px-8 py-3 bg-transparent border border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 text-white font-black rounded-xl uppercase tracking-widest transition-all flex items-center justify-center text-sm"
            >
              Request Script
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-20">
            <div className="bg-[#1a1a1a] p-7 rounded-xl border border-zinc-800 hover:border-green-800/60 transition-all duration-300 group hover:-translate-y-1">
              <Zap className="text-green-500 mb-4 group-hover:scale-110 transition-transform" size={36} />
              <h3 className="text-lg font-black text-white mb-2 tracking-tight">Lightweight & Fast</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Script yang ditulis efisien agar ringan di PC & Android kentang sekalipun, tanpa bikin FPS drop.
              </p>
            </div>
            <div className="bg-[#1a1a1a] p-7 rounded-xl border border-zinc-800 hover:border-green-800/60 transition-all duration-300 group hover:-translate-y-1">
              <ShieldCheck className="text-green-500 mb-4 group-hover:scale-110 transition-transform" size={36} />
              <h3 className="text-lg font-black text-white mb-2 tracking-tight">Safe for Daily Use</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Mod yang aman (legit) digunakan untuk aktivitas sehari-hari di berbagai server SAMP kesayanganmu.
              </p>
            </div>
            <div className="bg-[#1a1a1a] p-7 rounded-xl border border-zinc-800 hover:border-green-800/60 transition-all duration-300 group hover:-translate-y-1">
              <UserCog className="text-green-500 mb-4 group-hover:scale-110 transition-transform" size={36} />
              <h3 className="text-lg font-black text-white mb-2 tracking-tight">Personal Custom</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">
                Ingin fitur unik yang cuma kamu punya? Kami menerima request pembuatan script khusus sesuai gaya bermainmu.
              </p>
            </div>
          </div>

          {/* ===== NEW RELEASE - CAROUSEL ===== */}
          <div className="mb-6">
            <div className="flex justify-between items-end border-b border-zinc-800/60 pb-4 mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2.5 tracking-tight">
                  <Star className="text-yellow-500 fill-yellow-500" size={22} /> New Release
                </h2>
                <p className="text-zinc-600 text-sm mt-1">Update terbaru untuk koleksi pribadimu</p>
              </div>
              <Link
                to="/mods"
                className="text-green-500 hover:text-green-400 font-bold text-xs uppercase tracking-widest flex items-center gap-1 transition-colors"
              >
                Lihat Semua <ArrowRight size={14} />
              </Link>
            </div>

            {/* Carousel component */}
            <ModCarousel mods={featuredMods} loading={loading} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;