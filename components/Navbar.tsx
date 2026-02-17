import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, X, Shield, Crown, ChevronDown, LogOut, User, Upload,
  Wrench, Code2, Cpu, Zap, MessageSquare, Users, LayoutGrid,
  Package, Search   // ← tambah Search
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ProfileDrawer from './ProfileDrawer';

// ── Dropdown item type ─────────────────────────────────────────────────────
interface DropItem {
  label:    string;
  path:     string;
  icon:     React.ReactNode;
  desc:     string;
  isNew?:   boolean;
  color?:   string;
}

// ── Dropdown Menu ──────────────────────────────────────────────────────────
const DropdownMenu: React.FC<{
  label:    string;
  items:    DropItem[];
  isActive: boolean;
}> = ({ label, items, isActive }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => setOpen(true)}
        className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          isActive || open
            ? 'bg-green-900/10 text-green-400 border border-green-900/30'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
        }`}
      >
        {label}
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          onMouseLeave={() => setOpen(false)}
          className="absolute top-full left-0 mt-1.5 bg-[#111] border border-zinc-800 rounded-xl shadow-2xl shadow-black/60 overflow-hidden z-50 min-w-[220px] animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {items.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/60 transition-colors group"
            >
              <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${item.color || 'bg-zinc-800'}`}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                    {item.label}
                  </p>
                  {item.isNew && (
                    <span className="text-[9px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded-full uppercase">New</span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-600 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Navbar ────────────────────────────────────────────────────────────
const Navbar: React.FC = () => {
  const [isOpen,       setIsOpen]       = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isVIP } = useAuth();

  const isAdmin = user?.guildRoles?.some(r =>
    ['Admin', 'Administrator', 'Owner', 'Founder', 'Co-Founder'].includes(r)
  ) ?? false;

  // ─── LOGIC CHECK ROLE (Termasuk Inner Circle) ───
  const hasPanelAccess = user?.guildRoles?.some(r =>
    [
      'Modder', 'Verified Modder', 'Inner Circle', // <--- Role Inner Circle
      'Trusted Modder', 'Script Maker', 'Lua Modder',
      'Admin', 'Administrator', 'Owner', 'Founder', 'Co-Founder'
    ].includes(r)
  ) ?? false;

  const handleLogout = async () => {
    setProfileOpen(false); setIsOpen(false); setDrawerOpen(false);
    await logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;
  const isActivePrefix = (prefix: string) => location.pathname.startsWith(prefix);

  // Close profile on outside click
  const profileRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Dropdown configs ─────────────────────────────────────────────────
  const toolsItems: DropItem[] = [
    {
      label:  'Lua Shield',
      path:   '/tools/obfuscator',
      icon:   <Shield size={14} className="text-green-400" />,
      desc:   'Obfuscate & proteksi script Lua',
      color:  'bg-green-900/40',
      isNew:  true,
    },
    {
      label:  'LuaJIT Compiler',
      path:   '/tools/compiler',
      icon:   <Cpu size={14} className="text-blue-400" />,
      desc:   'Compile script ke bytecode 32/64-bit',
      color:  'bg-blue-900/40',
      isNew:  true,
    },
    {
      label:  'Webhook Spammer',
      path:   '/webhook-spam',
      icon:   <Zap size={14} className="text-yellow-400" />,
      desc:   'Anti-keylogger & flood webhook tool',
      color:  'bg-yellow-900/40',
    },
    {
      label:  'MoonScanner',
      path:   '/tools/moonscanner',
      icon:   <Search size={14} className="text-red-400" />,
      desc:   'Deteksi keylogger di script Lua secara runtime',
      color:  'bg-red-900/40',
      isNew:  true,
    },
    
  ];

  const komunitasItems: DropItem[] = [
    {
      label: 'Forum Komunitas',
      path:  '/community',
      icon:  <MessageSquare size={14} className="text-indigo-400" />,
      desc:  'Diskusi dan tanya jawab',
      color: 'bg-indigo-900/40',
    },
     {
      label:  'Jasa Scripting',
      path:   '/services',
      icon:   <Code2 size={14} className="text-purple-400" />,
      desc:   'Order script Lua custom',
      color:  'bg-purple-900/40',
    },
  ];

  const coreLinks = [
    { name: 'Beranda', path: '/' },
    { name: 'Gudang Mod', path: '/mods' },
  ];

  return (
    <>
      <nav className="bg-[#0f0f0f] border-b border-zinc-800/80 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">

            {/* LOGO */}
            <div className="flex items-center gap-6">
              <Link to="/" className="flex-shrink-0 group">
                <span className="font-heading text-xl font-black text-green-500 tracking-tighter group-hover:opacity-80 transition-opacity">
                  SA<span className="text-white">FORGE</span>
                </span>
              </Link>

              {/* DESKTOP NAV */}
              <div className="hidden md:flex items-center gap-1">
                {coreLinks.map(link => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                      isActive(link.path)
                        ? 'bg-green-900/10 text-green-400 border border-green-900/30'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}

                {/* Tools dropdown */}
                <DropdownMenu
                  label="Tools"
                  items={toolsItems}
                  isActive={isActivePrefix('/tools') || isActive('/services') || isActive('/webhook-spam')}
                  
                />

                {/* Komunitas dropdown */}
                <DropdownMenu
                  label="Komunitas"
                  items={komunitasItems}
                  isActive={isActive('/community') || isActive('/members')}
                />

                {/* ─── PANEL USER LINK (STANDALONE) ─── */}
                {hasPanelAccess && (
                  <Link
                    to="/panel"
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                      isActive('/panel')
                        ? 'bg-green-900/10 text-green-400 border border-green-900/30'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                    }`}
                  >
                    Panel User
                  </Link>
                )}
              </div>
            </div>

            {/* RIGHT */}
            <div className="hidden md:flex items-center gap-2">
              {!user ? (
                <Link
                  to="/login"
                  className="bg-green-700 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg font-bold text-sm tracking-wide transition-all hover:shadow-[0_0_15px_rgba(21,128,61,0.4)]"
                >
                  LOGIN MEMBER
                </Link>
              ) : (
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(v => !v)}
                    className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 px-2.5 py-1.5 rounded-xl transition-all"
                  >
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.username}
                        className="w-6 h-6 rounded-lg object-cover border border-zinc-700" />
                    ) : (
                      <div className="w-6 h-6 rounded-lg bg-zinc-700 flex items-center justify-center text-white text-[10px] font-black">
                        {user.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="text-left">
                      <p className="text-white text-xs font-bold leading-none">{user.username}</p>
                      <p className={`text-[9px] font-black uppercase leading-none mt-0.5 ${
                        isAdmin ? 'text-red-400' : isVIP ? 'text-yellow-400' : 'text-blue-400'
                      }`}>
                        {isAdmin ? 'ADMIN' : user.tier}
                      </p>
                    </div>
                    <ChevronDown size={12} className={`text-zinc-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Profile Dropdown */}
                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-[#141414] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* Header */}
                      <div className="px-4 py-3 border-b border-zinc-800/60 bg-zinc-900/40">
                        <div className="flex items-center gap-2.5">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-xl object-cover border border-zinc-700" />
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-zinc-700 flex items-center justify-center text-white font-black text-sm">
                              {user.username.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-white text-sm font-bold truncate">{user.username}</p>
                            <span className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider mt-0.5 ${
                              isAdmin ? 'bg-red-500/20 text-red-400 border-red-500/40'
                              : isVIP  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                              : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                            }`}>
                              {isAdmin ? <Shield size={7}/> : <Crown size={7}/>}
                              {isAdmin ? 'ADMIN' : user.tier}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Menu */}
                      <div className="py-1">
                        <button
                          onClick={() => { setProfileOpen(false); setDrawerOpen(true); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors text-xs"
                        >
                          <User size={12}/> Profil & Lisensi
                        </button>

                        {hasPanelAccess && (
                          <Link to="/panel" onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-green-400 hover:text-green-300 hover:bg-green-900/15 transition-colors text-xs font-semibold">
                            <Upload size={12}/> Panel User
                          </Link>
                        )}

                        <Link to="/webhook-spam" onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors text-xs">
                          <Wrench size={12}/> Anti-Keylogger
                        </Link>

                        {isAdmin && (
                          <Link to="/admin" onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/15 transition-colors text-xs font-bold">
                            <Shield size={12}/> Panel Admin
                          </Link>
                        )}
                      </div>

                      <div className="border-t border-zinc-800/60 py-1">
                        <button onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-zinc-600 hover:text-red-400 hover:bg-red-950/30 transition-colors text-xs">
                          <LogOut size={12}/> Keluar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MOBILE BUTTON */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              {isOpen ? <X size={20}/> : <Menu size={20}/>}
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {isOpen && (
          <div className="md:hidden bg-[#0f0f0f] border-b border-zinc-800 animate-in slide-in-from-top-2 duration-200">
            <div className="px-3 pt-2 pb-4 space-y-1">

              {/* User card */}
              {user && (
                <button
                  onClick={() => { setIsOpen(false); setDrawerOpen(true); }}
                  className="flex items-center gap-3 w-full px-3 py-3 mb-2 bg-zinc-900/50 rounded-xl border border-zinc-800/50 hover:bg-zinc-800/60 transition-colors"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-9 h-9 rounded-xl object-cover border border-zinc-700"/>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-zinc-700 flex items-center justify-center text-white font-black">
                      {user.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-white font-bold text-sm">{user.username}</p>
                    <span className={`text-[10px] font-black uppercase ${isAdmin ? 'text-red-400' : isVIP ? 'text-yellow-400' : 'text-blue-400'}`}>
                      {isAdmin ? 'ADMIN' : user.tier}
                    </span>
                  </div>
                  <User size={13} className="ml-auto text-zinc-600"/>
                </button>
              )}

              {/* Core links */}
              {coreLinks.map(link => (
                <Link key={link.name} to={link.path} onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.path)
                      ? 'text-green-400 bg-green-900/10 border border-green-900/20'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}>
                  {link.name}
                </Link>
              ))}

              {/* Panel User Link (Mobile) */}
              {hasPanelAccess && (
                 <Link to="/panel" onClick={() => setIsOpen(false)}
                   className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                     isActive('/panel')
                       ? 'text-green-400 bg-green-900/10 border border-green-900/20'
                       : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                   }`}>
                   Panel User
                 </Link>
              )}

              {/* Mobile: collapsible sections */}
              {[
                { key: 'tools', label: 'Tools', items: toolsItems },
                { key: 'komunitas', label: 'Komunitas', items: komunitasItems },
                // Section 'Modder' dihapus dari sini karena Panel User sudah jadi link biasa
              ].map(section => (
                <div key={section.key}>
                  <button
                    onClick={() => setMobileExpanded(mobileExpanded === section.key ? null : section.key)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    {section.label}
                    <ChevronDown size={13} className={`transition-transform ${mobileExpanded === section.key ? 'rotate-180' : ''}`}/>
                  </button>
                  {mobileExpanded === section.key && (
                    <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-zinc-800/60 pl-3">
                      {section.items.map(item => (
                        <Link key={item.path} to={item.path} onClick={() => setIsOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-zinc-800/60 transition-colors">
                          {item.icon} {item.label}
                          {item.isNew && <span className="text-[9px] bg-red-600 text-white px-1 rounded font-bold">NEW</span>}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Mobile: Admin & Auth */}
              <div className="border-t border-zinc-800/50 pt-2 mt-2 space-y-1">
                {isAdmin && (
                  <Link to="/admin" onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold text-red-400 hover:bg-red-900/10 transition-colors">
                    <Shield size={14}/> Panel Admin
                  </Link>
                )}
                {!user ? (
                  <Link to="/login" onClick={() => setIsOpen(false)}
                    className="block text-center bg-green-700 hover:bg-green-600 text-white px-3 py-3 rounded-xl font-bold text-sm transition-colors">
                    LOGIN MEMBER
                  </Link>
                ) : (
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors">
                    <LogOut size={14}/> Keluar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      <ProfileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
};

export default Navbar;