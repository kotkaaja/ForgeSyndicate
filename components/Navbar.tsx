import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Shield, Crown, ChevronDown, LogOut, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isVIP } = useAuth();

  // Cek apakah user punya role Admin dari Discord guild roles
  const isAdmin = user?.guildRoles?.some(role =>
    ['Admin', 'Administrator', 'Owner', 'Founder', 'Co-Founder'].includes(role)
  ) ?? false;

  const navLinks = [
    { name: 'Beranda', path: '/' },
    { name: 'Gudang Mod', path: '/mods' },
    { name: 'Jasa Scripting', path: '/services' },
    { name: 'Lua Shield', path: '/tools/obfuscator', isNew: true },
    { name: 'LuaJIT Compiler', path: '/tools/compiler', isNew: true },
    { name: 'Komunitas', path: '/community' },
  ];

  const handleLogout = async () => {
    setProfileOpen(false);
    setIsOpen(false);
    await logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  // Tutup dropdown kalau klik di luar
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#profile-dropdown')) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <nav className="bg-[#0f0f0f] border-b border-zinc-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* LOGO */}
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 group">
              <span className="font-heading text-2xl font-bold text-green-600 tracking-tighter group-hover:opacity-80 transition-opacity">
                FORGE<span className="text-white">SYNDICATE</span>
              </span>
            </Link>

            {/* DESKTOP NAV LINKS */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`relative px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      isActive(link.path)
                        ? 'bg-green-900/10 text-green-500 border border-green-900/30'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                    }`}
                  >
                    {link.name}
                    {link.isNew && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="hidden md:flex items-center gap-3">

            {/* GUEST → tampilkan tombol login */}
            {!user ? (
              <Link
                to="/login"
                className="bg-green-700 hover:bg-green-600 text-white px-5 py-2 rounded-sm font-heading font-bold text-sm tracking-wide transition-all hover:shadow-[0_0_15px_rgba(21,128,61,0.5)]"
              >
                LOGIN MEMBER
              </Link>
            ) : (
              /* LOGGED IN → profile dropdown */
              <div className="relative" id="profile-dropdown">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-xl transition-all"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.username}
                      className="w-7 h-7 rounded-lg object-cover border border-zinc-700"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-zinc-700 flex items-center justify-center text-white text-xs font-black">
                      {user.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="text-left">
                    <p className="text-white text-xs font-bold leading-none">{user.username}</p>
                    <p className={`text-[9px] font-black uppercase leading-none mt-0.5 ${isVIP ? 'text-yellow-500' : 'text-blue-400'}`}>
                      {isAdmin ? 'ADMIN' : user.tier}
                    </p>
                  </div>

                  <ChevronDown
                    size={13}
                    className={`text-zinc-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Profile Dropdown */}
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-[#141414] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-zinc-800/60 bg-zinc-900/40">
                      <div className="flex items-center gap-2.5">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-xl object-cover border border-zinc-700" />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-zinc-700 flex items-center justify-center text-white font-black text-sm">
                            {user.username.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-white text-sm font-bold truncate">{user.username}</p>
                          <span className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider mt-0.5 ${
                            isAdmin
                              ? 'bg-red-500/20 text-red-400 border-red-500/40'
                              : isVIP
                              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                              : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                          }`}>
                            {isAdmin ? <Shield size={8} /> : isVIP ? <Crown size={8} /> : <Shield size={8} />}
                            {isAdmin ? 'ADMIN' : user.tier}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <a
                        href={`https://discord.com/users/${user.discordId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors text-sm"
                      >
                        <ExternalLink size={13} />
                        Profil Discord
                      </a>

                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-900/15 transition-colors text-sm font-bold"
                        >
                          <Shield size={13} />
                          Panel Admin
                        </Link>
                      )}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-zinc-800/60 py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-colors text-sm"
                      >
                        <LogOut size={13} />
                        Keluar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MOBILE MENU BUTTON */}
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 focus:outline-none transition-colors"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE DROPDOWN */}
      {isOpen && (
        <div className="md:hidden bg-[#0f0f0f] border-b border-zinc-800 animate-in slide-in-from-top-2 duration-200">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">

            {/* Mobile: info user kalau sudah login */}
            {user && (
              <div className="flex items-center gap-3 px-3 py-3 mb-2 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover border border-zinc-700" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-zinc-700 flex items-center justify-center text-white font-black">
                    {user.username.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-white font-bold text-sm">{user.username}</p>
                  <span className={`text-[10px] font-black uppercase ${isAdmin ? 'text-red-400' : isVIP ? 'text-yellow-400' : 'text-blue-400'}`}>
                    {isAdmin ? 'ADMIN' : user.tier}
                  </span>
                </div>
              </div>
            )}

            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive(link.path)
                    ? 'text-green-500 bg-green-900/10 border border-green-900/20'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span>{link.name}</span>
                {link.isNew && (
                  <span className="text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded">NEW</span>
                )}
              </Link>
            ))}

            <div className="border-t border-zinc-800 my-2 pt-2">
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 text-red-500 font-bold hover:bg-red-900/10 rounded-md"
                >
                  <div className="flex items-center gap-2"><Shield size={16} /> Panel Admin</div>
                </Link>
              )}

              {!user ? (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="block mt-2 text-center bg-green-700 hover:bg-green-600 text-white px-3 py-3 rounded-md font-bold transition-colors"
                >
                  LOGIN MEMBER
                </Link>
              ) : (
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 font-medium flex items-center gap-2 rounded-md transition-colors"
                >
                  <LogOut size={16} /> Keluar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;