import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, Layers, Cpu, Globe, Monitor, Smartphone } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { getMods } from '../services/data';
import { ModItem, CATEGORIES, PLATFORMS, CategoryType, PlatformType } from '../types';

// Skeleton card untuk loading state
const SkeletonCard = () => (
  <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden animate-pulse">
    <div className="h-48 bg-zinc-800/60" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-zinc-800 rounded w-3/4" />
      <div className="h-3 bg-zinc-800/60 rounded w-1/2" />
      <div className="h-3 bg-zinc-800/60 rounded w-full" />
      <div className="h-3 bg-zinc-800/60 rounded w-5/6" />
      <div className="h-9 bg-zinc-800 rounded-lg mt-4" />
    </div>
  </div>
);

const Mods: React.FC = () => {
  const [mods, setMods] = useState<ModItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'All'>('All');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | 'All'>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getMods();
        setMods(data);
      } catch (error) {
        console.error('Gagal mengambil data mod', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredMods = mods.filter(mod => {
    const matchesSearch =
      mod.title.toLowerCase().includes(search.toLowerCase()) ||
      mod.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || mod.category === selectedCategory;
    const matchesPlatform =
      selectedPlatform === 'All' || mod.platform === selectedPlatform || mod.platform === 'Universal';
    return matchesSearch && matchesCategory && matchesPlatform;
  });

  const platformIcons: Record<string, React.ReactNode> = {
    All: <Globe size={13} />,
    PC: <Monitor size={13} />,
    Android: <Smartphone size={13} />,
    Universal: <Globe size={13} />,
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Page Header */}
      <div className="relative overflow-hidden bg-[#0f0f0f] border-b border-zinc-800/60">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-20%,rgba(21,128,61,0.08),transparent)]" />
        <div className="max-w-7xl mx-auto px-4 py-10 relative">
          <div className="flex items-center gap-2 text-green-600 text-xs font-bold uppercase tracking-widest mb-3">
            <Layers size={13} />
            <span>Koleksi Eksklusif</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-3">
            GUDANG <span className="text-green-600">MOD</span>
          </h1>
          <p className="text-zinc-500 max-w-lg text-sm leading-relaxed">
            Script Lua, modifikasi visual, dan tools untuk GTA San Andreas. Semua dikurasi khusus untuk komunitas SAMP Indonesia.
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-5 mt-5 text-xs text-zinc-600">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
              {mods.length} Mod tersedia
            </span>
            <span>{mods.filter(m => !m.isPremium).length} Gratis</span>
            <span className="text-yellow-600">{mods.filter(m => m.isPremium).length} Premium</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search & Filter Bar */}
        <div className="bg-[#111] border border-zinc-800/80 p-3.5 rounded-2xl mb-8 sticky top-16 z-30 shadow-2xl shadow-black/50 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
              <input
                type="text"
                placeholder="Cari script, modpack, skin..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-white pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-900 transition-all placeholder:text-zinc-700"
              />
            </div>

            {/* Category filter */}
            <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as CategoryType | 'All')}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 py-2.5 px-3 rounded-xl text-xs focus:outline-none focus:border-zinc-600 appearance-none cursor-pointer min-w-fit"
              >
                <option value="All">Semua Kategori</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Platform pills */}
              <div className="flex gap-1.5">
                {(['All', ...PLATFORMS] as (PlatformType | 'All')[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setSelectedPlatform(p)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                      selectedPlatform === p
                        ? 'bg-green-700 text-white shadow-md shadow-green-900/40'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    {platformIcons[p] || <Globe size={13} />}
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active filters indicator */}
          {(search || selectedCategory !== 'All' || selectedPlatform !== 'All') && (
            <div className="mt-2.5 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between">
              <p className="text-xs text-zinc-500">
                Menampilkan <span className="text-white font-semibold">{filteredMods.length}</span> dari {mods.length} mod
              </p>
              <button
                onClick={() => { setSearch(''); setSelectedCategory('All'); setSelectedPlatform('All'); }}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
              >
                Reset filter
              </button>
            </div>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filteredMods.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredMods.map((mod, i) => (
              <div
                key={mod.id}
                className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms`, animationFillMode: 'both' }}
              >
                <ProductCard mod={mod} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 border border-dashed border-zinc-800/60 rounded-2xl bg-zinc-900/20">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
              <Filter size={28} className="text-zinc-600" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Tidak ditemukan</h3>
            <p className="text-zinc-600 text-sm">Coba ganti kata kunci atau filter kategori.</p>
            <button
              onClick={() => { setSearch(''); setSelectedCategory('All'); setSelectedPlatform('All'); }}
              className="mt-4 text-green-500 hover:text-green-400 text-sm font-semibold transition-colors"
            >
              Reset semua filter
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Mods;