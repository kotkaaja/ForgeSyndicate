import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Crown, ArrowRight, AlertCircle, Loader2, ArrowLeft, Shield } from 'lucide-react';
import { validateVipToken } from '../services/data';

const Login: React.FC = () => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the page the user came from, or default to /mods
  const from = location.state?.from?.pathname || '/mods';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const isValid = await validateVipToken(token);
      
      if (isValid) {
        // Redirect back to where they came from
        navigate(from, { replace: true });
      } else {
        setError('Token tidak valid atau tidak ditemukan dalam database VIP.');
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi saat memvalidasi token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4 relative">
      <div className="absolute top-4 left-4">
        <Link to="/" className="text-zinc-500 hover:text-white flex items-center gap-2 transition-colors">
          <ArrowLeft size={20} /> Kembali ke Beranda
        </Link>
      </div>

      <div className="max-w-md w-full bg-[#1a1a1a] border border-zinc-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        
        {/* Background Accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-green-900"></div>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl"></div>

        <div className="text-center mb-8 relative z-10">
          <div className="bg-zinc-900 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-800 shadow-inner">
            <Crown size={32} className="text-yellow-500" />
          </div>
          <h2 className="text-3xl font-heading font-bold text-white mb-2">Member Access</h2>
          <p className="text-zinc-500 text-sm">Masukkan Token VIP Anda untuk membuka akses download konten premium.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div>
            <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
              Token Akses / VIP Key
            </label>
            <input 
              type="text" 
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 text-white text-center text-lg font-mono px-4 py-4 rounded-lg focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 transition-all placeholder:text-zinc-700"
              placeholder="Ex: XXXX-XXXX-VIP"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-900/50 p-3 rounded flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || !token}
            className="w-full bg-green-700 hover:bg-green-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white py-4 rounded-lg font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(21,128,61,0.4)]"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>Validasi Token <ArrowRight size={20} /></>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-800 flex flex-col gap-4">
          <p className="text-zinc-500 text-xs text-center">
            Belum punya token? <a href="#" className="text-green-500 hover:underline">Beli Membership VIP</a> di Discord kami.
          </p>
          
          <Link to="/admin" className="group w-full bg-zinc-900/50 hover:bg-red-900/10 border border-zinc-800 hover:border-red-900/50 text-zinc-500 hover:text-red-400 py-3 rounded-lg font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all">
            <Shield size={14} className="group-hover:text-red-500 transition-colors" /> 
            Login Administrator
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;