import React from 'react';
import CommunityHub from '../components/CommunityHub';

const Community: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Header Tambahan untuk Halaman Khusus */}
      <div className="pt-20 pb-0 text-center px-4">
        <span className="text-green-500 font-bold tracking-widest text-sm uppercase mb-2 block">
            Official Channels
        </span>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 font-heading">
            PUSAT KOMUNITAS
        </h1>
        <p className="text-zinc-400 max-w-2xl mx-auto">
            Ikuti perkembangan terbaru dan berinteraksi langsung dengan developer serta member lainnya.
        </p>
      </div>
      
      {/* Komponen Utama */}
      <CommunityHub />
    </div>
  );
};

export default Community;