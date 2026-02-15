// pages/MyMods.tsx - FINAL FIXED VERSION
// All TypeScript errors resolved with proper optional chaining

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Upload, Loader2, Plus } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { ModItem } from '../types';

const MyMods: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mods, setMods] = useState<ModItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.discordId) {
      fetchMyMods();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchMyMods = async () => {
    try {
      setLoading(true);
      const sessionId = localStorage.getItem('ds_session_id');
      
      if (!user?.discordId) {
        setError('User data tidak lengkap');
        setLoading(false);
        return;
      }
      
      // Use admin endpoint with user filter
      const response = await fetch('/api/admin/mods', {
        headers: {
          'Authorization': `Bearer ${sessionId || ''}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch mods');
      
      const data = await response.json();
      
      // Filter mods by current user
      const userMods = (data.mods || []).filter(
        (m: any) => m.uploaded_by === user?.discordId
      );
      
      setMods(userMods);
    } catch (err) {
      console.error('Error fetching mods:', err);
      setError('Gagal memuat mod');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <AlertTriangle size={40} className="text-yellow-500 mx-auto" />
          <p className="text-zinc-400">
            Kamu harus <Link to="/login" className="text-green-400 underline">login</Link> dulu.
          </p>
        </div>
      </div>
    );
  }

  const sessionId = localStorage.getItem('ds_session_id');
  if (!sessionId) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <AlertTriangle size={40} className="text-yellow-500 mx-auto" />
          <p className="text-zinc-400">Session expired. Silakan login ulang.</p>
          <Link to="/login" className="inline-block text-green-400 underline">Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-16">
      {/* Header */}
      <div className="border-b border-zinc-800/60 bg-[#0d0d0d] px-4 py-5">
        <div className="max-w-7xl mx-auto">
          <Link
            to="/mods"
            className="text-zinc-600 hover:text-white flex items-center gap-1.5 text-xs mb-3 transition-colors"
          >
            <ArrowLeft size={13} /> Kembali
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight">MOD SAYA</h1>
              <p className="text-zinc-600 text-xs mt-0.5">
                Kelola mod yang sudah kamu upload — termasuk yang menunggu review admin
              </p>
            </div>
            
            {/* Upload Button */}
            <button
              onClick={() => navigate('/mod-submit')}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} />
              Upload Mod Baru
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-green-500" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" />
            <p className="text-zinc-400">{error}</p>
          </div>
        ) : mods.length === 0 ? (
          <div className="text-center py-20">
            <Upload size={48} className="text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 mb-4">Kamu belum upload mod apapun</p>
            <button
              onClick={() => navigate('/mod-submit')}
              className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-2 rounded-lg transition-colors"
            >
              Upload Mod Pertamamu
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-4 text-sm text-zinc-500">
              Total: {mods.length} mod
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {mods.map(mod => (
                <ProductCard
                  key={mod.id}
                  mod={mod}
                  onClick={() => navigate(`/mod/${mod.id}`)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyMods;