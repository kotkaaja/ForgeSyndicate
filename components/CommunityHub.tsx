import React from 'react';
import { Gamepad2, Youtube, Music, MessageCircle, Link as LinkIcon, ArrowUpRight, Radio } from 'lucide-react';

interface SocialCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  colorClass: string; // Tailwind class for text color
  hoverBorderClass: string; // Tailwind class for hover border
  hoverShadowClass: string; // Tailwind class for hover shadow
  colSpan?: string; // Tailwind class for grid span
}

const SocialCard: React.FC<SocialCardProps> = ({ 
  href, icon, title, description, colorClass, hoverBorderClass, hoverShadowClass, colSpan = "col-span-1" 
}) => (
  <a 
    href={href} 
    target="_blank" 
    rel="noopener noreferrer"
    className={`${colSpan} group relative bg-[#1a1a1a] border border-zinc-800 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 ${hoverBorderClass} ${hoverShadowClass} overflow-hidden`}
  >
    {/* Decorative Background Icon */}
    <div className={`absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity transform scale-150 rotate-12 ${colorClass}`}>
      {icon}
    </div>

    <div className="relative z-10 flex flex-col h-full justify-between">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-lg bg-zinc-900 border border-zinc-800 ${colorClass}`}>
          {icon}
        </div>
        <ArrowUpRight className="text-zinc-600 group-hover:text-white transition-colors" size={20} />
      </div>
      
      <div>
        <h3 className="text-xl font-heading font-bold text-white mb-1 group-hover:text-white transition-colors">{title}</h3>
        <p className="text-zinc-500 text-sm group-hover:text-zinc-400 transition-colors line-clamp-2">{description}</p>
      </div>
    </div>
  </a>
);

const CommunityHub: React.FC = () => {
  return (
    <section className="py-16 bg-[#0f0f0f] relative border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Connect & Join</h2>
            <div className="h-1 w-24 bg-indigo-600"></div>
            <p className="text-zinc-400 mt-4 max-w-xl">
              Bergabunglah dengan ekosistem SA Forge. Dapatkan update instan, tutorial, dan berinteraksi dengan sesama scripter.
            </p>
          </div>
          <div className="flex items-center gap-2 text-zinc-500 text-sm animate-pulse">
            <Radio size={16} className="text-green-500" />
            <span>Systems Online</span>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(180px,auto)]">
          
          {/* 1. Discord (Priority - Large) */}
          <SocialCard 
            href="https://discord.gg/X2UW7VRqnB"
            icon={<Gamepad2 size={32} />}
            title="Discord Community"
            description="Markas besar kami. Diskusi script, request fitur, lapor bug, dan giveaway member VIP."
            colorClass="text-indigo-500"
            hoverBorderClass="hover:border-indigo-500"
            hoverShadowClass="hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]"
            colSpan="col-span-1 md:col-span-2 row-span-2 md:row-span-1"
          />

          {/* 2. YouTube */}
          <SocialCard 
            href="https://www.youtube.com/@kotkaaja"
            icon={<Youtube size={32} />}
            title="YouTube Channel"
            description="Tutorial pemasangan, showcase mod terbaru, dan tips scripting."
            colorClass="text-red-500"
            hoverBorderClass="hover:border-red-500"
            hoverShadowClass="hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]"
          />

          {/* 3. TikTok */}
          <SocialCard 
            href="https://www.tiktok.com/@kotkaaja"
            icon={<Music size={32} />}
            title="TikTok"
            description="Konten pendek, highlight fitur, dan sneak peek update."
            colorClass="text-pink-500"
            hoverBorderClass="hover:border-pink-500"
            hoverShadowClass="hover:shadow-[0_0_30px_rgba(236,72,153,0.2)]"
          />

          {/* 4. Lynk.id */}
          <SocialCard 
            href="https://lynk.id/KotkaPatch"
            icon={<LinkIcon size={32} />}
            title="Lynk.id / Store"
            description="Akses cepat ke semua link produk dan donasi."
            colorClass="text-cyan-500"
            hoverBorderClass="hover:border-cyan-500"
            hoverShadowClass="hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]"
            colSpan="col-span-1 md:col-span-2"
          />

          {/* 5. WhatsApp Channel */}
          <SocialCard 
            href="https://whatsapp.com/channel/0029VbC4K3MChq6OMektWG2V"
            icon={<MessageCircle size={32} />}
            title="Saluran WhatsApp"
            description="Notifikasi update script paling cepat langsung ke HP kamu."
            colorClass="text-green-500"
            hoverBorderClass="hover:border-green-500"
            hoverShadowClass="hover:shadow-[0_0_30px_rgba(34,197,94,0.2)]"
            colSpan="col-span-1 md:col-span-2"
          />

        </div>
      </div>
    </section>
  );
};

export default CommunityHub;