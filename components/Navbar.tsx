import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Shield, LogOut, Crown, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Cek apakah user punya role admin berdasarkan guild_roles Discord
const isAdminRole = (guildRoles: string[]): boolean => {
  const adminKeywords = ['admin', 'administrator', 'owner', 'founder', 'co-founder', 'moderator', 'developer'];
  return guildRoles.some(r => adminKeywords.includes(r.toLowerCase()));
};

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout, isVIP } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = user ? isAdminRole(user.guildRoles) : false;

  const navLinks = [
    { name: 'Beranda', path: '/' },
    { name: 'Gudang Mod', path: '/mods' },
    { name: 'Jasa Scripting', path: '/services' },
    { name: 'Lua Shield', path: '/tools/obfuscator', isNew: true },
    { name: 'LuaJIT Compiler', path: '/tools/compiler', isNew: true },
    { name: 'Komunitas', path: '/community' },
  ];

  const handleLogout = async () => {
    await logout();
    setDropdownOpen(false);
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

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

            {/* DESKTOP MENU */}
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
            {/* Admin badge — tampil kalau punya role admin di Discord */}
            {isAdmin && (
              <Link
                to="/admin"
                className="text-red-500 hover:text-red-400 flex items-center gap-1 font-bold text-xs uppercase tracking-wider border border-red-900/30 px-2 py-1 rounded bg-red-900/10 transition-colors"
              >
                <Shield size={14} /> Admin
              </Link>
            )}

            {!user ? (
              /* Belum login */
              <Link
                to="/login"
                className="bg-green-700 hover:bg-green-600 text-white px-5 py-2 rounded-sm font-heading font-bold text-sm tracking-wide transition-all hover:shadow-[0_0_15px_rgba(21,128,61,0.5)]"
              >
                LOGIN MEMBER
              </Link>
            ) : (
              /* Sudah login — tampilkan avatar + nama + dropdown */
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(v => !v)}
                  className="flex items-center gap-2.5 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 hover:border-zinc-600 px-3 py-1.5 rounded-xl transition-all"
                >
                  {/* Avatar */}
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

                  {/* Nama + tier */}
                  <div className="text-left">
                    <p className="text-white text-xs font-bold leading-none">{user.username}</p>
                    <p className={`text-[10px] font-semibold leading-none mt-0.5 ${isVIP ? 'text-yellow-400' : 'text-blue-400'}`}>
                      {isVIP ? '👑 VIP' : '🛡️ BASIC'}
                    </p>
                  </div>

                  <ChevronDown
                    size={14}
                    className={`text-zinc-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#141414] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-zinc-800/60">
                      <p className="text-white text-xs font-bold truncate">{user.username}</p>
                      <p className="text-zinc-500 text-[10px] truncate">
                        {isVIP ? 'VIP Member' : 'Basic Member'}
                      </p>
                    </div>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-red-400 hover:bg-red-900/20 text-xs font-semibold transition-colors"
                      >
                        <Shield size={13} /> Panel Admin
                      </Link>
                    )}

                    <Link
                      to="/mods"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-zinc-300 hover:bg-zinc-800/60 text-xs font-semibold transition-colors"
                    >
                      <Crown size={13} className="text-yellow-500" /> Gudang Mod
                    </Link>

                    <div className="border-t border-zinc-800/60">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-zinc-400 hover:text-red-400 hover:bg-red-950/30 text-xs font-semibold transition-colors"
                      >
                        <LogOut size={13} /> Keluar
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
              {/* User info mobile */}
              {user && (
                <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-zinc-900/40 rounded-lg border border-zinc-800/40">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.username} className="w-9 h-9 rounded-lg object-cover border border-zinc-700" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-zinc-700 flex items-center justify-center text-white text-sm font-black">
                      {user.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-white text-sm font-bold">{user.username}</p>
                    <p className={`text-xs ${isVIP ? 'text-yellow-400' : 'text-blue-400'}`}>
                      {isVIP ? '👑 VIP' : '🛡️ BASIC'}
                    </p>
                  </div>
                </div>
              )}

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
                  onClick={() => { handleLogout(); setIsOpen(false); }}
                  className="w-full text-left px-3 py-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 font-medium flex items-center gap-2 rounded-md transition-colors mt-1"
                >
                  <LogOut size={16} /> Keluar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Close dropdown on outside click */}
      {dropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
      )}
    </nav>
  );
};

export default Navbar;