import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Shield, LogOut, Crown } from 'lucide-react';
import { getUserRole, logout } from '../services/data';
import { UserRole } from '../types';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<UserRole>('GUEST');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setRole(getUserRole());
  }, [location]);

  const navLinks = [
    { name: 'Beranda', path: '/' },
    { name: 'Gudang Mod', path: '/mods' },
    { name: 'Jasa Scripting', path: '/services' },
    { name: 'Komunitas', path: '/community' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-[#0f0f0f] border-b border-zinc-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0">
              <span className="font-heading text-2xl font-bold text-green-600 tracking-tighter">
                FORGE<span className="text-white">SYNDICATE</span>
              </span>
            </Link>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(link.path)
                        ? 'bg-green-900/10 text-green-500 border border-green-900/30'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            {role === 'ADMIN' && (
              <Link to="/admin" className="text-red-500 hover:text-red-400 flex items-center gap-1 font-bold text-xs uppercase tracking-wider border border-red-900/30 px-2 py-1 rounded bg-red-900/10">
                 <Shield size={14} /> Admin Mode
              </Link>
            )}

            {role === 'GUEST' ? (
              <Link to="/login" className="bg-green-700 hover:bg-green-600 text-white px-5 py-2 rounded-sm font-heading font-bold text-sm tracking-wide transition-all hover:shadow-[0_0_15px_rgba(21,128,61,0.5)]">
                LOGIN MEMBER
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-yellow-500 font-heading font-bold">
                  <Crown size={18} /> VIP ACCESS
                </span>
                <button 
                  onClick={handleLogout}
                  className="text-zinc-500 hover:text-white"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            )}
          </div>

          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 focus:outline-none"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-[#0f0f0f] border-b border-zinc-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive(link.path)
                    ? 'text-green-500 bg-green-900/10'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {link.name}
              </Link>
            ))}
            {role === 'ADMIN' && (
               <Link to="/admin" className="block px-3 py-2 text-red-500 font-bold">Panel Admin</Link>
            )}
            {role === 'GUEST' ? (
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="block mt-4 text-center bg-green-700 text-white px-3 py-3 rounded-md font-bold"
              >
                LOGIN MEMBER
              </Link>
            ) : (
              <button 
                onClick={() => { handleLogout(); setIsOpen(false); }}
                className="w-full text-left px-3 py-2 text-zinc-400 hover:text-white font-medium flex items-center gap-2"
              >
                <LogOut size={16} /> Keluar
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;