// ── Tambahkan ini ke Navbar.tsx kamu ─────────────────────────────────────
// Ganti bagian login button lama dengan komponen ini

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Crown, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Discord logo SVG inline
const DiscordIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.042.032.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
  </svg>
);

// ── Komponen auth button untuk Navbar ─────────────────────────────────────
export const NavbarAuthButton: React.FC = () => {
  const { user, login, logout, isVIP } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <button onClick={login}
        className="flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
        <DiscordIcon /> Login
      </button>
    );
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 px-3 py-1.5 rounded-xl transition-all">
        {/* Avatar */}
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-lg object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-lg bg-zinc-700 flex items-center justify-center text-white font-bold text-xs">
            {user.username.slice(0,2).toUpperCase()}
          </div>
        )}
        <div className="text-left hidden sm:block">
          <p className="text-white text-xs font-bold leading-none">{user.username}</p>
          <p className={`text-[10px] leading-none mt-0.5 ${isVIP ? 'text-yellow-400' : 'text-blue-400'}`}>
            {isVIP ? '👑 VIP' : '🛡️ Basic'}
          </p>
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-40 w-52 bg-[#1a1a1a] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
            {/* User info */}
            <div className="px-4 py-3 border-b border-zinc-800/80">
              <p className="text-white font-bold text-sm">{user.username}</p>
              <div className="flex items-center gap-1.5 mt-1">
                {isVIP
                  ? <span className="text-[10px] bg-yellow-500/15 text-yellow-400 border border-yellow-600/30 px-2 py-0.5 rounded font-bold flex items-center gap-1"><Crown size={9}/> VIP</span>
                  : <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-600/20 px-2 py-0.5 rounded font-bold flex items-center gap-1"><Shield size={9}/> BASIC</span>
                }
              </div>
            </div>

            {/* Expiry info */}
            {user.expiry && (
              <div className="px-4 py-2 border-b border-zinc-800/60">
                <p className="text-[10px] text-zinc-600">Aktif hingga</p>
                <p className="text-xs text-zinc-300 font-medium">
                  {new Date(user.expiry).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            )}

            {/* Logout */}
            <button onClick={() => { logout(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-400 hover:text-red-400 hover:bg-red-950/20 transition-colors">
              <LogOut size={14} /> Keluar
            </button>
          </div>
        </>
      )}
    </div>
  );
};