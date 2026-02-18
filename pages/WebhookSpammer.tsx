import React, { useState, useRef, useEffect } from 'react';
import { Shield, Send, AlertTriangle, Zap, Search, StopCircle, Terminal, Copy, Check, RefreshCw, Loader2, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const WebhookSpammer: React.FC = () => {
  const { user } = useAuth();
  
  // State Utama
  const [mode, setMode] = useState<'discord' | 'telegram'>('discord');
  const [target, setTarget] = useState(''); // Webhook URL atau Telegram Token
  const [chatId, setChatId] = useState(''); // Khusus Telegram
  
  // State Konfigurasi
  const [count, setCount] = useState(100);
  const [delay, setDelay] = useState(1000); // Ms
  
  // State Monitoring & Logs
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [stats, setStats] = useState({ sent: 0, fail: 0, total: 0 });
  
  // State Telegram Scanner
  const [isScanning, setIsScanning] = useState(false);
  const [foundChats, setFoundChats] = useState<any[]>([]);

  // Ref
  const stopRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll log ke bawah
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // --- HELPER: AUTO EXTRACT TOKEN ---
  // Ini mendeteksi apakah user input full link atau cuma token
  const getCleanTarget = (input: string, currentMode: 'discord' | 'telegram') => {
    const cleanInput = input.trim();
    
    if (currentMode === 'telegram') {
      // Regex untuk ambil token dari link api.telegram.org
      // Cocok dengan: https://api.telegram.org/bot123:ABC/sendMessage
      const match = cleanInput.match(/bot(\d+:[A-Za-z0-9_-]+)/);
      if (match) return match[1]; // Kembalikan tokennya saja (123:ABC...)
      return cleanInput; // Kalau tidak match, asumsikan itu sudah token
    }
    
    return cleanInput; // Discord biarkan full link
  };

  // --- LOGIC: SCAN TELEGRAM ---
  const handleScanChats = async () => {
    if (!target) return alert("⚠️ Masukkan Token/Link Bot Telegram terlebih dahulu!");
    
    setIsScanning(true);
    setFoundChats([]);
    
    // Bersihkan token dulu sebelum dikirim ke API
    const cleanToken = getCleanTarget(target, 'telegram');

    try {
      const res = await fetch('/api/webhook-spam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan_telegram', token: cleanToken })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      if (data.chats.length === 0) {
        alert("⚠️ Tidak ada chat ditemukan. Pastikan bot sudah di-start atau dimasukkan ke grup, lalu coba lagi.");
      } else {
        setFoundChats(data.chats);
      }
    } catch (err) {
      alert(`Gagal scan: ${(err as Error).message}`);
    } finally {
      setIsScanning(false);
    }
  };

  // --- LOGIC: EXECUTE SPAM (LOOP FRONTEND) ---
  const addLog = (msg: string, type: 'success' | 'error' | 'info') => {
    const time = new Date().toLocaleTimeString('id-ID', { hour12: false });
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    setLogs(prev => [...prev, `[${time}] ${prefix} ${msg}`].slice(-50));
  };

  const handleStart = async () => {
    if (!target) return alert('Target (URL/Token) harus diisi!');
    if (mode === 'telegram' && !chatId) return alert('Chat ID Telegram harus diisi! Gunakan tombol Scan.');
    
    // Bersihkan target (Extract token jika Telegram)
    const cleanTarget = getCleanTarget(target, mode);

    // Reset State
    stopRef.current = false;
    setIsRunning(true);
    setStats({ sent: 0, fail: 0, total: count });
    setLogs([]);
    
    let successCount = 0;
    let failCount = 0;

    addLog(`Memulai serangan ke ${mode}...`, 'info');
    if (mode === 'telegram' && target.includes('http')) {
       addLog(`Link dideteksi, token diekstrak: ${cleanTarget.substring(0, 10)}...`, 'info');
    }

    // LOOP UTAMA
    for (let i = 0; i < count; i++) {
      if (stopRef.current) {
        addLog('🛑 Serangan dihentikan user.', 'info');
        break;
      }

      try {
        const res = await fetch('/api/webhook-spam', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'execute',
            mode, 
            target: cleanTarget, // Kirim target yang sudah bersih
            chatId: mode === 'telegram' ? chatId : undefined 
          })
        });
        
        const data = await res.json();

        if (res.ok) {
          successCount++;
        } else {
          failCount++;
          
          if (res.status === 404) {
            addLog('🎉 TARGET HANGUS (404)! Webhook/Bot sudah dihapus owner.', 'success');
            stopRef.current = true;
          } else if (res.status === 401) {
             addLog('⛔ Token/Webhook Invalid.', 'error');
             stopRef.current = true;
          } else if (res.status === 403) {
             addLog('⛔ Bot di-kick dari grup.', 'error');
             stopRef.current = true;
          } else if (res.status === 429) {
             addLog('⚠️ Rate limit, menambah delay...', 'error');
             await new Promise(r => setTimeout(r, 2000));
          } else {
             addLog(`Gagal: ${data.error}`, 'error');
          }
        }

      } catch (err) {
        failCount++;
        addLog(`Error koneksi: ${(err as Error).message}`, 'error');
      }

      setStats({ sent: successCount, fail: failCount, total: count });

      if (!stopRef.current) {
        await new Promise(r => setTimeout(r, delay));
      }
    }

    setIsRunning(false);
    addLog(`✅ Selesai. Total Sukses: ${successCount}, Gagal: ${failCount}`, 'info');
  };

  const handleStop = () => {
    stopRef.current = true;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center space-y-4">
           <h2 className="text-white font-bold text-xl">Login Diperlukan</h2>
           <Link to="/login" className="text-blue-500 hover:underline">Masuk Sekarang</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 pb-20 font-sans">
      <div className="max-w-6xl mx-auto px-4 pt-24">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-blue-900/20 border border-blue-500/20 px-3 py-1 rounded-full mb-3">
             <Shield size={14} className="text-blue-400"/>
             <span className="text-blue-400 text-xs font-bold uppercase">Counter Keylogger Tool</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">WEBHOOK DESTROYER</h1>
          <p className="text-zinc-500 text-sm">Banjiri log pencuri akun dengan data sampah. Support Auto-Extract Link Telegram.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          
          {/* KOLOM KIRI: SETTING ATTACK */}
          <div className="space-y-6">
            <div className="bg-[#111] border border-zinc-800 p-6 rounded-2xl shadow-xl">
              <h2 className="text-sm font-bold text-zinc-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                <Zap size={16} className="text-yellow-500"/> Konfigurasi Target
              </h2>

              {/* Pilihan Mode */}
              <div className="grid grid-cols-2 gap-2 mb-5">
                <button 
                  onClick={() => !isRunning && setMode('discord')}
                  className={`p-3 rounded-lg border font-bold text-sm transition-all flex items-center justify-center gap-2 ${mode === 'discord' ? 'bg-[#5865F2]/20 border-[#5865F2] text-[#5865F2]' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                >
                  DISCORD
                </button>
                <button 
                  onClick={() => !isRunning && setMode('telegram')}
                  className={`p-3 rounded-lg border font-bold text-sm transition-all flex items-center justify-center gap-2 ${mode === 'telegram' ? 'bg-[#229ED9]/20 border-[#229ED9] text-[#229ED9]' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                >
                  TELEGRAM
                </button>
              </div>

              {/* Input URL/Token */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">
                    {mode === 'discord' ? 'Webhook URL' : 'Bot Token / Link API'}
                  </label>
                  <div className="relative">
                    <input 
                      value={target}
                      onChange={e => setTarget(e.target.value)}
                      disabled={isRunning}
                      placeholder={mode === 'discord' 
                        ? "https://discord.com/api/webhooks/..." 
                        : "Tempel Token (123:ABC) atau Full Link API..."
                      }
                      className="w-full bg-black border border-zinc-800 rounded-lg p-3 pl-10 text-sm text-white focus:border-blue-500 outline-none transition-colors font-mono"
                    />
                    <LinkIcon size={14} className="absolute left-3 top-3.5 text-zinc-600"/>
                  </div>
                  {mode === 'telegram' && (
                    <p className="text-[10px] text-zinc-600 mt-1">
                      *Support full link: <code>https://api.telegram.org/bot123...</code>
                    </p>
                  )}
                </div>

                {/* SCANNER TELEGRAM */}
                {mode === 'telegram' && (
                  <div className="bg-zinc-900/30 p-3 rounded-lg border border-zinc-800 border-dashed">
                     <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Chat ID Target</label>
                        <button 
                          onClick={handleScanChats}
                          disabled={isRunning || isScanning}
                          className="text-[10px] bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded text-white flex items-center gap-1 transition-colors font-bold"
                        >
                           {isScanning ? <Loader2 size={10} className="animate-spin"/> : <Search size={10}/>}
                           SCAN ID OTOMATIS
                        </button>
                     </div>
                     
                     {foundChats.length > 0 && (
                       <select 
                         onChange={e => setChatId(e.target.value)}
                         className="w-full bg-black border border-green-900/50 text-green-400 text-xs p-2 rounded mb-2 font-mono"
                         value={chatId}
                       >
                         <option value="">-- Pilih Chat Ditemukan ({foundChats.length}) --</option>
                         {foundChats.map(c => (
                           <option key={c.id} value={c.id}>
                             {c.title} ({c.type}) • ID: {c.id}
                           </option>
                         ))}
                       </select>
                     )}

                     <input 
                        value={chatId}
                        onChange={e => setChatId(e.target.value)}
                        placeholder="-100xxxxxxx"
                        disabled={isRunning}
                        className="w-full bg-black border border-zinc-800 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none font-mono"
                      />
                  </div>
                )}

                {/* Sliders Control */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase flex justify-between">
                        Jumlah Spam <span>{count}</span>
                    </label>
                    <input 
                      type="range" min="1" max="1000" step="10"
                      value={count} onChange={e => setCount(Number(e.target.value))}
                      className="w-full mt-2 accent-blue-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      disabled={isRunning}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase flex justify-between">
                        Delay (ms) <span>{delay}ms</span>
                    </label>
                    <input 
                      type="range" min="100" max="3000" step="100"
                      value={delay} onChange={e => setDelay(Number(e.target.value))}
                      className="w-full mt-2 accent-blue-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      disabled={isRunning}
                    />
                  </div>
                </div>
              </div>

              {/* Tombol Eksekusi */}
              <div className="mt-8 flex gap-3">
                {!isRunning ? (
                  <button 
                    onClick={handleStart}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:brightness-110 text-white font-black text-sm uppercase py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-all"
                  >
                    <Send size={18}/> MULAI SERANGAN
                  </button>
                ) : (
                  <button 
                    onClick={handleStop}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-sm uppercase py-4 rounded-xl flex items-center justify-center gap-2 animate-pulse shadow-lg transition-all"
                  >
                    <StopCircle size={18}/> STOP SERANGAN
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* KOLOM KANAN: MONITORING (Mirip Discord Embed) */}
          <div className="space-y-6">
            <div className="bg-[#0f0f0f] border border-zinc-800 p-6 rounded-2xl shadow-xl h-full flex flex-col">
              <h2 className="text-sm font-bold text-zinc-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                <Terminal size={16} className="text-green-500"/> Live Monitor
              </h2>
              
              {/* Statistik Angka */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800 text-center">
                  <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Target</div>
                  <div className="text-xl font-mono font-bold text-white mt-1">{stats.total}</div>
                </div>
                <div className="bg-green-900/10 p-3 rounded-lg border border-green-900/30 text-center">
                  <div className="text-[10px] text-green-500 uppercase font-bold tracking-wider">Terkirim</div>
                  <div className="text-xl font-mono font-bold text-green-400 mt-1">{stats.sent}</div>
                </div>
                <div className="bg-red-900/10 p-3 rounded-lg border border-red-900/30 text-center">
                  <div className="text-[10px] text-red-500 uppercase font-bold tracking-wider">Gagal</div>
                  <div className="text-xl font-mono font-bold text-red-400 mt-1">{stats.fail}</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full transition-all duration-300 ease-out"
                    style={{ width: `${stats.total ? Math.round(((stats.sent + stats.fail) / stats.total) * 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* Terminal Logs Window */}
              <div className="flex-1 bg-black border border-zinc-800 rounded-lg p-3 overflow-hidden flex flex-col min-h-[300px] relative">
                 <div className="absolute top-0 left-0 w-full h-6 bg-gradient-to-b from-black to-transparent pointer-events-none z-10"></div>
                 
                 <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-1.5 p-1 custom-scrollbar">
                   {logs.length === 0 && (
                     <div className="h-full flex flex-col items-center justify-center text-zinc-700 gap-3">
                       <Loader2 size={32} className="animate-spin opacity-10"/>
                       <p>System Ready... Waiting for command.</p>
                     </div>
                   )}
                   {logs.map((log, i) => (
                     <div key={i} className={`break-all leading-tight ${
                        log.includes('✅') ? 'text-green-400' : 
                        log.includes('❌') ? 'text-red-400' : 
                        log.includes('🛑') ? 'text-yellow-400' : 'text-zinc-500'
                     }`}>
                       {log}
                     </div>
                   ))}
                   <div ref={logsEndRef} />
                 </div>
              </div>
              
              <div className="mt-3 text-[10px] text-zinc-600 text-center">
                Status: {isRunning ? <span className="text-green-500 animate-pulse">● RUNNING</span> : <span className="text-zinc-500">● IDLE</span>} • Mode: {mode.toUpperCase()}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default WebhookSpammer;