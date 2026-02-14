import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Globe, Monitor, Smartphone, X, ChevronDown } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { getMods } from '../services/data';
import { ModItem, CATEGORIES, PLATFORMS, CategoryType, PlatformType } from '../types';

// Skeleton card
const SkeletonCard = () => (
  <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden animate-pulse">
    <div className="h-44 bg-zinc-800/60" />
    <div className="p-3.5 space-y-2.5">
      <div className="h-3.5 bg-zinc-800 rounded w-3/4" />
      <div className="h-2.5 bg-zinc-800/60 rounded w-1/2" />
      <div className="h-2.5 bg-zinc-800/60 rounded w-full" />
      <div className="h-2.5 bg-zinc-800/60 rounded w-5/6" />
      <div className="h-9 bg-zinc-800 rounded-lg mt-3" />
    </div>
  </div>
);

// Autocomplete Search
const AutocompleteSearch: React.FC<{
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
}> = ({ value, onChange, suggestions }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = value.length > 1
    ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()).slice(0, 6)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative flex-1">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" size={15} />
      <input
        type="text"
        placeholder="Cari script, modpack, skin..."
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full bg-zinc-950 border border-zinc-800 text-white pl-10 pr-9 py-2.5 rounded-xl text-sm focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-900/60 transition-all placeholder:text-zinc-700"
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors">
          <X size={14} />
        </button>
      )}

      {/* Dropdown suggestions */}
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#111] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {filtered.map(s => (
            <button
              key={s}
              className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-2"
              onMouseDown={() => { onChange(s); setOpen(false); }}
            >
              <Search size={12} className="text-zinc-600" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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

  const modTitles = mods.map(m => m.title);
  const hasFilter = search || selectedCategory !== 'All' || selectedPlatform !== 'All';

  const platformIcons: Record<string, React.ReactNode> = {
    All: <Globe size={12} />,
    PC: <Monitor size={12} />,
    Android: <Smartphone size={12} />,
    Universal: <Globe size={12} />,
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="relative overflow-hidden bg-[#0f0f0f] border-b border-zinc-800/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_-10%,rgba(21,128,61,0.07),transparent)]" />
        <div className="max-w-7xl mx-auto px-4 py-10 relative">
          <p className="text-green-600 text-xs font-bold uppercase tracking-widest mb-2">Koleksi Eksklusif</p>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
            GUDANG <span className="text-green-600">MOD</span>
          </h1>
          <p className="text-zinc-600 text-sm max-w-md">Script Lua, modifikasi visual, dan tools untuk GTA San Andreas.</p>
          {!loading && (
            <div className="flex items-center gap-4 mt-4 text-xs text-zinc-600">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                {mods.length} Mod
              </span>
              <span>{mods.filter(m => !m.isPremium).length} Gratis</span>
              <span className="text-yellow-600/80">{mods.filter(m => m.isPremium).length} VIP</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-7">
        {/* Search & Filter */}
        <div className="bg-[#111] border border-zinc-800/70 p-3.5 rounded-2xl mb-7 sticky top-16 z-30 shadow-2xl shadow-black/60">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Autocomplete search */}
            <AutocompleteSearch value={search} onChange={setSearch} suggestions={modTitles} />

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {/* Category dropdown */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as CategoryType | 'All')}
                  className="appearance-none bg-zinc-900 border border-zinc-800 text-zinc-300 py-2.5 pl-3 pr-8 rounded-xl text-xs focus:outline-none focus:border-zinc-600 cursor-pointer min-w-fit"
                >
                  <option value="All">Semua Kategori</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
              </div>

              {/* Platform pills */}
              {(['All', ...PLATFORMS] as (PlatformType | 'All')[]).map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedPlatform(p)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all flex-shrink-0
                    ${selectedPlatform === p
                      ? 'bg-green-700 text-white shadow-md shadow-green-900/40 border border-green-600'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                >
                  {platformIcons[p]}
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Active filter bar */}
          {hasFilter && !loading && (
            <div className="mt-3 pt-3 border-t border-zinc-800/50 flex items-center justify-between">
              <p className="text-xs text-zinc-600">
                <span className="text-white font-semibold">{filteredMods.length}</span> dari {mods.length} mod
              </p>
              <button
                onClick={() => { setSearch(''); setSelectedCategory('All'); setSelectedPlatform('All'); }}
                className="text-xs text-zinc-600 hover:text-red-400 flex items-center gap-1 transition-colors"
              >
                <X size={11} /> Reset filter
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
                style={{ animationDelay: `${Math.min(i * 35, 350)}ms`, animationFillMode: 'both' }}
              >
                <ProductCard mod={mod} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 border border-dashed border-zinc-800/50 rounded-2xl bg-zinc-900/10">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
              <Filter size={24} className="text-zinc-600" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Tidak ditemukan</h3>
            <p className="text-zinc-600 text-sm">Coba ganti kata kunci atau filter kategori.</p>
            <button
              onClick={() => { setSearch(''); setSelectedCategory('All'); setSelectedPlatform('All'); }}
              className="mt-4 text-green-500 hover:text-green-400 text-sm font-bold transition-colors"
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