import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Download, Lock, Share2, Calendar, User, Monitor, Smartphone } from 'lucide-react';
import { getModById, getUserRole } from '../services/data';
import { ModItem, UserRole } from '../types';

const ModDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [mod, setMod] = useState<ModItem | null>(null);
  const [role, setRole] = useState<UserRole>('GUEST');
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (id) {
        const data = await getModById(id);
        setMod(data || null);
      }
      setRole(getUserRole());
      setLoading(false);
    };

    fetchData();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-white">Loading...</div>;
  }

  if (!mod) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-zinc-500">
        <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-2">404 - Mod Not Found</h2>
            <Link to="/mods" className="text-green-500 hover:underline">Kembali ke Gudang Mod</Link>
        </div>
      </div>
    );
  }

  // Helper: Embed System
  const getEmbedUrl = (url: string | undefined) => {
    if (!url) return null;
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('tiktok.com')) {
      const match = url.match(/\/video\/(\d+)/);
      if (match && match[1]) {
        return `https://www.tiktok.com/embed/v2/${match[1]}`;
      }
    }
    return null;
  };

  const embedUrl = getEmbedUrl(mod.mediaUrl);
  const canDownload = !mod.isPremium || role === 'VIP' || role === 'ADMIN';

  return (
    <div className="min-h-screen bg-[#0f0f0f] pb-20">
      {/* Header Image */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] to-transparent z-10"></div>
        <img src={mod.imageUrl} alt={mod.title} className="w-full h-full object-cover opacity-50 blur-sm" />
        
        <div className="absolute top-4 left-4 z-20">
          <Link to="/mods" className="flex items-center gap-2 text-zinc-300 hover:text-white bg-black/50 px-4 py-2 rounded-full backdrop-blur transition-colors">
            <ArrowLeft size={18} /> Kembali
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-20 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#1a1a1a] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
              {/* Media Player */}
              {embedUrl ? (
                <div className="aspect-video w-full bg-black">
                  <iframe 
                    src={embedUrl} 
                    title="Video Preview"
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  ></iframe>
                </div>
              ) : (
                <div className="aspect-video w-full bg-zinc-900 flex items-center justify-center border-b border-zinc-800 relative group overflow-hidden">
                    <img src={mod.imageUrl} className="w-full h-full object-cover absolute inset-0 opacity-50 group-hover:opacity-75 transition-opacity" />
                    <span className="relative z-10 bg-black/50 px-4 py-2 rounded text-zinc-300 backdrop-blur">Preview Gambar</span>
                </div>
              )}
              
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-green-900/30 text-green-500 border border-green-800 px-3 py-1 rounded text-xs font-bold uppercase tracking-wide">
                    {mod.category}
                  </span>
                  {mod.isPremium && (
                    <span className="bg-yellow-600/20 text-yellow-500 border border-yellow-600/50 px-3 py-1 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                      <Lock size={12} /> Premium
                    </span>
                  )}
                </div>

                <h1 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                  {mod.title}
                </h1>

                <div className="prose prose-invert prose-zinc max-w-none text-zinc-400 mb-8 border-t border-zinc-800/50 pt-6">
                  <p>{mod.description}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar / Actions */}
          <div className="space-y-6">
            <div className="bg-[#1a1a1a] border border-zinc-800 p-6 rounded-xl sticky top-24">
              <h3 className="text-white font-heading text-xl font-bold mb-6 border-l-4 border-green-600 pl-3">
                Informasi File
              </h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                  <span className="text-zinc-500 flex items-center gap-2"><User size={16}/> Creator</span>
                  <span className="text-white font-medium">{mod.author}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                  <span className="text-zinc-500 flex items-center gap-2"><Calendar size={16}/> Diupload</span>
                  <span className="text-white font-medium">{mod.dateAdded}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                  <span className="text-zinc-500 flex items-center gap-2">
                    {mod.platform === 'Android' ? <Smartphone size={16} /> : <Monitor size={16} />} 
                    Platform
                  </span>
                  <span className="text-green-500 font-medium">{mod.platform}</span>
                </div>
              </div>

              {canDownload ? (
                <a 
                  href={mod.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-heading font-bold text-lg py-4 rounded shadow-lg shadow-green-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Download size={24} /> DOWNLOAD SEKARANG
                </a>
              ) : (
                <div className="text-center bg-zinc-900/50 p-6 rounded border border-red-900/30">
                  <Lock size={48} className="mx-auto text-zinc-600 mb-4" />
                  <h4 className="text-white font-bold mb-2">Konten Terkunci</h4>
                  <p className="text-zinc-500 text-sm mb-4">
                    Ini adalah konten Premium. Anda harus menjadi VIP Member untuk mengunduh file ini.
                  </p>
                  <Link 
                    to="/login" 
                    state={{ from: location }}
                    className="block w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 rounded transition-colors"
                  >
                    Masuk / Input Token
                  </Link>
                </div>
              )}
              
              <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
                 <button className="text-zinc-500 hover:text-white flex items-center justify-center gap-2 w-full text-sm">
                    <Share2 size={16} /> Bagikan Mod Ini
                 </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ModDetail;