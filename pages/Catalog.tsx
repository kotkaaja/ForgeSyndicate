// pages/Catalog.tsx
import React, { useState, useEffect } from 'react';
import { Crown, CheckCircle, Filter } from 'lucide-react';
import { getMods } from '../services/data';
import { ModItem } from '../types';
import ProductCard from '../components/ProductCard';

const Catalog: React.FC = () => {
  const [mods, setMods] = useState<ModItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'official' | 'verified' | 'unofficial'>('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getMods();
        setMods(data);
      } catch (error) {
        console.error('Failed to load mods', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter mods by approval status
  const officialMods = mods.filter(m => (m as any).approval_status === 'official');
  const verifiedMods = mods.filter(m => (m as any).approval_status === 'verified');
  const unofficialMods = mods.filter(m => (m as any).approval_status === 'unofficial');

  const displayMods = 
    filter === 'all' ? mods :
    filter === 'official' ? officialMods :
    filter === 'verified' ? verifiedMods :
    unofficialMods;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-16">
      <div className="max-w-7xl mx-auto px-4 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2">KATALOG MOD</h1>
          <p className="text-zinc-500 text-sm">Browse mod berdasarkan status approval</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              filter === 'all' 
                ? 'bg-green-700 text-white' 
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Semua ({mods.length})
          </button>
          <button 
            onClick={() => setFilter('official')}
            className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
              filter === 'official' 
                ? 'bg-yellow-700 text-white' 
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <Crown size={14}/> Official ({officialMods.length})
          </button>
          <button 
            onClick={() => setFilter('verified')}
            className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
              filter === 'verified' 
                ? 'bg-blue-700 text-white' 
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            <CheckCircle size={14}/> Verified ({verifiedMods.length})
          </button>
          <button 
            onClick={() => setFilter('unofficial')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              filter === 'unofficial' 
                ? 'bg-zinc-700 text-white' 
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Unofficial ({unofficialMods.length})
          </button>
        </div>

        {/* Official Section (highlighted) */}
        {(filter === 'all' || filter === 'official') && officialMods.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 px-4 py-2 rounded-xl border border-yellow-500/40">
                <Crown size={16} className="text-yellow-400"/>
                <h2 className="text-yellow-400 font-black uppercase tracking-wider">
                  Mod Official
                </h2>
              </div>
              <p className="text-zinc-500 text-sm">Diverifikasi & Dijamin Aman</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {officialMods.map(mod => (
                <ProductCard key={mod.id} mod={mod}/>
              ))}
            </div>
          </div>
        )}

        {/* Verified Section */}
        {(filter === 'all' || filter === 'verified') && verifiedMods.length > 0 && (
          <div className="mb-12">
            <h2 className="text-blue-400 font-bold mb-4 flex items-center gap-2">
              <CheckCircle size={18}/> Mod Verified
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {verifiedMods.map(mod => (
                <ProductCard key={mod.id} mod={mod}/>
              ))}
            </div>
          </div>
        )}

        {/* Unofficial Section */}
        {(filter === 'all' || filter === 'unofficial') && unofficialMods.length > 0 && (
          <div>
            <h2 className="text-zinc-400 font-bold mb-4">Mod Unofficial</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {unofficialMods.map(mod => (
                <ProductCard key={mod.id} mod={mod}/>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {displayMods.length === 0 && (
          <div className="text-center py-24 border border-dashed border-zinc-800/50 rounded-2xl bg-zinc-900/10">
            <Filter size={40} className="text-zinc-600 mx-auto mb-4"/>
            <h3 className="text-white font-bold mb-2">Tidak ada mod</h3>
            <p className="text-zinc-500 text-sm">Coba filter yang lain</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Catalog;