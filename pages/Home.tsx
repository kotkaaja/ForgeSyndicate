import React, { useState, useEffect } from 'react';
import { ArrowRight, Star, ShieldCheck, Zap, UserCog } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { getMods } from '../services/data';
import { ModItem } from '../types';

const Home: React.FC = () => {
  const [featuredMods, setFeaturedMods] = useState<ModItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allMods = await getMods();
        // Ambil 3 mod terbaru
        setFeaturedMods(allMods.slice(0, 3)); 
      } catch (error) {
        console.error("Gagal memuat data home", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Hero Section */}
      <section className="relative h-[550px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/80 to-transparent z-10"></div>
          {/* Background Image: Night City Vibe (Sudah terpasang) */}
          <img 
            src="https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=1920&auto=format&fit=crop" 
            alt="GTA Background" 
            className="w-full h-full object-cover opacity-30"
          />
        </div>
        
        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto mt-10">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 font-heading tracking-tighter">
            FORGE <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-700">SYNDICATE</span>
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl mb-8 max-w-2xl mx-auto leading-relaxed">
            Koleksi modifikasi visual, script Lua, dan tools eksklusif untuk <b>Personal Player</b> GTA San Andreas Multiplayer (SAMP). Bikin gameplay-mu lebih nyaman dan estetik.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/mods" 
              className="px-8 py-3 bg-green-700 hover:bg-green-600 text-white font-bold rounded uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(21,128,61,0.4)] flex items-center justify-center gap-2"
            >
              Cari Mod <ArrowRight size={20} />
            </Link>
            <Link 
              to="/services" 
              className="px-8 py-3 bg-transparent border border-zinc-700 hover:bg-zinc-800 text-white font-bold rounded uppercase tracking-wider transition-all flex items-center justify-center"
            >
              Request Script
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            {/* Feature 1: Fokus ke Ringan/FPS Player */}
            <div className="bg-[#1a1a1a] p-8 rounded border border-zinc-800 hover:border-green-800 transition-colors group">
              <Zap className="text-green-500 mb-4 group-hover:scale-110 transition-transform" size={40} />
              <h3 className="text-xl font-bold text-white mb-2">Lightweight & Fast</h3>
              <p className="text-zinc-500">
                Script yang ditulis dengan efisien agar ringan dijalankan di PC & Android kentang sekalipun, tanpa bikin FPS drop.
              </p>
            </div>

            {/* Feature 2: Fokus ke Keamanan Akun/Client Side */}
            <div className="bg-[#1a1a1a] p-8 rounded border border-zinc-800 hover:border-green-800 transition-colors group">
              <ShieldCheck className="text-green-500 mb-4 group-hover:scale-110 transition-transform" size={40} />
              <h3 className="text-xl font-bold text-white mb-2">Safe for Daily Use</h3>
              <p className="text-zinc-500">
                Mod yang aman (legit) digunakan untuk aktivitas sehari-hari di berbagai server SAMP kesayanganmu.
              </p>
            </div>

            {/* Feature 3: Fokus ke Personal Customization */}
            <div className="bg-[#1a1a1a] p-8 rounded border border-zinc-800 hover:border-green-800 transition-colors group">
              <UserCog className="text-green-500 mb-4 group-hover:scale-110 transition-transform" size={40} />
              <h3 className="text-xl font-bold text-white mb-2">Personal Custom</h3>
              <p className="text-zinc-500">
                Ingin fitur unik yang cuma kamu yang punya? Kami menerima request pembuatan script khusus sesuai gaya bermainmu.
              </p>
            </div>
          </div>

          {/* Featured Mods Section */}
          <div className="flex justify-between items-end mb-8 border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                <Star className="text-yellow-500 fill-yellow-500" /> New Release
              </h2>
              <p className="text-zinc-500 mt-1">Update terbaru untuk koleksi pribadimu</p>
            </div>
            <Link to="/mods" className="text-green-500 hover:text-green-400 font-bold text-sm uppercase tracking-wide">
              Lihat Semua
            </Link>
          </div>

          {/* Grid Mod (Async Data) */}
          {loading ? (
             <div className="text-center py-20 text-zinc-500">Sedang memuat data...</div>
          ) : featuredMods.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {featuredMods.map((mod) => (
                 <ProductCard key={mod.id} mod={mod} />
               ))}
             </div>
          ) : (
            <div className="text-center py-20 bg-[#1a1a1a] rounded border border-dashed border-zinc-800">
                <p className="text-zinc-500">Belum ada mod yang ditampilkan.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;