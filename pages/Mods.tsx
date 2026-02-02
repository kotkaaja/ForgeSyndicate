import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { getMods } from '../services/data';
import { ModItem, CATEGORIES, PLATFORMS, CategoryType, PlatformType } from '../types';

const Mods: React.FC = () => {
  const [mods, setMods] = useState<ModItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'All'>('All');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | 'All'>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fungsi fetch data asinkron
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getMods();
        setMods(data);
      } catch (error) {
        console.error("Gagal mengambil data mod", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredMods = mods.filter(mod => {
    const matchesSearch = mod.title.toLowerCase().includes(search.toLowerCase()) || 
                          mod.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || mod.category === selectedCategory;
    const matchesPlatform = selectedPlatform === 'All' || mod.platform === selectedPlatform || mod.platform === 'Universal';
    
    return matchesSearch && matchesCategory && matchesPlatform;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">Gudang Mod</h1>
        <p className="text-zinc-400">Temukan koleksi modifikasi GTA San Andreas terbaik, terkurasi untuk komunitas.</p>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg mb-8 sticky top-20 z-30 shadow-xl">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={20} />
            <input 
              type="text" 
              placeholder="Cari script, modpack, skin..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 text-white pl-10 pr-4 py-2.5 rounded focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-all"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value as CategoryType | 'All')}
              className="bg-zinc-950 border border-zinc-700 text-zinc-300 py-2.5 px-4 rounded focus:outline-none focus:border-green-600 appearance-none"
            >
              <option value="All">Semua Kategori</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select 
              value={selectedPlatform} 
              onChange={(e) => setSelectedPlatform(e.target.value as PlatformType | 'All')}
              className="bg-zinc-950 border border-zinc-700 text-zinc-300 py-2.5 px-4 rounded focus:outline-none focus:border-green-600 appearance-none"
            >
              <option value="All">Semua Platform</option>
              {PLATFORMS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw className="animate-spin text-green-500" size={40} />
        </div>
      ) : filteredMods.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMods.map(mod => (
            <ProductCard key={mod.id} mod={mod} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-zinc-800 rounded bg-zinc-900/50">
          <Filter size={48} className="mx-auto text-zinc-600 mb-4" />
          <h3 className="text-xl text-white font-bold">Mod tidak ditemukan</h3>
          <p className="text-zinc-500">Coba ganti kata kunci pencarian atau filter kategori.</p>
        </div>
      )}
    </div>
  );
};

export default Mods;