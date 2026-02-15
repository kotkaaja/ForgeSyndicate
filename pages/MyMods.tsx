// pages/MyMods.tsx - User manage their own mods
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import ModManage from '../components/ModManage';

const MyMods: React.FC = () => {
  const { user } = useAuth();

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
          <h1 className="text-xl font-black tracking-tight">MOD SAYA</h1>
          <p className="text-zinc-600 text-xs mt-0.5">
            Kelola mod yang sudah kamu upload
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <ModManage
          sessionId={sessionId}
          discordId={user.discordId}
          isAdmin={false}
        />
      </div>
    </div>
  );
};

export default MyMods;