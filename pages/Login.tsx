import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DiscordLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.042.032.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
  </svg>
);

const Login: React.FC = () => {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from     = (location.state as any)?.from?.pathname || '/';

  // Sudah login → redirect
  useEffect(() => {
    if (!loading && user) {
      // Cek apakah ada halaman yang disimpan sebelum login
      const saved = sessionStorage.getItem('login_redirect');
      if (saved) {
        sessionStorage.removeItem('login_redirect');
        navigate(saved.replace('#', ''), { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    }
  }, [user, loading, navigate, from]);

  // Spinner — hanya tampil kalau benar-benar loading (fetch session)
  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#5865F2] border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-600 text-xs">Memuat sesi...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 relative">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#5865F2]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="bg-[#141414] border border-zinc-800/80 rounded-2xl p-8 shadow-2xl text-center">

          {/* Discord icon */}
          <div className="w-16 h-16 bg-[#5865F2]/10 border border-[#5865F2]/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg viewBox="0 0 24 24" fill="#5865F2" className="w-8 h-8">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.042.032.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
          </div>

          <h1 className="text-white font-heading font-black text-2xl mb-2">Masuk ke Forge</h1>
          <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
            Login dengan akun Discord kamu untuk mengakses konten & fitur member.
          </p>

          {/* Tier info */}
          <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4 mb-6 text-left space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-yellow-500/15 border border-yellow-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-sm">👑</span>
              </div>
              <div>
                <p className="text-xs font-bold text-yellow-400">Role VIP</p>
                <p className="text-[10px] text-zinc-500">Download semua mod termasuk premium</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-sm">🛡️</span>
              </div>
              <div>
                <p className="text-xs font-bold text-blue-400">Role Basic / Member</p>
                <p className="text-[10px] text-zinc-500">Hanya akses mod gratis</p>
              </div>
            </div>
          </div>

          {/* Login button */}
          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-sm py-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#5865F2]/20"
          >
            <DiscordLogo />
            Login dengan Discord
          </button>

          <p className="text-[10px] text-zinc-700 mt-4 leading-relaxed">
            Dengan login, kamu menyetujui akses baca profil & role Discord kamu di server kami.
          </p>
        </div>

        <div className="text-center mt-4">
          <button
            onClick={() => navigate(-1)}
            className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
          >
            ← Kembali tanpa login
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;